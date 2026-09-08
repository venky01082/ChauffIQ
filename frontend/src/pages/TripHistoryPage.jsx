import React, { useState, useEffect, useCallback } from 'react';
import { chauffiq } from '../api';
import { useAuth } from '../context/useAuth';
import { Alert } from '../components/Alert';

function formatTime(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
}

function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    return new Date(isoString).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function TripHistoryPage() {
  const { user } = useAuth();
  const [role, setRole] = useState(user?.role === 'DRIVER' ? 'DRIVER' : 'PASSENGER');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('NEWEST'); // NEWEST | OLDEST

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Selected ride for read-only detail view
  const [selectedRide, setSelectedRide] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setAlert(null);
    try {
      const res = await chauffiq.rides.getTripHistory({
        role,
        status: statusFilter,
        limit: 50,
      });
      let list = res.rides || [];
      if (sortOrder === 'OLDEST') {
        list = [...list].reverse();
      }
      setRides(list);
    } catch (err) {
      setAlert({ type: 'error', message: err.message || 'Failed to load trip history.' });
    } finally {
      setLoading(false);
    }
  }, [role, statusFilter, sortOrder]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCopyRideId = (id) => {
    if (id) {
      navigator.clipboard.writeText(id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="dashboard-layout" role="main" aria-label="Trip History">
      <div className="dashboard-header">
        <h1>Trip History &amp; Records</h1>
        <p>Review past bookings, completed travels, and monitored family journeys.</p>
      </div>

      <Alert type={alert?.type} message={alert?.message} onClose={() => setAlert(null)} />

      {/* Controls Bar: Role tabs & Filters */}
      <div className="card history-controls-card">
        <div className="history-tabs-row">
          <button
            type="button"
            className={`tab-btn ${role === 'PASSENGER' ? 'active' : ''}`}
            onClick={() => setRole('PASSENGER')}
          >
            👤 Passenger Trips
          </button>
          <button
            type="button"
            className={`tab-btn ${role === 'DRIVER' ? 'active' : ''}`}
            onClick={() => setRole('DRIVER')}
          >
            🚗 Chauffeur Trips
          </button>
          <button
            type="button"
            className={`tab-btn ${role === 'FAMILY' ? 'active' : ''}`}
            onClick={() => setRole('FAMILY')}
          >
            👨‍👩‍👧 Family Monitored
          </button>
        </div>

        <div className="history-filter-row mt-2">
          <div className="filter-group">
            <label htmlFor="history-status-filter" className="filter-label">Status:</label>
            <select
              id="history-status-filter"
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Trips</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="history-sort-order" className="filter-label">Sort:</label>
            <select
              id="history-sort-order"
              className="form-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="NEWEST">Newest First</option>
              <option value="OLDEST">Oldest First</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-outline btn-sm refresh-history-btn"
            onClick={fetchHistory}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && rides.length === 0 && (
        <div className="card empty-state-card" role="status" aria-live="polite">
          <div className="btn-spinner large-spinner" aria-hidden="true" />
          <h3>Loading Your Trip History...</h3>
          <p>Please wait while we retrieve your authorized travel records.</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && rides.length === 0 && (
        <div className="card empty-state-card" role="region" aria-label="No Trips Found">
          <div className="empty-state-icon" aria-hidden="true">📜</div>
          <h3>No Trip Records Found</h3>
          <p>
            {statusFilter !== 'ALL'
              ? `No ${statusFilter.toLowerCase()} trips match your current filter.`
              : 'You do not have any registered trips in this category yet.'}
          </p>
        </div>
      )}

      {/* History Cards List */}
      {rides.length > 0 && (
        <div className="history-list-grid" role="region" aria-label="Trips List">
          {rides.map((ride) => (
            <div key={ride.rideId} className="card history-item-card">
              <div className="history-item-header">
                <div>
                  <span className="history-date">
                    📅 {formatDate(ride.requestedAt || ride.createdAt)} · {formatTime(ride.requestedAt || ride.createdAt)}
                  </span>
                  <div className="ride-id-row mt-1">
                    <span className="mono-text ride-id-text-sm">{ride.rideId}</span>
                    <button
                      type="button"
                      className="btn-copy-sm"
                      onClick={() => handleCopyRideId(ride.rideId)}
                      title="Copy Ride ID"
                      aria-label="Copy Ride ID"
                    >
                      {copiedId === ride.rideId ? '✓' : '📋'}
                    </button>
                  </div>
                </div>
                <span className={`status-pill status-${ride.status.toLowerCase()}`}>
                  {ride.status}
                </span>
              </div>

              <div className="history-route-box mt-2">
                <div className="route-point">
                  <span className="point-icon">📍</span>
                  <span className="point-text"><strong>From:</strong> {ride.pickup}</span>
                </div>
                <div className="route-point mt-1">
                  <span className="point-icon">🏁</span>
                  <span className="point-text"><strong>To:</strong> {ride.destination}</span>
                </div>
              </div>

              <div className="history-footer-row mt-2">
                <div className="history-meta-text">
                  {role === 'DRIVER' ? (
                    <span>👤 Passenger ID: <span className="mono-text">{ride.passengerId?.slice(0, 8)}...</span></span>
                  ) : (
                    <span>👨‍✈️ Driver: <strong>{ride.driverName || (ride.driverId ? `${ride.driverId.slice(0, 8)}...` : 'None')}</strong></span>
                  )}
                  {ride.vehicleNumber && <span> · 🚘 {ride.vehicleNumber}</span>}
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSelectedRide(ride)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Read-Only Ride Details Modal */}
      {selectedRide && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="details-title">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 id="details-title">Trip Record: <span className="mono-text">{selectedRide.rideId}</span></h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedRide(null)}
                aria-label="Close Details"
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Status</span>
                  <span className={`status-pill status-${selectedRide.status.toLowerCase()}`}>
                    {selectedRide.status}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Booking Date</span>
                  <span className="detail-val">{formatDate(selectedRide.requestedAt || selectedRide.createdAt)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Pickup Location</span>
                  <span className="detail-val">📍 {selectedRide.pickup}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Destination</span>
                  <span className="detail-val">🏁 {selectedRide.destination}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Passenger</span>
                  <span className="detail-val">{selectedRide.passengerName || selectedRide.passengerId}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Chauffeur</span>
                  <span className="detail-val">
                    {selectedRide.driverName || selectedRide.driverId || 'Unassigned'}
                  </span>
                </div>
                {selectedRide.vehicleNumber && (
                  <div className="detail-item">
                    <span className="detail-label">Vehicle</span>
                    <span className="detail-val">
                      🚘 {selectedRide.vehicleNumber} {selectedRide.vehicleModel ? `(${selectedRide.vehicleModel})` : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Complete Trip Timeline */}
              <div className="trip-timeline-section mt-4">
                <h4>🚕 Trip Milestone Timestamps (Read-Only)</h4>
                <div className="timeline-container">
                  <div className="timeline-entry completed">
                    <div className="timeline-marker" aria-hidden="true">✓</div>
                    <div className="timeline-content">
                      <span className="timeline-milestone">Ride Requested</span>
                      <span className="timeline-time">{formatTime(selectedRide.requestedAt || selectedRide.createdAt)}</span>
                    </div>
                  </div>

                  {selectedRide.acceptedAt && (
                    <div className="timeline-entry completed">
                      <div className="timeline-marker" aria-hidden="true">✓</div>
                      <div className="timeline-content">
                        <span className="timeline-milestone">Driver Accepted</span>
                        <span className="timeline-time">{formatTime(selectedRide.acceptedAt)}</span>
                      </div>
                    </div>
                  )}

                  {selectedRide.arrivingAt && (
                    <div className="timeline-entry completed">
                      <div className="timeline-marker" aria-hidden="true">✓</div>
                      <div className="timeline-content">
                        <span className="timeline-milestone">Driver Arrived at Pickup</span>
                        <span className="timeline-time">{formatTime(selectedRide.arrivingAt)}</span>
                      </div>
                    </div>
                  )}

                  {selectedRide.startedAt && (
                    <div className="timeline-entry completed">
                      <div className="timeline-marker" aria-hidden="true">✓</div>
                      <div className="timeline-content">
                        <span className="timeline-milestone">Ride Started</span>
                        <span className="timeline-time">{formatTime(selectedRide.startedAt)}</span>
                      </div>
                    </div>
                  )}

                  {selectedRide.completedAt && (
                    <div className="timeline-entry completed">
                      <div className="timeline-marker" aria-hidden="true">✓</div>
                      <div className="timeline-content">
                        <span className="timeline-milestone">Ride Completed</span>
                        <span className="timeline-time">{formatTime(selectedRide.completedAt)}</span>
                      </div>
                    </div>
                  )}

                  {selectedRide.cancelledAt && (
                    <div className="timeline-entry cancelled">
                      <div className="timeline-marker" aria-hidden="true">✕</div>
                      <div className="timeline-content">
                        <span className="timeline-milestone">Ride Cancelled</span>
                        <span className="timeline-time">{formatTime(selectedRide.cancelledAt)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <span className="read-only-badge">🔒 Read-Only Historical Record</span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedRide(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
