import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chauffiq } from '../api';
import { useAuth } from '../context/useAuth';
import { Alert } from '../components/Alert';
import { RatingForm } from '../components/RatingForm';
import { PaymentSection } from '../components/PaymentSection';

const GPS_INTERVAL_MS = 10_000;

function formatErrorMessage(err) {
  if (!err) return 'An unexpected error occurred. Please try again.';
  if (typeof err === 'string') return err;
  if (err.status === 401 || err.status === 403) {
    return 'Access denied: You are not authorized for this ride or your session expired.';
  }
  if (err.status === 404) {
    return 'Ride not found. Please verify the Ride ID and try again.';
  }
  if (err.status === 408 || err.status === 504) {
    return 'Request timed out. Please check your connection and try again.';
  }
  if (err.message && err.message.toLowerCase().includes('network')) {
    return 'Network connection error. Please check your internet connection.';
  }
  if (err.message && err.message.includes('Cannot transition')) {
    return 'This ride status has already been updated. Please refresh the page.';
  }
  return err.message || 'Operation failed. Please try again.';
}

const DRIVER_STEPS = [
  { key: 'REQUESTED', label: 'Requested', icon: '📝' },
  { key: 'ACCEPTED', label: 'Accepted', icon: '🚗' },
  { key: 'ARRIVING', label: 'Arriving', icon: '📍' },
  { key: 'STARTED', label: 'In Progress', icon: '🚀' },
  { key: 'COMPLETED', label: 'Completed', icon: '✅' },
];

