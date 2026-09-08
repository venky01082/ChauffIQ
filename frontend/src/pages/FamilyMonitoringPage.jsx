import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chauffiq, ApiClientError } from '../api';
import { useAuth } from '../context/useAuth';
import { Alert } from '../components/Alert';

const LOCATION_POLL_MS = 8_000;
const STATUS_POLL_MS = 12_000;

function googleMapsUrl(lat, lon) {
  return `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
}

function isTerminal(status) {
  return status === 'COMPLETED' || status === 'CANCELLED';
}

function formatTime(isoString) {
  if (!isoString) return null;
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return null;
  }
}

function formatDate(isoString) {
  if (!isoString) return '';
  try {
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

function getStatusDescription(status) {
  switch (status) {
    case 'REQUESTED':
      return 'Searching for an available chauffeur';
    case 'ACCEPTED':
      return 'Chauffeur assigned & preparing for dispatch';
    case 'ARRIVING':
      return 'Chauffeur approaching pickup location';
    case 'STARTED':
      return 'Trip in progress towards destination';
    case 'COMPLETED':
      return 'Trip completed safely at destination';
    case 'CANCELLED':
      return 'This trip request was cancelled';
    default:
      return 'Status update pending';
  }
}

export function FamilyMonitoringPage() {
  const { user } = useAuth();
  const [rideIdInput, setRideIdInput] = useState('');
  const [activeRide, setActiveRide] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null);
  const [locationState, setLocationState] = useState('idle'); // idle | loading | ok | nodata | error
  const [lastLocationFetchTime, setLastLocationFetchTime] = useState(null);

  const [monitoredRides, setMonitoredRides] = useState([]);
  const [loadingMonitoredList, setLoadingMonitoredList] = useState(false);
  const [loadingRide, setLoadingRide] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const [alert, setAlert] = useState(null);
  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedRideId, setCopiedRideId] = useState(false);

  const locationPollRef = useRef(null);
  const statusPollRef = useRef(null);
  const activeRideRef = useRef(null);
  const activeRideIdRef = useRef(null);

  useEffect(() => {
    activeRideRef.current = activeRide;
  }, [activeRide]);

  // Load authorized family rides on mount
  const loadMonitoredRides = useCallback(async () => {
    setLoadingMonitoredList(true);
    try {
      const res = await chauffiq.family.getFamilyRides({ limit: 10 });
      setMonitoredRides(res.rides || []);
    } catch {
      // non-blocking
    } finally {
      setLoadingMonitoredList(false);
    }
  }, []);

  useEffect(() => {
    loadMonitoredRides();
  }, [loadMonitoredRides]);

  // Stop all polling timers
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllPolling();
    };
  }, [stopAllPolling]);

  // Stop polling on terminal states
  useEffect(() => {
    if (activeRide && isTerminal(activeRide.status)) {
      stopAllPolling();
    }
  }, [activeRide?.status, stopAllPolling]);

  // Silent Location Poller
  const fetchLocationSilent = useCallback(async (targetId) => {
    if (!targetId) return;
    const current = activeRideRef.current;
    if (current && isTerminal(current.status)) {
      stopAllPolling();
      return;
    }
    try {
      const res = await chauffiq.tracking.getDriverLocation(targetId);
      setDriverLocation(res.location);
      setLocationState('ok');
      setLastLocationFetchTime(new Date());
    } catch {
      setLocationState('nodata');
    }
  }, [stopAllPolling]);

  // Silent Status Poller
  const fetchStatusSilent = useCallback(async (targetId) => {
    if (!targetId) return;
    const current = activeRideRef.current;
    if (current && isTerminal(current.status)) {
      stopAllPolling();
      return;
    }
    try {
      const res = await chauffiq.rides.getRide(targetId);
      setActiveRide(res.ride);
    } catch {
      // non-blocking
    }
  }, [stopAllPolling]);

  // Start polling safely
  const startPolling = useCallback((targetId, hasDriver) => {
    if (locationPollRef.current && statusPollRef.current) return;
    activeRideIdRef.current = targetId;

    if (!locationPollRef.current && hasDriver) {
      fetchLocationSilent(targetId);
      locationPollRef.current = setInterval(
        () => fetchLocationSilent(activeRideIdRef.current),
        LOCATION_POLL_MS
      );
    }
    if (!statusPollRef.current) {
      statusPollRef.current = setInterval(
        () => fetchStatusSilent(activeRideIdRef.current),
        STATUS_POLL_MS
      );
    }
    setIsPolling(true);
  }, [fetchLocationSilent, fetchStatusSilent]);

  // Track / Load ride details
  const handleTrackRide = async (targetIdToLoad) => {
    const id = (typeof targetIdToLoad === 'string' ? targetIdToLoad : rideIdInput).trim();
    if (!id) {
      setAlert({ type: 'error', message: 'Please enter a valid Ride ID to monitor.' });
      return;
    }

    setLoadingRide(true);
    setAlert(null);
    stopAllPolling();

    try {
      const rideRes = await chauffiq.rides.getRide(id);
      const ride = rideRes.ride;
      setActiveRide(ride);
      setRideIdInput(ride.rideId);

      if (!isTerminal(ride.status)) {
        startPolling(ride.rideId, !!ride.driverId);
        if (ride.driverId) {
          setLocationState('loading');
          fetchLocationSilent(ride.rideId);
        }
      } else {
        // One-shot location check for terminal ride
        if (ride.driverId) {
          fetchLocationSilent(ride.rideId);
        }
      }
    } catch (err) {
      setActiveRide(null);
      setDriverLocation(null);
      if (err instanceof ApiClientError && err.status === 403) {
        setAlert({
          type: 'error',
          message: 'Access Denied: You are not authorized to monitor this ride. Ask the passenger to add your UID.',
        });
      } else if (err instanceof ApiClientError && err.status === 404) {
        setAlert({
          type: 'error',
          message: 'Ride not found. Please verify the Ride ID provided by the passenger.',
        });
      } else {
        setAlert({ type: 'error', message: err.message || 'Unable to retrieve ride monitoring data.' });
      }
    } finally {
      setLoadingRide(false);
    }
  };

  const handleCopyUid = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
    }
  };

  const handleCopyRideId = () => {
    if (activeRide?.rideId) {
      navigator.clipboard.writeText(activeRide.rideId);
      setCopiedRideId(true);
      setTimeout(() => setCopiedRideId(false), 2000);
    }
  };

  return (
    <div className="dashboard-layout" role="main" aria-label="Family Ride Monitoring">
      <div className="dashboard-header">
        <h1>Family Ride Tracking</h1>
        <p>Real-time vehicle telematics and safety monitoring for trips you are authorized to watch.</p>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      {/* Live Polling Indicator */}
      {isPolling && activeRide && !isTerminal(activeRide.status) && (
        <div className="polling-badge" role="status" aria-live="polite">
          <span className="poll-dot" aria-hidden="true" />
          <span>
            Live family tracking active · Vehicle GPS refreshes every 8s · Status every 12s
          </span>
        </div>
      )}

      {/* Lookup Card & UID Sharing */}
      <div className="card">
        <div className="card-header">
          <h3>🔍 Monitor a Ride</h3>
        </div>
        <div className="card-body">
          <div className="family-uid-share-banner">
            <div className="uid-text-group">
              <span className="uid-label">Your Family Monitor ID (UID):</span>
              <span className="mono-text uid-val">{user?.uid}</span>
            </div>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={handleCopyUid}
              aria-label="Copy your User ID"
            >
              {copiedUid ? '✓ Copied ID' : '📋 Copy My ID'}
            </button>
          </div>
          <p className="card-hint mt-2">
            Share this ID with the passenger. Once authorized, enter the Ride ID below to track the vehicle live.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleTrackRide();
            }}
            className="input-group mt-2"
          >
            <input
              id="family-ride-id-input"
              type="text"
              className="form-input"
              placeholder="Enter Ride ID to monitor"
              value={rideIdInput}
              onChange={(e) => setRideIdInput(e.target.value)}
              disabled={loadingRide}
              required
              aria-label="Enter Ride ID to monitor"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loadingRide || !rideIdInput.trim()}
              aria-busy={loadingRide}
            >
              {loadingRide ? 'Connecting...' : 'Track Vehicle'}
            </button>
          </form>

          {/* Quick-select from authorized rides */}
          {monitoredRides.length > 0 && (
            <div className="authorized-quick-select mt-4">
              <span className="quick-select-title">
                Your Authorized Monitored Rides{loadingMonitoredList ? ' (Refreshing...)' : ''}:
              </span>
              <div className="quick-chips-row">
                {monitoredRides.map((r) => (
                  <button
                    key={r.rideId}
                    type="button"
                    className={`quick-chip ${activeRide?.rideId === r.rideId ? 'active' : ''}`}
                    onClick={() => handleTrackRide(r.rideId)}
                    disabled={loadingRide}
                  >
                    <span>{r.pickup.slice(0, 16)}...</span>
                    <span className={`status-pill status-${r.status.toLowerCase()} mini-pill`}>
                      {r.status}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State when no ride is selected */}
      {!activeRide && !loadingRide && (
        <div className="card empty-state-card" role="region" aria-label="No Ride Monitored">
          <div className="empty-state-icon" aria-hidden="true">👨‍👩‍👧</div>
          <h3>No Trip Loaded</h3>
          <p>
            Enter a Ride ID above or click one of your authorized trips to view live vehicle coordinates and trip milestones.
          </p>
        </div>
      )}

      {/* Loading State during lookup */}
      {loadingRide && !activeRide && (
        <div className="card empty-state-card" role="status" aria-live="polite">
          <div className="btn-spinner large-spinner" aria-hidden="true" />
          <h3>Verifying Family Authorization...</h3>
          <p>Securely checking permissions and connecting to vehicle telematics.</p>
        </div>
      )}

      {/* Active Tracked Ride Display */}
      {activeRide && (
        <div className="card active-ride-card mt-4" role="region" aria-label="Monitored Trip Details">
          <div className="card-header space-between">
            <div className="header-title-group">
              <span className="card-subtitle">Monitored Family Ride</span>
              <div className="ride-id-row">
                <span className="mono-text ride-id-text">{activeRide.rideId}</span>
                <button
                  type="button"
                  className="btn-copy-sm"
                  onClick={handleCopyRideId}
                  title="Copy Ride ID"
                  aria-label="Copy Ride ID"
                >
                  {copiedRideId ? '✓ Copied' : '📋 Copy'}
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
                onClick={() => handleTrackRide(activeRide.rideId)}
                disabled={loadingRide}
                aria-label="Refresh Monitored Ride"
              >
                {loadingRide ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
          </div>

          <div className="card-body">
            {/* Status Narrative */}
            <div className="status-narrative-box">
              <span className="narrative-icon" aria-hidden="true">🛡️</span>
              <div className="narrative-text">
                <strong>{activeRide.status}</strong>: {getStatusDescription(activeRide.status)}
              </div>
            </div>

            {/* Trip Details Grid */}
            <div className="details-grid mt-2">
              <div className="detail-item">
                <span className="detail-label">Passenger</span>
                <span className="detail-val font-semibold">
                  👤 {activeRide.passengerName || 'Family Member'}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Assigned Chauffeur</span>
                <span className="detail-val font-semibold">
                  👨‍✈️ {activeRide.driverName || (activeRide.driverId ? 'Assigned Chauffeur' : 'Searching for driver...')}
                </span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Pickup Location</span>
                <span className="detail-val">📍 {activeRide.pickup}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Destination</span>
                <span className="detail-val">🏁 {activeRide.destination}</span>
              </div>
              {activeRide.vehicleNumber && (
                <div className="detail-item">
                  <span className="detail-label">Vehicle Information</span>
                  <span className="detail-val">
                    🚘 {activeRide.vehicleNumber} {activeRide.vehicleModel ? `(${activeRide.vehicleModel})` : ''}
                    {activeRide.driverRating && ` · ⭐ ${activeRide.driverRating}`}
                  </span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Trip Date</span>
                <span className="detail-val">
                  📅 {formatDate(activeRide.requestedAt || activeRide.createdAt)}
                </span>
              </div>
            </div>

            {/* Live Vehicle Coordinates Section */}
            {activeRide.driverId && (
              <div className="tracking-section" role="region" aria-label="Live Driver Telematics">
                <div className="tracking-header">
                  <div className="tracking-title-row">
                    <span className="tracking-icon" aria-hidden="true">📡</span>
                    <h4>Live Driver Telematics</h4>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => {
                      setLocationState('loading');
                      fetchLocationSilent(activeRide.rideId);
                    }}
                    disabled={locationState === 'loading'}
                    aria-label="Refresh GPS coordinates"
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
                        Driver broadcast: {new Date(driverLocation.updatedAt).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                ) : locationState === 'nodata' ? (
                  <div className="no-data-box">
                    <p>Driver has not broadcast live GPS coordinates yet.</p>
                    <span className="text-muted small">Coordinates will appear automatically as soon as the driver starts GPS streaming.</span>
                  </div>
                ) : locationState === 'error' ? (
                  <p className="error-hint">Temporarily unable to retrieve driver coordinates.</p>
                ) : null}
              </div>
            )}

            {/* Visual Trip Timeline */}
            <div className="trip-timeline-section mt-4" role="region" aria-label="Trip Timeline">
              <h4>🚕 Trip Milestones Timeline</h4>
              <div className="timeline-container">
                {/* 1. Requested */}
                <div className={`timeline-entry ${activeRide.requestedAt || activeRide.createdAt ? 'completed' : ''}`}>
                  <div className="timeline-marker" aria-hidden="true">✓</div>
                  <div className="timeline-content">
                    <span className="timeline-milestone">Ride Requested</span>
                    <span className="timeline-time">
                      {formatTime(activeRide.requestedAt || activeRide.createdAt) || '—'}
                    </span>
                  </div>
                </div>

                {/* 2. Accepted */}
                <div className={`timeline-entry ${activeRide.acceptedAt ? 'completed' : activeRide.status === 'REQUESTED' ? 'pending' : ''}`}>
                  <div className="timeline-marker" aria-hidden="true">
                    {activeRide.acceptedAt ? '✓' : '●'}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-milestone">Driver Accepted</span>
                    <span className="timeline-time">
                      {formatTime(activeRide.acceptedAt) || (activeRide.status === 'REQUESTED' ? 'Pending' : '—')}
                    </span>
                  </div>
                </div>

                {/* 3. Arriving */}
                <div className={`timeline-entry ${activeRide.arrivingAt ? 'completed' : activeRide.status === 'ACCEPTED' ? 'pending' : ''}`}>
                  <div className="timeline-marker" aria-hidden="true">
                    {activeRide.arrivingAt ? '✓' : '●'}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-milestone">Driver Arriving at Pickup</span>
                    <span className="timeline-time">
                      {formatTime(activeRide.arrivingAt) || (activeRide.status === 'ACCEPTED' ? 'En route' : '—')}
                    </span>
                  </div>
                </div>

                {/* 4. Started */}
                <div className={`timeline-entry ${activeRide.startedAt ? 'completed' : activeRide.status === 'ARRIVING' ? 'pending' : ''}`}>
                  <div className="timeline-marker" aria-hidden="true">
                    {activeRide.startedAt ? '✓' : '●'}
                  </div>
                  <div className="timeline-content">
                    <span className="timeline-milestone">Ride Started (In Transit)</span>
                    <span className="timeline-time">
                      {formatTime(activeRide.startedAt) || (activeRide.status === 'ARRIVING' ? 'Awaiting passenger' : '—')}
                    </span>
                  </div>
                </div>

                {/* 5. Completed or Cancelled */}
                {activeRide.status !== 'CANCELLED' ? (
                  <div className={`timeline-entry ${activeRide.completedAt ? 'completed' : ''}`}>
                    <div className="timeline-marker" aria-hidden="true">
                      {activeRide.completedAt ? '✓' : '○'}
                    </div>
                    <div className="timeline-content">
                      <span className="timeline-milestone">Ride Completed Safely</span>
                      <span className="timeline-time">
                        {formatTime(activeRide.completedAt) || (activeRide.status === 'STARTED' ? 'In progress' : '—')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="timeline-entry cancelled">
                    <div className="timeline-marker" aria-hidden="true">✕</div>
                    <div className="timeline-content">
                      <span className="timeline-milestone">Ride Cancelled</span>
                      <span className="timeline-time">
                        {formatTime(activeRide.cancelledAt || activeRide.updatedAt) || 'Cancelled'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Terminal State Banners */}
            {activeRide.status === 'COMPLETED' && (
              <div className="terminal-banner terminal-completed mt-4" role="status">
                <h3>🎉 Trip Completed Safely</h3>
                <p>The passenger has arrived at their destination. Live tracking has concluded.</p>
              </div>
            )}
            {activeRide.status === 'CANCELLED' && (
              <div className="terminal-banner terminal-cancelled mt-4" role="status">
                <h3>❌ Trip Cancelled</h3>
                <p>This ride request was cancelled. Live tracking has concluded.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
