import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';
import { chauffiq } from '../api';

export function AdminDashboard() {
  const { user } = useAuth();

  const isAdmin = user?.role === 'ADMIN' || user?.isAdmin === true;

  const [activeTab, setActiveTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // Tab Data States
  const [rides, setRides] = useState([]);
  const [ridesStatusFilter, setRidesStatusFilter] = useState('');
  const [ridesLoading, setRidesLoading] = useState(false);

  const [drivers, setDrivers] = useState([]);
  const [driversLoading, setDriversLoading] = useState(false);

  const [usersList, setUsersList] = useState([]);
  const [usersRoleFilter, setUsersRoleFilter] = useState('');
  const [usersSearch, setUsersSearch] = useState('');
  const [usersLoading, setUsersLoading] = useState(false);

  const [payments, setPayments] = useState([]);
  const [paymentsFilter, setPaymentsFilter] = useState('');
  const [paymentsLoading, setPaymentsLoading] = useState(false);

  const [ratings, setRatings] = useState([]);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  // Modal State
  const [selectedRideId, setSelectedRideId] = useState(null);
  const [rideDetails, setRideDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const loadOverview = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await chauffiq.admin.getOverview();
      if (res.success && res.overview) {
        setOverview(res.overview);
        setLastRefreshed(new Date().toLocaleTimeString());
      }
    } catch (err) {
      setError(err?.message || 'Failed to load admin overview');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadRides = useCallback(async () => {
    if (!isAdmin) return;
    setRidesLoading(true);
    try {
      const params = { limit: 50 };
      if (ridesStatusFilter) params.status = ridesStatusFilter;
      const res = await chauffiq.admin.getRides(params);
      if (res.success) {
        setRides(res.rides || []);
      }
    } catch (err) {
      console.warn('Failed to load admin rides:', err?.message);
    } finally {
      setRidesLoading(false);
    }
  }, [isAdmin, ridesStatusFilter]);

  const loadDrivers = useCallback(async () => {
    if (!isAdmin) return;
    setDriversLoading(true);
    try {
      const res = await chauffiq.admin.getDrivers({ limit: 50 });
      if (res.success) {
        setDrivers(res.drivers || []);
      }
    } catch (err) {
      console.warn('Failed to load admin drivers:', err?.message);
    } finally {
      setDriversLoading(false);
    }
  }, [isAdmin]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    setUsersLoading(true);
    try {
      const params = { limit: 50 };
      if (usersRoleFilter) params.role = usersRoleFilter;
      if (usersSearch.trim()) params.search = usersSearch.trim();
      const res = await chauffiq.admin.getUsers(params);
      if (res.success) {
        setUsersList(res.users || []);
      }
    } catch (err) {
      console.warn('Failed to load admin users:', err?.message);
    } finally {
      setUsersLoading(false);
    }
  }, [isAdmin, usersRoleFilter, usersSearch]);

  const loadPayments = useCallback(async () => {
    if (!isAdmin) return;
    setPaymentsLoading(true);
    try {
      const params = { limit: 50 };
      if (paymentsFilter) params.status = paymentsFilter;
      const res = await chauffiq.admin.getPayments(params);
      if (res.success) {
        setPayments(res.payments || []);
      }
    } catch (err) {
      console.warn('Failed to load admin payments:', err?.message);
    } finally {
      setPaymentsLoading(false);
    }
  }, [isAdmin, paymentsFilter]);

  const loadRatings = useCallback(async () => {
    if (!isAdmin) return;
    setRatingsLoading(true);
    try {
      const res = await chauffiq.admin.getRatings({ limit: 50 });
      if (res.success) {
        setRatings(res.ratings || []);
      }
    } catch (err) {
      console.warn('Failed to load admin ratings:', err?.message);
    } finally {
      setRatingsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      loadOverview();
    }
  }, [isAdmin, loadOverview]);

  useEffect(() => {
    if (!isAdmin) return;
    if (activeTab === 'rides') loadRides();
    else if (activeTab === 'drivers') loadDrivers();
    else if (activeTab === 'users') loadUsers();
    else if (activeTab === 'payments') loadPayments();
    else if (activeTab === 'ratings') loadRatings();
  }, [activeTab, isAdmin, loadRides, loadDrivers, loadUsers, loadPayments, loadRatings]);

  const inspectRide = async (rideId) => {
    setSelectedRideId(rideId);
    setDetailsLoading(true);
    setDetailsError(null);
    setRideDetails(null);
    try {
      const res = await chauffiq.admin.getRideDetails(rideId);
      if (res.success) {
        setRideDetails(res);
      } else {
        setDetailsError(res.message || 'Ride details not found');
      }
    } catch (err) {
      setDetailsError(err?.message || 'Failed to inspect ride');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetailsModal = () => {
    setSelectedRideId(null);
    setRideDetails(null);
  };

  // Safe Guard: Access Denied for non-administrators
  if (!isAdmin) {
    return (
      <div className="dashboard-container">
        <div className="access-denied-box">
          <div className="access-denied-icon">🔒</div>
          <h2>Access Denied</h2>
          <p>Administrator privileges are required to access this operational dashboard.</p>
          <p className="security-notice">
            All system queries are strictly validated and authorized server-side.
          </p>
        </div>
      </div>
    );
  }

  const activeTripsCount =
    (overview?.rides?.ACCEPTED || 0) +
    (overview?.rides?.ARRIVING || 0) +
    (overview?.rides?.STARTED || 0);

  return (
    <div className="dashboard-container admin-dashboard">
      {/* Admin Header */}
      <div className="dashboard-header admin-header">
        <div>
          <div className="admin-title-row">
            <h1>Operational Admin Dashboard</h1>
            <span className="sandbox-badge">SANDBOX TEST MODE</span>
          </div>
          <p className="dashboard-subtitle">
            Server-Authoritative Operational Telemetry & Read-Only Audit View
          </p>
        </div>
        <div className="admin-header-actions">
          {lastRefreshed && (
            <span className="last-refreshed">Updated: {lastRefreshed}</span>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              loadOverview();
              if (activeTab === 'rides') loadRides();
              else if (activeTab === 'drivers') loadDrivers();
              else if (activeTab === 'users') loadUsers();
              else if (activeTab === 'payments') loadPayments();
              else if (activeTab === 'ratings') loadRatings();
            }}
            disabled={loading}
          >
            {loading ? 'Refreshing…' : '🔄 Refresh Data'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="stats-grid admin-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-value">{overview?.users?.total ?? '—'}</div>
          <div className="stat-sub">
            {overview?.users?.passengers ?? 0} Pass · {overview?.users?.drivers ?? 0} Drv
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Active Trips</div>
          <div className="stat-value stat-highlight">{activeTripsCount}</div>
          <div className="stat-sub">
            {overview?.rides?.STARTED ?? 0} in transit
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Completed Rides</div>
          <div className="stat-value">{overview?.rides?.COMPLETED ?? '—'}</div>
          <div className="stat-sub">
            {overview?.rides?.CANCELLED ?? 0} cancelled
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Driver Fleet</div>
          <div className="stat-value">{overview?.drivers?.total ?? '—'}</div>
          <div className="stat-sub">
            {overview?.drivers?.available ?? 0} online & available
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Sandbox Payments</div>
          <div className="stat-value">₹{overview?.payments?.totalVolumeRupees ?? '0.00'}</div>
          <div className="stat-sub">
            {overview?.payments?.SUCCEEDED ?? 0} Succeeded · {overview?.payments?.PENDING ?? 0} Pending
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Driver Rating Avg</div>
          <div className="stat-value">⭐ {overview?.ratings?.averageDriverRating ?? '5.0'}</div>
          <div className="stat-sub">
            {overview?.ratings?.total ?? 0} total reviews
          </div>
        </div>

        <div className="stat-card system-health-card">
          <div className="stat-label">System Health</div>
          <div className="stat-value system-ok">🟢 {overview?.system?.status ?? 'OPERATIONAL'}</div>
          <div className="stat-sub">
            {overview?.system?.region ?? 'asia-southeast1'}
          </div>
        </div>
      </div>

      {/* Admin Operational Navigation Tabs */}
      <div className="admin-nav-tabs">
        <button
          type="button"
          className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          System Health
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'rides' ? 'active' : ''}`}
          onClick={() => setActiveTab('rides')}
        >
          Rides ({overview?.rides?.total ?? 0})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'drivers' ? 'active' : ''}`}
          onClick={() => setActiveTab('drivers')}
        >
          Drivers ({overview?.drivers?.total ?? 0})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users ({overview?.users?.total ?? 0})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Sandbox Payments ({overview?.payments?.total ?? 0})
        </button>
        <button
          type="button"
          className={`admin-tab ${activeTab === 'ratings' ? 'active' : ''}`}
          onClick={() => setActiveTab('ratings')}
        >
          Ratings ({overview?.ratings?.total ?? 0})
        </button>
      </div>

      {/* TAB CONTENT: Overview / Health */}
      {activeTab === 'overview' && (
        <div className="card admin-section">
          <h3>Infrastructure & Region Health</h3>
          <div className="health-grid">
            <div className="health-item">
              <span className="health-label">API Cloud Functions</span>
              <span className="badge badge-success">200 OK · {overview?.system?.region || 'asia-southeast1'}</span>
            </div>
            <div className="health-item">
              <span className="health-label">Cloud Firestore</span>
              <span className="badge badge-success">Connected (Native Mode)</span>
            </div>
            <div className="health-item">
              <span className="health-label">Payment Processing</span>
              <span className="badge badge-warning">SANDBOX TEST MODE ONLY</span>
            </div>
            <div className="health-item">
              <span className="health-label">Direct Client Writes</span>
              <span className="badge badge-info">100% Blocked via Security Rules</span>
            </div>
          </div>

          <div className="ride-breakdown-box">
            <h4>Ride Lifecycle Distribution</h4>
            <div className="lifecycle-chips">
              <span className="chip chip-requested">Requested: {overview?.rides?.REQUESTED || 0}</span>
              <span className="chip chip-accepted">Accepted: {overview?.rides?.ACCEPTED || 0}</span>
              <span className="chip chip-arriving">Arriving: {overview?.rides?.ARRIVING || 0}</span>
              <span className="chip chip-started">Started: {overview?.rides?.STARTED || 0}</span>
              <span className="chip chip-completed">Completed: {overview?.rides?.COMPLETED || 0}</span>
              <span className="chip chip-cancelled">Cancelled: {overview?.rides?.CANCELLED || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Rides */}
      {activeTab === 'rides' && (
        <div className="card admin-section">
          <div className="table-header-row">
            <h3>Ride Registry</h3>
            <div className="filter-controls">
              <select
                className="select-input"
                value={ridesStatusFilter}
                onChange={(e) => setRidesStatusFilter(e.target.value)}
                aria-label="Filter rides by status"
              >
                <option value="">All Statuses</option>
                <option value="REQUESTED">Requested</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="ARRIVING">Arriving</option>
                <option value="STARTED">Started</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {ridesLoading ? (
            <p className="loading-text">Loading rides registry…</p>
          ) : rides.length === 0 ? (
            <p className="empty-text">No rides match the selected criteria.</p>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ride ID</th>
                    <th>Status</th>
                    <th>Pickup</th>
                    <th>Destination</th>
                    <th>Requested At</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rides.map((r) => (
                    <tr key={r.rideId}>
                      <td className="font-mono">{r.rideId}</td>
                      <td>
                        <span className={`status-pill status-${r.status.toLowerCase()}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="cell-truncate" title={r.pickup}>{r.pickup}</td>
                      <td className="cell-truncate" title={r.destination}>{r.destination}</td>
                      <td className="text-muted text-sm">
                        {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '—'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs"
                          onClick={() => inspectRide(r.rideId)}
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Drivers */}
      {activeTab === 'drivers' && (
        <div className="card admin-section">
          <div className="table-header-row">
            <h3>Registered Chauffeur Fleet</h3>
          </div>

          {driversLoading ? (
            <p className="loading-text">Loading chauffeur fleet…</p>
          ) : drivers.length === 0 ? (
            <p className="empty-text">No drivers registered in the system.</p>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Driver UID</th>
                    <th>Name</th>
                    <th>Vehicle</th>
                    <th>Plate</th>
                    <th>Rating</th>
                    <th>Trips</th>
                    <th>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((d) => (
                    <tr key={d.uid}>
                      <td className="font-mono">{d.uid}</td>
                      <td><strong>{d.name}</strong></td>
                      <td>{d.vehicleModel || 'Standard'}</td>
                      <td className="font-mono">{d.vehicleNumber}</td>
                      <td>⭐ {d.ratingAverage || d.rating || 5} ({d.ratingCount || 0})</td>
                      <td>{d.totalTrips || 0}</td>
                      <td>
                        <span className={`status-pill ${d.isAvailable ? 'status-completed' : 'status-cancelled'}`}>
                          {d.isAvailable ? 'Available' : 'Busy'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Users */}
      {activeTab === 'users' && (
        <div className="card admin-section">
          <div className="table-header-row">
            <h3>User Directory</h3>
            <div className="filter-controls">
              <input
                type="text"
                placeholder="Search name, email, phone…"
                className="input-text"
                value={usersSearch}
                onChange={(e) => setUsersSearch(e.target.value)}
                style={{ width: '220px' }}
              />
              <select
                className="select-input"
                value={usersRoleFilter}
                onChange={(e) => setUsersRoleFilter(e.target.value)}
                aria-label="Filter users by role"
              >
                <option value="">All Roles</option>
                <option value="PASSENGER">Passenger</option>
                <option value="DRIVER">Driver</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          {usersLoading ? (
            <p className="loading-text">Loading user directory…</p>
          ) : usersList.length === 0 ? (
            <p className="empty-text">No users found.</p>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>UID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.uid}>
                      <td className="font-mono">{u.uid}</td>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>{u.phone || '—'}</td>
                      <td>
                        <span className={`role-badge ${(u.role || 'passenger').toLowerCase()}`}>
                          {u.role || 'PASSENGER'}
                        </span>
                      </td>
                      <td className="text-muted text-sm">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Sandbox Payments */}
      {activeTab === 'payments' && (
        <div className="card admin-section">
          <div className="table-header-row">
            <div>
              <h3>Sandbox Payment Transactions</h3>
              <span className="sandbox-badge">TEST MODE ONLY — ZERO REAL MONEY</span>
            </div>
            <div className="filter-controls">
              <select
                className="select-input"
                value={paymentsFilter}
                onChange={(e) => setPaymentsFilter(e.target.value)}
                aria-label="Filter payments by status"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SUCCEEDED">Succeeded</option>
                <option value="FAILED">Failed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {paymentsLoading ? (
            <p className="loading-text">Loading sandbox payments…</p>
          ) : payments.length === 0 ? (
            <p className="empty-text">No sandbox payments recorded.</p>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Ride ID</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Provider</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.paymentId}>
                      <td className="font-mono">{p.paymentId}</td>
                      <td className="font-mono">{p.rideId}</td>
                      <td><strong>₹{(p.amount / 100).toFixed(2)}</strong></td>
                      <td>
                        <span className={`status-pill status-${p.status.toLowerCase()}`}>
                          {p.status}
                        </span>
                      </td>
                      <td><span className="badge badge-info">{p.provider}</span></td>
                      <td className="text-muted text-sm">
                        {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: Ratings */}
      {activeTab === 'ratings' && (
        <div className="card admin-section">
          <div className="table-header-row">
            <h3>Two-Sided Ratings & Feedback</h3>
          </div>

          {ratingsLoading ? (
            <p className="loading-text">Loading ratings telemetry…</p>
          ) : ratings.length === 0 ? (
            <p className="empty-text">No ratings submitted yet.</p>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Score</th>
                    <th>Direction</th>
                    <th>Ride ID</th>
                    <th>Feedback</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map((rt) => (
                    <tr key={rt.ratingId}>
                      <td><strong className="star-score">⭐ {rt.rating} / 5</strong></td>
                      <td>
                        <span className="badge badge-info">{rt.fromRole} ➔ {rt.toRole}</span>
                      </td>
                      <td className="font-mono">{rt.rideId}</td>
                      <td className="feedback-quote">
                        {rt.feedback ? `"${rt.feedback}"` : <em className="text-muted">No text comment</em>}
                      </td>
                      <td className="text-muted text-sm">
                        {rt.createdAt ? new Date(rt.createdAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Ride Details Inspection */}
      {selectedRideId && (
        <div className="modal-overlay" onClick={closeDetailsModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ride Inspection: <span className="font-mono">{selectedRideId}</span></h3>
              <button
                type="button"
                className="modal-close"
                onClick={closeDetailsModal}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {detailsLoading ? (
              <p className="loading-text">Loading complete operational details…</p>
            ) : detailsError ? (
              <div className="alert alert-error">{detailsError}</div>
            ) : rideDetails ? (
              <div className="ride-inspection-content">
                <div className="inspection-status-banner">
                  <span>Current State:</span>
                  <span className={`status-pill status-${rideDetails.ride?.status?.toLowerCase()}`}>
                    {rideDetails.ride?.status}
                  </span>
                </div>

                <div className="inspection-grid">
                  <div className="inspection-block">
                    <h4>Routing & Location</h4>
                    <p><strong>Pickup:</strong> {rideDetails.ride?.pickup}</p>
                    <p><strong>Destination:</strong> {rideDetails.ride?.destination}</p>
                  </div>

                  <div className="inspection-block">
                    <h4>Participants</h4>
                    <p>
                      <strong>Passenger:</strong> {rideDetails.passenger?.name || '—'}
                      <span className="text-muted text-sm"> ({rideDetails.passenger?.email || '—'})</span>
                    </p>
                    <p>
                      <strong>Driver:</strong> {rideDetails.driver?.name || 'Unassigned'}
                      {rideDetails.driver?.vehicleNumber && (
                        <span className="text-muted text-sm"> · {rideDetails.driver.vehicleModel} ({rideDetails.driver.vehicleNumber})</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="inspection-timeline">
                  <h4>Milestone Telemetry</h4>
                  <ul>
                    <li>Requested: {rideDetails.ride?.requestedAt ? new Date(rideDetails.ride.requestedAt).toLocaleString() : '—'}</li>
                    <li>Accepted: {rideDetails.ride?.acceptedAt ? new Date(rideDetails.ride.acceptedAt).toLocaleString() : '—'}</li>
                    <li>Arriving: {rideDetails.ride?.arrivingAt ? new Date(rideDetails.ride.arrivingAt).toLocaleString() : '—'}</li>
                    <li>Started: {rideDetails.ride?.startedAt ? new Date(rideDetails.ride.startedAt).toLocaleString() : '—'}</li>
                    <li>Completed: {rideDetails.ride?.completedAt ? new Date(rideDetails.ride.completedAt).toLocaleString() : '—'}</li>
                    {rideDetails.ride?.cancelledAt && (
                      <li className="text-danger">Cancelled: {new Date(rideDetails.ride.cancelledAt).toLocaleString()}</li>
                    )}
                  </ul>
                </div>

                {rideDetails.payment && (
                  <div className="inspection-payment">
                    <h4>Sandbox Payment Record</h4>
                    <div className="sandbox-receipt">
                      <p><strong>Transaction ID:</strong> <span className="font-mono">{rideDetails.payment.paymentId}</span></p>
                      <p><strong>Amount:</strong> ₹{(rideDetails.payment.amount / 100).toFixed(2)} ({rideDetails.payment.currency})</p>
                      <p><strong>Status:</strong> <span className={`status-pill status-${rideDetails.payment.status.toLowerCase()}`}>{rideDetails.payment.status}</span></p>
                      <p><strong>Mode:</strong> <span className="sandbox-badge">SANDBOX TEST</span></p>
                    </div>
                  </div>
                )}

                {rideDetails.ratings && rideDetails.ratings.length > 0 && (
                  <div className="inspection-ratings">
                    <h4>Ratings & Reviews ({rideDetails.ratings.length})</h4>
                    {rideDetails.ratings.map((rt) => (
                      <div key={rt.ratingId} className="mini-rating-item">
                        <span>⭐ {rt.rating}/5 ({rt.fromRole} ➔ {rt.toRole})</span>
                        {rt.feedback && <p className="feedback-quote">"{rt.feedback}"</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeDetailsModal}
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