export function DriverDashboard() {
  const { user } = useAuth();

  // Onboarding State
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [onboarding, setOnboarding] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(user?.role === 'DRIVER');

  // Duty / Availability State
  const [isOnline, setIsOnline] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Fleet Overview
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Active Ride State
  const [rideIdInput, setRideIdInput] = useState('');
  const [activeRide, setActiveRide] = useState(null);
  const [fetchingRide, setFetchingRide] = useState(false);
  const [statusActionLoading, setStatusActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // GPS Auto-broadcast State
  const [gpsState, setGpsState] = useState('idle'); // idle | active | denied | unavailable | error
  const [lastGpsCoords, setLastGpsCoords] = useState(null);
  const [manualLat, setManualLat] = useState('12.9716');
  const [manualLon, setManualLon] = useState('77.5946');
  const [updatingLocation, setUpdatingLocation] = useState(false);

  // Refs — accessed only in callbacks/effects, never during render
  const gpsIntervalRef = useRef(null);
  const activeRideRef = useRef(null);
  const gpsStateRef = useRef('idle');

  const [alert, setAlert] = useState(null);

  useEffect(() => { activeRideRef.current = activeRide; }, [activeRide]);
  useEffect(() => { gpsStateRef.current = gpsState; }, [gpsState]);

  // Stop GPS broadcast callback
  const stopGpsBroadcast = useCallback(() => {
    if (gpsIntervalRef.current) {
      clearInterval(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    setGpsState((prev) => (prev === 'active' ? 'idle' : prev));
    gpsStateRef.current = 'idle';
  }, []);

  // Unmount cleanup
  useEffect(() => {
    return () => {
      if (gpsIntervalRef.current) {
        clearInterval(gpsIntervalRef.current);
        gpsIntervalRef.current = null;
      }
    };
  }, []);

  // Stop GPS when ride completes or cancels
  useEffect(() => {
    const status = activeRide?.status;
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      stopGpsBroadcast();
    }
  }, [activeRide?.status, stopGpsBroadcast]);

  // Load active drivers fleet
  const fetchAvailableDrivers = useCallback(async () => {
    try {
      const res = await chauffiq.drivers.getAvailableDrivers();
      setAvailableDrivers(res.drivers || []);
    } catch {
      // non-blocking
    } finally {
      setLoadingDrivers(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    chauffiq.drivers.getAvailableDrivers()
      .then((res) => { if (active) setAvailableDrivers(res.drivers || []); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Broadcast single fix
  const broadcastOneGpsFix = useCallback(async (lat, lon) => {
    const ride = activeRideRef.current;
    if (!ride?.rideId) return;
    const status = ride.status;
    if (status === 'COMPLETED' || status === 'CANCELLED') return;
    try {
      await chauffiq.tracking.updateDriverLocation({
        rideId: ride.rideId,
        latitude: lat,
        longitude: lon,
      });
      setLastGpsCoords({ lat, lon, time: new Date() });
    } catch {
      // non-blocking individual fix failure
    }
  }, []);

  // Start GPS Auto-broadcast
  const startGpsBroadcast = useCallback(() => {
    if (gpsIntervalRef.current) return;

    if (!navigator.geolocation) {
      setGpsState('unavailable');
      gpsStateRef.current = 'unavailable';
      return;
    }

    setGpsState('active');
    gpsStateRef.current = 'active';

    const doFix = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          broadcastOneGpsFix(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsState('denied');
            gpsStateRef.current = 'denied';
            if (gpsIntervalRef.current) {
              clearInterval(gpsIntervalRef.current);
              gpsIntervalRef.current = null;
            }
          } else {
            setGpsState('error');
            gpsStateRef.current = 'error';
          }
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 5000 }
      );
    };

    doFix();
    gpsIntervalRef.current = setInterval(doFix, GPS_INTERVAL_MS);
  }, [broadcastOneGpsFix]);

  // Manual GPS update
  const handleManualLocationUpdate = async (e) => {
    e.preventDefault();
    if (updatingLocation) return;
    if (!activeRide?.rideId) {
      setAlert({ type: 'error', message: 'No active trip loaded for location broadcast.' });
      return;
    }
    const parsedLat = parseFloat(manualLat);
    const parsedLon = parseFloat(manualLon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      setAlert({ type: 'error', message: 'Latitude and Longitude must be valid numbers.' });
      return;
    }
    setUpdatingLocation(true);
    setAlert(null);
    try {
      await chauffiq.tracking.updateDriverLocation({
        rideId: activeRide.rideId,
        latitude: parsedLat,
        longitude: parsedLon,
      });
      setLastGpsCoords({ lat: parsedLat, lon: parsedLon, time: new Date() });
      setAlert({ type: 'success', message: `GPS coordinates broadcast successfully: (${parsedLat}, ${parsedLon})` });
    } catch (err) {
      setAlert({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Driver Onboarding
  const handleOnboardDriver = async (e) => {
    e.preventDefault();
    if (onboarding) return;
    setAlert(null);

    const cleanPhone = phone.trim();
    const cleanVehNo = vehicleNumber.trim().toUpperCase();
    const cleanModel = vehicleModel.trim();

    if (!cleanPhone || !cleanVehNo) {
      setAlert({ type: 'error', message: 'Mobile phone and vehicle registration number are required.' });
      return;
    }
    setOnboarding(true);
    try {
      await chauffiq.drivers.createDriver({
        name: user?.name || 'Chauffeur',
        phone: cleanPhone,
        vehicleNumber: cleanVehNo,
        vehicleModel: cleanModel,
        rating: 5,
      });
      setIsOnboarded(true);
      setAlert({ type: 'success', message: 'Driver profile registered successfully! You are now available.' });
      fetchAvailableDrivers();
    } catch (err) {
      setAlert({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setOnboarding(false);
    }
  };

  // Availability / Shift Toggle
  const handleToggleAvailability = async (newOnline, newAvail) => {
    if (statusUpdating) return;
    setStatusUpdating(true);
    setAlert(null);
    try {
      await chauffiq.drivers.updateDriverAvailability({ isOnline: newOnline, isAvailable: newAvail });
      setIsOnline(newOnline);
      setIsAvailable(newAvail);
      setAlert({
        type: 'success',
        message: `Duty updated: ${newOnline ? 'Online' : 'Offline'} · ${newAvail ? 'Accepting Rides' : 'Busy'}`,
      });
      fetchAvailableDrivers();
    } catch (err) {
      setAlert({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setStatusUpdating(false);
    }
  };

  // Load Ride
  const handleLoadRide = useCallback(async (rideIdToLoad) => {
    const id = (typeof rideIdToLoad === 'string' ? rideIdToLoad : rideIdInput).trim();
    if (!id) {
      setAlert({ type: 'error', message: 'Please enter a valid Ride ID.' });
      return;
    }
    setFetchingRide(true);
    setAlert(null);
    try {
      const res = await chauffiq.rides.getRide(id);
      setActiveRide(res.ride);
      setRideIdInput(res.ride.rideId);
    } catch (err) {
      setAlert({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setFetchingRide(false);
    }
  }, [rideIdInput]);

  // Advance Ride Status
  const handleAdvanceStatus = async (targetStatus) => {
    if (!activeRide?.rideId || statusActionLoading) return;
    setStatusActionLoading(true);
    setAlert(null);
    try {
      await chauffiq.rides.updateRideStatus({ rideId: activeRide.rideId, status: targetStatus });

      if (
        (targetStatus === 'ACCEPTED' || targetStatus === 'ARRIVING' || targetStatus === 'STARTED') &&
        gpsStateRef.current !== 'active'
      ) {
        startGpsBroadcast();
      }

      setAlert({ type: 'success', message: `Ride transitioned to ${targetStatus}` });
      await handleLoadRide(activeRide.rideId);
    } catch (err) {
      setAlert({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setStatusActionLoading(false);
    }
  };

  // Accept Ride from Input directly
  const handleAcceptFromInput = async () => {
    const id = rideIdInput.trim();
    if (!id || statusActionLoading) return;
    setStatusActionLoading(true);
    setAlert(null);
    try {
      await chauffiq.rides.updateRideStatus({ rideId: id, status: 'ACCEPTED' });
      setAlert({ type: 'success', message: 'Ride ACCEPTED! You are now the assigned driver.' });
      await handleLoadRide(id);
      startGpsBroadcast();
    } catch (err) {
      setAlert({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setStatusActionLoading(false);
    }
  };

  const handleCopyRideId = () => {
    if (activeRide?.rideId) {
      navigator.clipboard.writeText(activeRide.rideId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const isRideActive = activeRide &&
    activeRide.status !== 'COMPLETED' &&
    activeRide.status !== 'CANCELLED';

  const gpsWarning = gpsState === 'denied' || gpsState === 'unavailable' || gpsState === 'error';
  const currentStepIdx = activeRide ? DRIVER_STEPS.findIndex((s) => s.key === activeRide.status) : -1;

  return (
    <div className="dashboard-layout" role="main" aria-label="Driver Dashboard">
      <div className="dashboard-header">
        <h1>Driver Operations Hub</h1>
        <p>Manage shift duty, accept trip dispatches, advance trip status, and stream real-time GPS coordinates.</p>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      {/* GPS Broadcast Status Banner */}
      {(gpsState === 'active' || gpsWarning) && (
        <div
          className={`gps-broadcast-badge ${gpsState === 'active' ? 'gps-active' : 'gps-warn'}`}
          role="status"
          aria-live="polite"
        >
          {gpsState === 'active' && <span>📡 GPS Live Broadcasting Active</span>}
          {gpsState === 'denied' && <span>🚫 Location permission blocked. Please allow browser location access.</span>}
          {gpsState === 'unavailable' && <span>⚠️ Geolocation service unavailable on this device.</span>}
          {gpsState === 'error' && <span>⚠️ GPS satellite fix failed. Retrying...</span>}
          {gpsState === 'active' && lastGpsCoords && (
            <span className="gps-coords">
              {' '}· {lastGpsCoords.lat.toFixed(5)}, {lastGpsCoords.lon.toFixed(5)}
              <span className="gps-time"> · Last Fix: {lastGpsCoords.time.toLocaleTimeString()}</span>
            </span>
          )}
          {gpsState === 'active' && (
            <button
              type="button"
              className="gps-stop-btn"
              onClick={stopGpsBroadcast}
              aria-label="Stop GPS broadcasting"
            >
              Stop Broadcasting
            </button>
          )}
        </div>
      )}

      {/* Onboarding Form */}
      {!isOnboarded ? (
        <div className="card highlight-card" role="region" aria-label="Driver Profile Registration">
          <div className="card-header">
            <h3>🪪 Complete Driver Onboarding</h3>
          </div>
          <form onSubmit={handleOnboardDriver} className="card-body">
            <p className="card-hint">Register your professional credentials and vehicle to begin accepting passenger bookings.</p>
            <div className="form-group">
              <label htmlFor="d-phone">Mobile Phone *</label>
              <input
                id="d-phone"
                type="tel"
                className="form-input"
                placeholder="+919876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={onboarding}
                required
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label htmlFor="d-veh-no">Vehicle Registration Number *</label>
              <input
                id="d-veh-no"
                type="text"
                className="form-input"
                placeholder="e.g. KA01AB1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                disabled={onboarding}
                required
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label htmlFor="d-veh-model">Vehicle Model / Make</label>
              <input
                id="d-veh-model"
                type="text"
                className="form-input"
                placeholder="e.g. Toyota Innova Crysta"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                disabled={onboarding}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={onboarding}
              aria-busy={onboarding}
            >
              {onboarding ? 'Registering Chauffeur Profile...' : 'Register Driver Profile'}
            </button>
          </form>
        </div>
      ) : (
        <div className="dashboard-grid">
          {/* Shift & Duty Status */}
          <div className="card">
            <div className="card-header">
              <h3>⚡ Shift &amp; Availability</h3>
            </div>
            <div className="card-body">
              <div className="status-row">
                <span>Duty Status:</span>
                <span className={`status-pill ${isOnline ? 'status-active' : 'status-offline'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="status-row">
                <span>Accepting Rides:</span>
                <span className={`status-pill ${isAvailable ? 'status-active' : 'status-busy'}`}>
                  {isAvailable ? 'AVAILABLE' : 'BUSY'}
                </span>
              </div>
              <div className="btn-group-row mt-2">
                <button
                  type="button"
                  className={`btn btn-sm ${isOnline ? 'btn-outline' : 'btn-primary'}`}
                  onClick={() => handleToggleAvailability(!isOnline, isAvailable)}
                  disabled={statusUpdating}
                  aria-busy={statusUpdating}
                >
                  {statusUpdating ? 'Updating...' : isOnline ? 'Go Offline' : 'Go Online'}
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${isAvailable ? 'btn-outline' : 'btn-success'}`}
                  onClick={() => handleToggleAvailability(isOnline, !isAvailable)}
                  disabled={statusUpdating}
                  aria-busy={statusUpdating}
                >
                  {statusUpdating ? 'Updating...' : isAvailable ? 'Set Busy' : 'Set Available'}
                </button>
              </div>
            </div>
          </div>

          {/* Accept / Load Trip */}
          <div className="card">
            <div className="card-header">
              <h3>🎯 Accept / Manage Trip</h3>
            </div>
            <div className="card-body">
              <p className="card-hint">Enter Ride ID to load or accept trip assignment</p>
              <div className="input-group">
                <input
                  id="d-ride-input"
                  type="text"
                  className="form-input"
                  placeholder="Enter Ride ID"
                  value={rideIdInput}
                  onChange={(e) => setRideIdInput(e.target.value)}
                  disabled={fetchingRide || statusActionLoading}
                  aria-label="Enter Ride ID"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleLoadRide(rideIdInput)}
                  disabled={fetchingRide || statusActionLoading || !rideIdInput.trim()}
                  aria-busy={fetchingRide}
                >
                  {fetchingRide ? 'Loading...' : 'Load'}
                </button>
              </div>

              {/* Accept directly if input present but ride not yet loaded */}
              {rideIdInput && !activeRide && (
                <button
                  type="button"
                  className="btn btn-success btn-block mt-2"
                  onClick={handleAcceptFromInput}
                  disabled={statusActionLoading}
                  aria-busy={statusActionLoading}
                >
                  {statusActionLoading ? 'Accepting Trip...' : `Accept Ride (${rideIdInput.slice(0, 8)}...)`}
                </button>
              )}

              {/* Accept if active ride is currently in REQUESTED state */}
              {activeRide && activeRide.status === 'REQUESTED' && (
                <button
                  type="button"
                  className="btn btn-success btn-block mt-2"
                  onClick={() => handleAdvanceStatus('ACCEPTED')}
                  disabled={statusActionLoading}
                  aria-busy={statusActionLoading}
                >
                  {statusActionLoading ? 'Accepting Trip...' : 'Accept This Ride'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no active ride */}
      {!activeRide && !fetchingRide && (
        <div className="card empty-state-card" role="region" aria-label="No Active Ride Assigned">
          <div className="empty-state-icon" aria-hidden="true">🎯</div>
          <h3>No Active Trip Loaded</h3>
          <p>You are online and ready. Enter a Ride ID above to accept a dispatch or review trip details.</p>
        </div>
      )}

      {/* Active Trip Controls */}
      {activeRide && (
        <div className="card active-ride-card" role="region" aria-label="Active Trip Operations">
          <div className="card-header space-between">
            <div className="header-title-group">
              <span className="card-subtitle">Assigned Trip</span>
              <div className="ride-id-row">
                <span className="mono-text ride-id-text">{activeRide.rideId}</span>
                <button
                  type="button"
                  className="btn-copy-sm"
                  onClick={handleCopyRideId}
                  title="Copy Ride ID"
                  aria-label="Copy Ride ID"
                >
                  {copiedId ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
            </div>
            <div className="header-badge-group">
              <span className={`status-pill status-${activeRide.status.toLowerCase()}`}>
                {activeRide.status}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => handleLoadRide(activeRide.rideId)}
                disabled={fetchingRide}
                aria-label="Refresh Trip"
              >
                {fetchingRide ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* Trip Details Grid */}
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Pickup Location</span>
                <span className="detail-val">📍 {activeRide.pickup}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Destination</span>
                <span className="detail-val">🏁 {activeRide.destination}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Passenger ID</span>
                <span className="detail-val mono-text">{activeRide.passengerId}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Assigned Chauffeur</span>
                <span className="detail-val mono-text">
                  {activeRide.driverId || 'You (assigning...)'}
                </span>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="lifecycle-stepper" role="progressbar" aria-valuenow={currentStepIdx + 1} aria-valuemin={1} aria-valuemax={5}>
              {DRIVER_STEPS.map((step, idx) => {
                const isDone = idx < currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div
                    key={step.key}
                    className={`stepper-step ${isDone ? 'step-done' : ''} ${isCurrent ? 'step-current' : ''}`}
                  >
                    <div className="step-circle" aria-hidden="true">
                      {isDone ? '✓' : step.icon}
                    </div>
                    <div className="step-text">
                      <span className="step-label">{step.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* State Machine Transition Action Buttons */}
            <div className="state-machine-section">
              <h4>Advance Trip Workflow</h4>
              <p className="card-hint">Execute the next authoritative step in the passenger ride lifecycle:</p>
              <div className="btn-group-row">
                {activeRide.status === 'ACCEPTED' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleAdvanceStatus('ARRIVING')}
                    disabled={statusActionLoading}
                    aria-busy={statusActionLoading}
                  >
                    {statusActionLoading ? 'Updating Status...' : 'Mark Arriving at Pickup 📍'}
                  </button>
                )}
                {activeRide.status === 'ARRIVING' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleAdvanceStatus('STARTED')}
                    disabled={statusActionLoading}
                    aria-busy={statusActionLoading}
                  >
                    {statusActionLoading ? 'Starting Trip...' : 'Start Trip 🚀'}
                  </button>
                )}
                {activeRide.status === 'STARTED' && (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => handleAdvanceStatus('COMPLETED')}
                    disabled={statusActionLoading}
                    aria-busy={statusActionLoading}
                  >
                    {statusActionLoading ? 'Completing Trip...' : 'Complete Trip ✅'}
                  </button>
                )}
                {activeRide.status === 'COMPLETED' && (
                  <div className="terminal-completed-note">
                    ✅ Trip completed successfully. Live GPS broadcast has been stopped.
                  </div>
                )}
                {activeRide.status === 'CANCELLED' && (
                  <div className="terminal-cancelled-note">
                    ❌ Trip was cancelled. Live GPS broadcast has been stopped.
                  </div>
                )}
              </div>
            </div>

            {/* Post-Trip Payment & Rating */}
            {activeRide.status === 'COMPLETED' && (
              <>
                <PaymentSection rideId={activeRide.rideId} readOnly={true} />
                <div className="mt-4">
                  <RatingForm
                    rideId={activeRide.rideId}
                    targetRole="Passenger"
                    targetName="Your Passenger"
                    currentUserUid={activeRide.driverId || user?.uid}
                  />
                </div>
              </>
            )}

            {/* GPS Telematics Section */}
            {isRideActive && (
              <div className="tracking-section" role="region" aria-label="GPS Broadcast Telematics">
                <div className="tracking-header">
                  <div className="tracking-title-row">
                    <span className="tracking-icon" aria-hidden="true">📡</span>
                    <h4>Real-time GPS Broadcast</h4>
                  </div>
                </div>

                <div className="gps-auto-section">
                  <p className="card-hint">
                    Stream your precise vehicle coordinates every 10 seconds to the passenger and authorized family members.
                  </p>
                  {gpsState !== 'active' ? (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={startGpsBroadcast}
                      aria-label="Start Auto GPS Broadcast"
                    >
                      🌐 Start Auto GPS Broadcast (10s)
                    </button>
                  ) : (
                    <div className="gps-status-row">
                      <span className="gps-live-dot" aria-hidden="true" />
                      <span className="gps-live-text">
                        Broadcasting active
                        {lastGpsCoords && (
                          <>
                            {' · '}<strong>{lastGpsCoords.lat.toFixed(5)}</strong>,{' '}
                            <strong>{lastGpsCoords.lon.toFixed(5)}</strong>
                            <span className="gps-time"> · Last: {lastGpsCoords.time.toLocaleTimeString()}</span>
                          </>
                        )}
                      </span>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={stopGpsBroadcast}
                        aria-label="Stop GPS Broadcast"
                      >
                        Stop
                      </button>
                    </div>
                  )}

                  {(gpsState === 'denied' || gpsState === 'unavailable') && (
                    <p className="error-hint mt-1" role="alert">
                      {gpsState === 'denied'
                        ? 'Browser location permission was denied. Please allow location access in your browser or use manual coordinates below.'
                        : 'Geolocation is unavailable on this device. Use manual coordinates below.'}
                    </p>
                  )}
                </div>

                {/* Manual GPS Fallback Form */}
                <details className="manual-gps-details">
                  <summary className="manual-gps-summary">
                    Manual GPS Entry (Testing / Fallback Coordinates)
                  </summary>
                  <form onSubmit={handleManualLocationUpdate} className="coords-form mt-2">
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="driver-lat">Latitude</label>
                        <input
                          id="driver-lat"
                          type="number"
                          step="0.00001"
                          className="form-input"
                          value={manualLat}
                          onChange={(e) => setManualLat(e.target.value)}
                          disabled={updatingLocation}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="driver-lon">Longitude</label>
                        <input
                          id="driver-lon"
                          type="number"
                          step="0.00001"
                          className="form-input"
                          value={manualLon}
                          onChange={(e) => setManualLon(e.target.value)}
                          disabled={updatingLocation}
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-secondary btn-sm"
                      disabled={updatingLocation}
                      aria-busy={updatingLocation}
                    >
                      {updatingLocation ? 'Broadcasting Coordinates...' : 'Broadcast Manually'}
                    </button>
                  </form>
                </details>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fleet Overview Table */}
      <div className="card mt-4" role="region" aria-label="Available Fleet">
        <div className="card-header space-between">
          <h3>👥 Active Driver Fleet ({availableDrivers.length})</h3>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={fetchAvailableDrivers}
            disabled={loadingDrivers}
            aria-busy={loadingDrivers}
          >
            {loadingDrivers ? 'Refreshing Fleet...' : 'Refresh Fleet'}
          </button>
        </div>
        <div className="card-body">
          {availableDrivers.length === 0 ? (
            <p className="no-data">No drivers currently online and available.</p>
          ) : (
            <div className="table-responsive">
              <table className="data-table" aria-label="Active Drivers Fleet List">
                <thead>
                  <tr>
                    <th scope="col">Driver Name</th>
                    <th scope="col">Vehicle</th>
                    <th scope="col">Rating</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {availableDrivers.map((d) => (
                    <tr key={d.uid}>
                      <td className="font-semibold">{d.name}</td>
                      <td>{d.vehicleNumber} {d.vehicleModel ? `(${d.vehicleModel})` : ''}</td>
                      <td>⭐ {d.rating}</td>
                      <td>
                        <span className="status-pill status-active">Online &amp; Ready</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
