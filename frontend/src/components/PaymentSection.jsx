import React, { useState, useEffect, useCallback } from 'react';
import { chauffiq } from '../api';
import { Alert } from './Alert';

export function PaymentSection({
  rideId,
  readOnly = false,
  onPaymentUpdated,
}) {
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [alert, setAlert] = useState(null);

  const fetchPayment = useCallback(async () => {
    if (!rideId) return;
    setLoading(true);
    try {
      const res = await chauffiq.payments.getPayment({ rideId });
      if (res && res.payment) {
        setPayment(res.payment);
      }
    } catch {
      // Payment may not exist yet for this ride
      setPayment(null);
    } finally {
      setLoading(false);
    }
  }, [rideId]);

  useEffect(() => {
    fetchPayment();
  }, [fetchPayment]);

  const handleCreatePayment = async () => {
    if (processing || readOnly || !rideId) return;
    setProcessing(true);
    setAlert(null);
    try {
      const res = await chauffiq.payments.createPayment({ rideId });
      if (res.success && res.payment) {
        setPayment(res.payment);
        setAlert({
          type: 'success',
          message: 'Sandbox payment initiated. Status: PENDING.',
        });
        if (typeof onPaymentUpdated === 'function') {
          onPaymentUpdated(res.payment);
        }
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.message || 'Failed to initiate sandbox payment.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSimulate = async (outcome) => {
    if (processing || readOnly || !payment?.paymentId) return;
    setProcessing(true);
    setAlert(null);
    try {
      const res = await chauffiq.payments.simulatePaymentResult({
        paymentId: payment.paymentId,
        outcome,
      });
      if (res.success && res.payment) {
        setPayment(res.payment);
        const msg =
          outcome === 'SUCCESS'
            ? 'Sandbox payment simulated: SUCCEEDED.'
            : outcome === 'FAILURE'
            ? 'Sandbox payment simulated: FAILED.'
            : 'Sandbox payment simulated: CANCELLED.';
        setAlert({
          type: outcome === 'SUCCESS' ? 'success' : 'warning',
          message: msg,
        });
        if (typeof onPaymentUpdated === 'function') {
          onPaymentUpdated(res.payment);
        }
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.message || 'Failed to simulate payment result.',
      });
    } finally {
      setProcessing(false);
    }
  };

  const displayAmount = payment?.amount
    ? `₹${(payment.amount / 100).toFixed(2)}`
    : '₹750.00 (Test Fare)';

  return (
    <div className="card payment-card mt-3" role="region" aria-label="Trip Payment (Sandbox)">
      <div className="card-header space-between">
        <div className="payment-title-group">
          <div className="badge-row">
            <h4>💳 Trip Payment</h4>
            <span className="sandbox-badge">🧪 SANDBOX / TEST MODE</span>
          </div>
          <p className="card-hint">
            Deterministic fare calculation in sandbox environment. No real cards or money are charged.
          </p>
        </div>

        {payment && (
          <div className="payment-status-pill-wrap">
            <span className={`status-pill status-${payment.status.toLowerCase()}`}>
              {payment.status === 'SUCCEEDED' && '✓ '}
              {payment.status === 'FAILED' && '✗ '}
              {payment.status === 'PENDING' && '⏳ '}
              {payment.status === 'CANCELLED' && '⊘ '}
              {payment.status}
            </span>
          </div>
        )}
      </div>

      <div className="card-body">
        {alert && (
          <Alert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        <div className="fare-summary-box">
          <div className="fare-row">
            <span className="fare-label">Authoritative Fare:</span>
            <span className="fare-value font-bold">{displayAmount}</span>
          </div>
          {payment && (
            <div className="fare-meta-grid mt-2">
              <div className="meta-item">
                <span className="text-muted small">Payment ID:</span>
                <span className="mono-text small ml-1">{payment.paymentId}</span>
              </div>
              <div className="meta-item">
                <span className="text-muted small">Provider ID:</span>
                <span className="mono-text small ml-1">{payment.providerPaymentId}</span>
              </div>
              {payment.completedAt && (
                <div className="meta-item">
                  <span className="text-muted small">Completed At:</span>
                  <span className="small ml-1">
                    {new Date(payment.completedAt).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Passenger Action Section */}
        {!readOnly && (
          <div className="payment-actions mt-3">
            {!payment && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleCreatePayment}
                disabled={processing || loading}
                aria-busy={processing}
              >
                {processing ? 'Initiating Payment...' : '💳 Pay Now (Sandbox Test)'}
              </button>
            )}

            {payment && (payment.status === 'PENDING' || payment.status === 'AUTHORIZED') && (
              <div className="simulator-box" role="region" aria-label="Sandbox Simulation Controls">
                <span className="simulator-label font-semibold">
                  Sandbox Outcome Controls (Test Simulation):
                </span>
                <div className="btn-group-row mt-2">
                  <button
                    type="button"
                    className="btn btn-success btn-sm"
                    onClick={() => handleSimulate('SUCCESS')}
                    disabled={processing}
                    aria-busy={processing}
                  >
                    Simulate Success ✅
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => handleSimulate('FAILURE')}
                    disabled={processing}
                    aria-busy={processing}
                  >
                    Simulate Failure ⚠️
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => handleSimulate('CANCEL')}
                    disabled={processing}
                    aria-busy={processing}
                  >
                    Simulate Cancel ❌
                  </button>
                </div>
              </div>
            )}

            {payment && payment.status === 'SUCCEEDED' && (
              <div className="terminal-completed-note mt-2">
                ✓ Payment completed successfully. Thank you for riding with ChauffIQ!
              </div>
            )}

            {payment && (payment.status === 'FAILED' || payment.status === 'CANCELLED') && (
              <div className="terminal-cancelled-note mt-2">
                <span>Payment {payment.status.toLowerCase()}. {payment.failureReason || ''}</span>
                <button
                  type="button"
                  className="btn btn-primary btn-sm ml-2"
                  onClick={handleCreatePayment}
                  disabled={processing}
                >
                  Retry Payment (Sandbox)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Read-Only Mode Note for Driver & Family */}
        {readOnly && (
          <div className="read-only-note text-muted small mt-2">
            ℹ️ Passenger manages payment authorization in Sandbox Test Mode.
          </div>
        )}
      </div>
    </div>
  );
}
