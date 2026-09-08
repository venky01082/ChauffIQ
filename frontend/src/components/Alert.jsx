import React from 'react';

export function Alert({ type = 'error', message, onClose }) {
  if (!message) return null;

  return (
    <div className={`alert-box ${type}`}>
      <div className="alert-content">
        <span>{message}</span>
        {onClose && (
          <button type="button" className="alert-close" onClick={onClose}>
            ×
          </button>
        )}
      </div>
    </div>
  );
}
