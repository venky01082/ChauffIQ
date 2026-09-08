import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chauffiq } from '../api';
import { Alert } from '../components/Alert';
import { RatingForm } from '../components/RatingForm';
import { PaymentSection } from '../components/PaymentSection';

const LOCATION_POLL_MS = 8_000;
const STATUS_POLL_MS = 12_000;

function googleMapsUrl(lat, lon) {
  return `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
}

function isTerminal(status) {
  return status === 'COMPLETED' || status === 'CANCELLED';
}

function formatErrorMessage(err) {
  if (!err) return 'An unexpected error occurred. Please try again.';
  if (typeof err === 'string') return err;
  if (err.status === 401 || err.status === 403) {
    return 'Access denied: You are not authorized to view or modify this ride.';
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

const LIFECYCLE_STEPS = [
  { key: 'REQUESTED', label: 'Requested', icon: '📝', desc: 'Searching for driver' },
  { key: 'ACCEPTED', label: 'Accepted', icon: '🚗', desc: 'Driver assigned' },
  { key: 'ARRIVING', label: 'Arriving', icon: '📍', desc: 'Driver approaching pickup' },
  { key: 'STARTED', label: 'In Transit', icon: '🚀', desc: 'Trip underway' },
  { key: 'COMPLETED', label: 'Completed', icon: '✅', desc: 'Trip completed safely' },
];

export function PassengerDashboard() {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [creating, setCreating] = useState(false);

  const [currentRide, setCurrentRide] = useState(null);
  const [activeRideId, setActiveRideId] = useState('');
  const [lookupRideId, setLookupRideId] = useState('');
  const [fetchingRide, setFetchingRide] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const [driverLocation, setDriverLocation] = useState(null);
  const [locationState, setLocationState] = useState('idle'); // idle | loading | ok | nodata | error
  const [lastLocationFetchTime, setLastLocationFetchTime] = useState(null);

  const [isPolling, setIsPolling] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const [familyMemberUid, setFamilyMemberUid] = useState('');
  const [familySuccessMsg, setFamilySuccessMsg] = useState('');
  const [authorizingFamily, setAuthorizingFamily] = useState(false);
  const [alert, setAlert] = useState(null);

  const locationPollRef = useRef(null);
  const statusPollRef = useRef(null);
  const currentRideRef = useRef(null);
  const rideIdForPollingRef = useRef(null);

  useEffect(() => {
    currentRideRef.current = currentRide;
  }, [currentRide]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationPollRef.current) {
        clearInterval(locationPollRef.current);
        locationPollRef.current = null;
      }
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
        statusPollRef.current = null;
      }
    };
  }, []);

  const stopAllPolling = useCallback(() => {
    if (locationPollRef.current) {
      clearInterval(locationPollRef.current);
      locationPollRef.current = null;
    }
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current);
      statusPollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (currentRide && isTerminal(currentRide.status)) {
      stopAllPolling();
    }
  }, [currentRide?.status, stopAllPolling]);

  const fetchLocationSilent = useCallback(async (rideId) => {
    if (!rideId) return;
    const ride = currentRideRef.current;
    if (ride && isTerminal(ride.status)) {
      stopAllPolling();
      return;
    }
    try {
      const res = await chauffiq.tracking.getDriverLocation(rideId);
      setDriverLocation(res.location);
      setLocationState('ok');
      setLastLocationFetchTime(new Date());
    } catch {
      setLocationState('nodata');
    }
  }, [stopAllPolling]);

  const fetchRideStatusSilent = useCallback(async (rideId) => {
    if (!rideId) return;
    const ride = currentRideRef.current;
    if (ride && isTerminal(ride.status)) {
      stopAllPolling();
      return;
    }
    try {
      const res = await chauffiq.rides.getRide(rideId);
      setCurrentRide(res.ride);
    } catch {
      // non-blocking
    }
  }, [stopAllPolling]);

  const startPolling = useCallback((rideId, hasDriver) => {
    if (locationPollRef.current && statusPollRef.current) return;
    rideIdForPollingRef.current = rideId;

    if (!locationPollRef.current && hasDriver) {
      fetchLocationSilent(rideId);
      locationPollRef.current = setInterval(
        () => fetchLocationSilent(rideIdForPollingRef.current),
        LOCATION_POLL_MS
      );
    }
    if (!statusPollRef.current) {
      statusPollRef.current = setInterval(
        () => fetchRideStatusSilent(rideIdForPollingRef.current),
        STATUS_POLL_MS
      );
    }
    setIsPolling(true);
  }, [fetchLocationSilent, fetchRideStatusSilent]);

  // Restart location polling if driver assigned mid-ride
  useEffect(() => {
    const rideId = currentRide?.rideId;
    const driverId = currentRide?.driverId;
    const status = currentRide?.status;
    if (rideId && driverId && status && !isTerminal(status) && !locationPollRef.current) {
      fetchLocationSilent(rideId);
      rideIdForPollingRef.current = rideId;
      locationPollRef.current = setInterval(
        () => fetchLocationSilent(rideIdForPollingRef.current),
        LOCATION_POLL_MS
      );
      setIsPolling(true);
    }
  }, [currentRide?.driverId, currentRide?.rideId, currentRide?.status, fetchLocationSilent]);

  // Create Ride with double-submission protection
  const handleCreateRide = async (e) => {
    e.preventDefault();
    if (creating) return;
    setAlert(null);

    const cleanPickup = pickup.trim();
    const cleanDest = destination.trim();

    if (!cleanPickup || !cleanDest) {
      setAlert({ type: 'error', message: 'Pickup and destination are required.' });
      return;
    }

    setCreating(true);
    try {
      const res = await chauffiq.rides.createRide({ pickup: cleanPickup, destination: cleanDest });
      setAlert({ type: 'success', message: `Ride requested! Searching for available drivers...` });
      setActiveRideId(res.rideId);
      setPickup('');
      setDestination('');
      await fetchRideDetails(res.rideId);
    } catch (err) {
      setAlert({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setCreating(false);
    }
  };

  // Fetch Ride Details
  const fetchRideDetails = useCallback(async (rideIdToFetch) => {
    const id = (rideIdToFetch || activeRideId || lookupRideId).trim();
    if (!id) {
      setAlert({ type: 'error', message: 'Please enter a valid Ride ID.' });
      return;
    }
    setFetchingRide(true);
    setAlert(null);
    setShowCancelConfirm(false);
    try {
      const res = await chauffiq.rides.getRide(id);
      const ride = res.ride;
      setCurrentRide(ride);
      setActiveRideId(ride.rideId);

      if (!isTerminal(ride.status)) {
        startPolling(ride.rideId, !!ride.driverId);
        if (ride.driverId) {
          setLocationState('loading');
          fetchLocationSilent(ride.rideId);
        }
      } else {
        stopAllPolling();
      }
    } catch (err) {
      setAlert({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setFetchingRide(false);
    }
  }, [activeRideId, lookupRideId, startPolling, fetchLocationSilent, stopAllPolling]);

  // Cancel Ride with double-submission protection
  const handleCancelRide = async () => {
    if (!currentRide?.rideId || cancelling) return;
    setCancelling(true);
    setAlert(null);
    try {
      await chauffiq.rides.updateRideStatus({ rideId: currentRide.rideId, status: 'CANCELLED' });
      setAlert({ type: 'success', message: 'Your ride was cancelled successfully.' });
      setShowCancelConfirm(false);
      await fetchRideDetails(currentRide.rideId);
    } catch (err) {
      setAlert({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setCancelling(false);
    }
  };

  // Authorize Family Member
  const handleAddFamilyMember = async (e) => {
    e.preventDefault();
    if (!currentRide?.rideId || !familyMemberUid.trim() || authorizingFamily) return;
    setAlert(null);
    setFamilySuccessMsg('');
    setAuthorizingFamily(true);
    try {
      const res = await chauffiq.family.createFamilyMonitoring({
        rideId: currentRide.rideId,
        familyMemberId: familyMemberUid.trim(),
      });
      setFamilySuccessMsg(`Family monitoring authorized! (ID: ${res.monitoringId})`);
      setFamilyMemberUid('');
    } catch (err) {
      setAlert({ type: 'error', message: formatErrorMessage(err) });
    } finally {
      setAuthorizingFamily(false);
    }
  };

  const handleCopyRideId = () => {
    if (currentRide?.rideId) {
      navigator.clipboard.writeText(currentRide.rideId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Stepper calculations
  const currentStepIdx = currentRide
    ? LIFECYCLE_STEPS.findIndex((s) => s.key === currentRide.status)
    : -1;

  return (
    <div className="dashboard-layout" role="main" aria-label="Passenger Dashboard">
      <div className="dashboard-header">
        <h1>Passenger Hub</h1>
        <p>Book rides, track your driver live, and share trip status with family.</p>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      {/* Live Polling Status Indicator */}
      {isPolling && currentRide && !isTerminal(currentRide.status) && (
        <div className="polling-badge" role="status" aria-live="polite">
          <span className="poll-dot" aria-hidden="true" />
          <span>
            Live tracking active · Driver location auto-refreshes every 8s · Status every 12s
          </span>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Card 1: Request a Ride */}
        <div className="card">
          <div className="card-header">
            <h3>📍 Request a Ride</h3>
          </div>
          <form onSubmit={handleCreateRide} className="card-body">
            <div className="form-group">
              <label htmlFor="p-pickup">Pickup Location *</label>
              <input
                id="p-pickup"
                type="text"
                className="form-input"
                placeholder="e.g. 100 Feet Rd, Indiranagar"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                disabled={creating}
                required
                aria-required="true"
              />
            </div>
            <div className="form-group">
              <label htmlFor="p-dest">Destination *</label>
              <input
                id="p-dest"
                type="text"
                className="form-input"
                placeholder="e.g. Kempegowda International Airport"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                disabled={creating}
                required
                aria-required="true"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={creating}
              aria-busy={creating}
            >
              {creating ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  <span>Requesting Ride...</span>
                </>
              ) : (
                'Request Ride'
              )}
            </button>
          </form>
        </div>

        {/* Card 2: Lookup Existing Ride */}
        <div className="card">
          <div className="card-header">
            <h3>🔍 Lookup Ride</h3>
          </div>
          <div className="card-body">
            <p className="card-hint">Check status or resume live tracking of an existing ride</p>
            <div className="input-group">
              <input
                id="p-lookup"
                type="text"
                className="form-input"
                placeholder="Enter Ride ID"
                value={lookupRideId}
                onChange={(e) => setLookupRideId(e.target.value)}
                disabled={fetchingRide}
                aria-label="Enter Ride ID to look up"
              />
              <button
                type="button"
                className="btn btn-secondary"
                disabled={fetchingRide || !lookupRideId.trim()}
                onClick={() => fetchRideDetails(lookupRideId)}
                aria-busy={fetchingRide}
              >
                {fetchingRide ? 'Finding...' : 'Find'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State when no ride loaded */}
      {!currentRide && !fetchingRide && (
        <div className="card empty-state-card" role="region" aria-label="No Active Ride">
          <div className="empty-state-icon" aria-hidden="true">🚗</div>
          <h3>No Active Ride Selected</h3>
          <p>Book a ride above or enter an existing Ride ID to monitor your trip in real time.</p>
        </div>
      )}

      {/* Loading State during lookup */}
      {fetchingRide && !currentRide && (
        <div className="card empty-state-card" role="status" aria-live="polite">
          <div className="btn-spinner large-spinner" aria-hidden="true" />
          <h3>Retrieving Ride Details...</h3>
          <p>Please wait while we connect to ChauffIQ trip services.</p>
        </div>
      )}

      {/* Active Ride Card */}
      {currentRide && (
        <div className="card active-ride-card" role="region" aria-label="Trip Details">
          <div className="card-header space-between">
            <div className="header-title-group">
              <span className="card-subtitle">Active Trip</span>
              <div className="ride-id-row">
                <span className="mono-text ride-id-text">{currentRide.rideId}</span>
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
              <span className={`status-pill status-${currentRide.status.toLowerCase()}`}>
                {currentRide.status === 'REQUESTED' && '⏳ '}
                {currentRide.status === 'ACCEPTED' && '🚗 '}
                {currentRide.status === 'ARRIVING' && '📍 '}
                {currentRide.status === 'STARTED' && '🚀 '}
                {currentRide.status === 'COMPLETED' && '✅ '}
                {currentRide.status === 'CANCELLED' && '❌ '}
                {currentRide.status}
              </span>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fetchRideDetails(currentRide.rideId)}
                disabled={fetchingRide}
                aria-label="Refresh Trip Details"
              >
                {fetchingRide ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* Visual Ride Lifecycle Stepper */}
            {currentRide.status !== 'CANCELLED' && (
              <div className="lifecycle-stepper" role="progressbar" aria-valuenow={currentStepIdx + 1} aria-valuemin={1} aria-valuemax={5}>
                {LIFECYCLE_STEPS.map((step, idx) => {
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
                        <span className="step-desc">{step.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Ride Details Grid */}
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">Pickup Location</span>
                <span className="detail-val">📍 {currentRide.pickup}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Destination</span>
                <span className="detail-val">🏁 {currentRide.destination}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Requested At</span>
                <span className="detail-val">
                  🕒 {currentRide.createdAt ? new Date(currentRide.createdAt).toLocaleTimeString() : 'Just now'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Trip Status</span>
                <span className="detail-val font-semibold">
                  {currentRide.status === 'REQUESTED' && 'Searching for nearby drivers...'}
                  {currentRide.status === 'ACCEPTED' && 'Driver is en route to pickup location'}
                  {currentRide.status === 'ARRIVING' && 'Driver has arrived at pickup'}
                  {currentRide.status === 'STARTED' && 'Trip in progress towards destination'}
                  {currentRide.status === 'COMPLETED' && 'Arrived safely at destination'}
                  {currentRide.status === 'CANCELLED' && 'Ride was cancelled'}
                </span>
              </div>
            </div>

            {/* Driver Profile Section */}
            <div className="driver-profile-card">
              <div className="driver-card-header">
                <div className="driver-avatar" aria-hidden="true">👨‍✈️</div>
                <div className="driver-meta">
                  <h4>{currentRide.driverName || (currentRide.driverId ? 'Assigned Driver' : 'Searching for Driver...')}</h4>
                  {currentRide.driverId ? (
                    <div className="driver-vehicle-details">
                      {currentRide.vehicleNumber && (
                        <span className="vehicle-badge">
                          🚘 {currentRide.vehicleNumber}
                          {currentRide.vehicleModel ? ` (${currentRide.vehicleModel})` : ''}
                        </span>
                      )}
                      {currentRide.driverRating && (
                        <span className="rating-badge">⭐ {currentRide.driverRating}</span>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted small">We are assigning the nearest available verified chauffeur.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Live Driver Tracking Section */}
            {currentRide.driverId && (
              <div className="tracking-section" role="region" aria-label="Live Vehicle Location">
                <div className="tracking-header">
                  <div className="tracking-title-row">
                    <span className="tracking-icon" aria-hidden="true">📡</span>
                    <h4>Live Driver Location</h4>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      setLocationState('loading');
                      fetchLocationSilent(currentRide.rideId);
                    }}
                    disabled={locationState === 'loading'}
                    aria-label="Refresh driver location coordinates"
                  >
                    {locationState === 'loading' ? 'Locating...' : 'Refresh GPS'}
                  </button>
                </div>

                {locationState === 'loading' && (
                  <div className="location-loading-state">
                    <span className="btn-spinner" aria-hidden="true" />
                    <span>Contacting vehicle GPS telematics...</span>
                  </div>
                )}

                {locationState === 'ok' && driverLocation ? (
                  <div className="driver-location-card">
                    <div className="coords-box">
                      <span className="coord-item">
                        Latitude: <strong>{Number(driverLocation.latitude).toFixed(5)}</strong>
                      </span>
                      <span className="coord-item">
                        Longitude: <strong>{Number(driverLocation.longitude).toFixed(5)}</strong>
                      </span>
                      {lastLocationFetchTime && (
                        <span className="coord-time">
                          Refreshed: {lastLocationFetchTime.toLocaleTimeString()}
                        </span>
                      )}
                    </div>

                    <div className="map-action-row mt-2">
                      <a
                        href={googleMapsUrl(driverLocation.latitude, driverLocation.longitude)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-maps-link"
                        aria-label="View Driver on Google Maps in a new tab"
                      >
                        🗺️ View Driver on Google Maps
                      </a>
                    </div>

                    {driverLocation.updatedAt && (
                      <p className="location-stale">
                        Driver device last broadcast: {new Date(driverLocation.updatedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                ) : locationState === 'nodata' ? (
                  <div className="no-data-box">
                    <p>Driver has not broadcast live GPS coordinates yet.</p>
                    <span className="text-muted small">Location will automatically display here as soon as the driver starts GPS streaming.</span>
                  </div>
                ) : locationState === 'error' ? (
                  <p className="error-hint">Temporarily unable to retrieve driver coordinates. Retrying in background...</p>
                ) : null}
              </div>
            )}

            {/* Family Monitoring Sharing Section */}
            <div className="family-share-section">
              <div className="family-header-row">
                <h4>👨‍👩‍👧 Share Trip with Family Member</h4>
                <p className="card-hint">Empower a family member or friend to track this trip in real time</p>
              </div>
              {familySuccessMsg && (
                <div className="success-msg" role="status">
                  ✓ {familySuccessMsg}
                </div>
              )}
              <form onSubmit={handleAddFamilyMember} className="input-group">
                <input
                  id="p-family-uid"
                  type="text"
                  className="form-input"
                  placeholder="Enter Family Member's UID"
                  value={familyMemberUid}
                  onChange={(e) => setFamilyMemberUid(e.target.value)}
                  disabled={authorizingFamily}
                  required
                  aria-label="Enter Family Member User ID"
                />
                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={authorizingFamily || !familyMemberUid.trim()}
                  aria-busy={authorizingFamily}
                >
                  {authorizingFamily ? 'Authorizing...' : 'Authorize Access'}
                </button>
              </form>
            </div>

            {/* Cancel Trip Action (with double-click protection & confirmation) */}
            {!isTerminal(currentRide.status) && (
              <div className="card-actions">
                {!showCancelConfirm ? (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={cancelling}
                  >
                    Cancel Ride
                  </button>
                ) : (
                  <div className="cancel-confirm-box" role="alert">
                    <span>Are you sure you want to cancel this ride?</span>
                    <div className="confirm-btn-group">
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={handleCancelRide}
                        disabled={cancelling}
                        aria-busy={cancelling}
                      >
                        {cancelling ? 'Cancelling...' : 'Yes, Cancel Trip'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() => setShowCancelConfirm(false)}
                        disabled={cancelling}
                      >
                        Keep Ride
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Terminal State Banners */}
            {currentRide.status === 'COMPLETED' && (
              <>
                <div className="terminal-banner terminal-completed" role="status">
                  <h3>🎉 Trip Completed</h3>
                  <p>Thank you for traveling with ChauffIQ. We hope you had a pleasant journey!</p>
                </div>
                <PaymentSection rideId={currentRide.rideId} />
                <div className="mt-4">
                  <RatingForm
                    rideId={currentRide.rideId}
                    targetRole="Driver"
                    targetName={currentRide.driverName || 'Your Chauffeur'}
                    currentUserUid={currentRide.passengerId}
                  />
                </div>
              </>
            )}
            {currentRide.status === 'CANCELLED' && (
              <div className="terminal-banner terminal-cancelled" role="status">
                <h3>❌ Trip Cancelled</h3>
                <p>This ride request has been cancelled. You can request a new ride anytime.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
