import React, { useState, useEffect, useCallback } from 'react';
import { chauffiq } from '../api';
import { Alert } from './Alert';

const STAR_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export function RatingForm({
  rideId,
  targetRole = 'Driver',
  targetName = '',
  currentUserUid = '',
  onRatingSubmitted,
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [existingRating, setExistingRating] = useState(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [alert, setAlert] = useState(null);

  const checkExistingRating = useCallback(async () => {
    if (!rideId) {
      setCheckingExisting(false);
      return;
    }
    try {
      const res = await chauffiq.rides.getRideRatings(rideId);
      if (res && Array.isArray(res.ratings)) {
        const found = res.ratings.find((r) => r.fromUid === currentUserUid);
        if (found) {
          setExistingRating(found);
        }
      }
    } catch {
      // Non-blocking: will allow rating submission attempt
    } finally {
      setCheckingExisting(false);
    }
  }, [rideId, currentUserUid]);

  useEffect(() => {
    checkExistingRating();
  }, [checkExistingRating]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || existingRating) return;

    if (!rating || rating < 1 || rating > 5) {
      setAlert({
        type: 'warning',
        message: 'Please select a star rating between 1 and 5 before submitting.',
      });
      return;
    }

    setSubmitting(true);
    setAlert(null);

    try {
      const res = await chauffiq.rides.submitRating({
        rideId,
        rating,
        feedback: feedback.trim() || undefined,
      });

      if (res.success) {
        setExistingRating(res.rating || { rating, feedback: feedback.trim() });
        setAlert({
          type: 'success',
          message: 'Thank you! Your rating and feedback have been recorded.',
        });
        if (typeof onRatingSubmitted === 'function') {
          onRatingSubmitted(res.rating);
        }
      }
    } catch (err) {
      setAlert({
        type: 'danger',
        message: err.message || 'Failed to submit rating. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingExisting) {
    return (
      <div className="rating-card card-inner" aria-busy="true">
        <span className="btn-spinner" aria-hidden="true" />
        <span className="text-muted small ml-2">Loading trip review status...</span>
      </div>
    );
  }

  // If already rated, display read-only submitted badge
  if (existingRating) {
    return (
      <div className="rating-card card-inner rating-submitted-box" role="region" aria-label="Submitted Rating">
        <div className="rating-submitted-header">
          <span className="rating-check-icon" aria-hidden="true">⭐</span>
          <div>
            <h4 className="rating-title">Trip Rating Submitted</h4>
            <p className="text-muted small">
              You rated your {targetRole.toLowerCase()} {existingRating.rating} out of 5 stars ({STAR_LABELS[existingRating.rating] || ''})
            </p>
          </div>
        </div>

        <div className="star-display-row" aria-label={`Rating: ${existingRating.rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`star-icon-static ${star <= existingRating.rating ? 'star-filled' : 'star-empty'}`}
              aria-hidden="true"
            >
              ★
            </span>
          ))}
          <span className="star-label-text ml-2 font-semibold">
            {STAR_LABELS[existingRating.rating]}
          </span>
        </div>

        {existingRating.feedback && (
          <div className="submitted-feedback-quote">
            <span className="quote-label">Your Feedback:</span>
            <p>"{existingRating.feedback}"</p>
          </div>
        )}
      </div>
    );
  }

  const activeStar = hoverRating || rating;

  return (
    <div className="rating-card card-inner" role="region" aria-label={`Rate your ${targetRole.toLowerCase()}`}>
      <div className="rating-card-header">
        <h4>⭐ Rate Your {targetRole}</h4>
        <p className="card-hint">
          How was your journey with {targetName ? targetName : `your ${targetRole.toLowerCase()}`}? Your feedback helps us maintain premium service standards.
        </p>
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <form onSubmit={handleSubmit} className="rating-form">
        <div className="star-picker-group">
          <label className="detail-label mb-1">Your Rating</label>
          <div
            className="star-selector"
            role="radiogroup"
            aria-label="Star rating from 1 to 5"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className={`star-btn ${star <= activeStar ? 'star-active' : ''}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`${star} star${star > 1 ? 's' : ''}: ${STAR_LABELS[star]}`}
                aria-checked={rating === star}
                role="radio"
                disabled={submitting}
              >
                ★
              </button>
            ))}
            {activeStar > 0 && (
              <span className="star-rating-hint font-semibold" aria-live="polite">
                {STAR_LABELS[activeStar]} ({activeStar}/5)
              </span>
            )}
          </div>
        </div>

        <div className="form-group mt-3">
          <div className="space-between mb-1">
            <label htmlFor={`feedback-${rideId}`} className="detail-label">
              Feedback (Optional)
            </label>
            <span className="char-counter text-muted small">
              {feedback.length}/1000
            </span>
          </div>
          <textarea
            id={`feedback-${rideId}`}
            className="form-textarea"
            rows={3}
            maxLength={1000}
            placeholder={`Share your experience with ${targetName || 'your chauffeur'}...`}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={submitting}
            aria-label="Feedback comments"
          />
        </div>

        <div className="rating-actions mt-3">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || rating === 0}
            aria-busy={submitting}
          >
            {submitting ? 'Submitting Rating...' : 'Submit Rating ⭐'}
          </button>
        </div>
      </form>
    </div>
  );
}
