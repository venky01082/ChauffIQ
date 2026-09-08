import React, { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useAuth } from '../context/useAuth';
import { Alert } from '../components/Alert';
import { getFirebaseAuth } from '../firebase';

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

export function AuthPage() {
  const { login, register, phoneLogin, loading: authLoading, error, setError } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'phone'

  // Email / Password Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('PASSENGER');

  // Phone / SMS OTP Form States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneName, setPhoneName] = useState('');
  const [phoneRole, setPhoneRole] = useState('PASSENGER');
  const [phoneStep, setPhoneStep] = useState('PHONE'); // 'PHONE' | 'OTP'
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Validation / Feedback state
  const [localValidation, setLocalValidation] = useState('');
  const recaptchaVerifierRef = useRef(null);
  const otpInputsRef = useRef([]);

  // Clean up recaptcha on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // Ignore cleanup error
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (phoneStep === 'OTP' && otpInputsRef.current[0]) {
      otpInputsRef.current[0].focus();
    }
  }, [phoneStep]);

  // Cooldown countdown timer for resend OTP
  useEffect(() => {
    let timer = null;
    if (phoneStep === 'OTP' && cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [phoneStep, cooldown]);

  const clearErrors = () => {
    setError(null);
    setLocalValidation('');
  };

  const handleTabSwitch = (toRegister) => {
    setIsRegister(toRegister);
    clearErrors();
  };

  const handleMethodSwitch = (method) => {
    setAuthMethod(method);
    setPhoneStep('PHONE');
    setOtpDigits(['', '', '', '', '', '']);
    setConfirmationResult(null);
    clearErrors();
  };

  // -------------------------------------------------------------
  // 1. Email / Password Submission
  // -------------------------------------------------------------
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    clearErrors();

    if (!email.trim() || !password) {
      setLocalValidation('Email and password are required.');
      return;
    }

    if (password.length < 6) {
      setLocalValidation('Password must be at least 6 characters.');
      return;
    }

    try {
      if (isRegister) {
        if (!name.trim()) {
          setLocalValidation('Full name is required.');
          return;
        }
        await register({ email, password, name, phone, role });
      } else {
        await login(email, password);
      }
    } catch {
      // Handled in AuthContext
    }
  };

  // -------------------------------------------------------------
  // 2. Phone / SMS OTP Submission
  // -------------------------------------------------------------
  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    clearErrors();

    const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
    if (!cleanPhone) {
      setLocalValidation('Mobile phone number is required.');
      return;
    }

    if (!E164_REGEX.test(cleanPhone)) {
      setLocalValidation('Please enter a valid phone number in E.164 format (e.g. +919876543210 or +16505553434).');
      return;
    }

    if (isRegister && !phoneName.trim()) {
      setLocalValidation('Full name is required to create an account.');
      return;
    }

    setPhoneLoading(true);
    try {
      const auth = await getFirebaseAuth();

      // Clear any prior recaptcha instance
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // Ignore
        }
        recaptchaVerifierRef.current = null;
      }

      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });

      const confirmation = await signInWithPhoneNumber(auth, cleanPhone, recaptchaVerifierRef.current);
      setConfirmationResult(confirmation);
      setOtpDigits(['', '', '', '', '', '']);
      setCooldown(60);
      setPhoneStep('OTP');
    } catch (err) {
      console.error('Phone sign-in error:', err);
      const code = err.code || '';
      if (code === 'auth/invalid-phone-number') {
        setLocalValidation('Invalid phone number format. Please use international format: +<country><number>.');
      } else if (code === 'auth/too-many-requests') {
        setLocalValidation('Too many SMS requests sent. Please wait a few minutes before trying again.');
      } else if (code === 'auth/captcha-check-failed') {
        setLocalValidation('reCAPTCHA verification failed. Please try again.');
      } else if (code === 'auth/operation-not-allowed' || (err.message && err.message.includes('region'))) {
        setLocalValidation(
          'SMS sending to this country is restricted. Please enable this region (e.g. India +91) under Firebase Console > Authentication > Settings > SMS region policy.'
        );
      } else {
        setLocalValidation(err.message || 'Failed to send verification SMS.');
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isBusy) return;
    clearErrors();
    setPhoneLoading(true);

    try {
      const auth = await getFirebaseAuth();

      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch {
          // Ignore
        }
        recaptchaVerifierRef.current = null;
      }

      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });

      const cleanPhone = phoneNumber.trim().replace(/\s+/g, '');
      const confirmation = await signInWithPhoneNumber(auth, cleanPhone, recaptchaVerifierRef.current);
      setConfirmationResult(confirmation);
      setOtpDigits(['', '', '', '', '', '']);
      setCooldown(60);

      if (otpInputsRef.current[0]) {
        otpInputsRef.current[0].focus();
      }
    } catch (err) {
      console.error('Resend OTP error:', err);
      setLocalValidation(err.message || 'Failed to resend SMS code. Please try again.');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleOtpDigitChange = (index, value) => {
    clearErrors();
    const digit = value.replace(/\D/g, '').slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    // Auto-advance to the next input box if a digit was entered
    if (digit && index < 5 && otpInputsRef.current[index + 1]) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0 && otpInputsRef.current[index - 1]) {
        const updated = [...otpDigits];
        updated[index - 1] = '';
        setOtpDigits(updated);
        otpInputsRef.current[index - 1].focus();
      } else {
        const updated = [...otpDigits];
        updated[index] = '';
        setOtpDigits(updated);
      }
    } else if (e.key === 'ArrowLeft' && index > 0 && otpInputsRef.current[index - 1]) {
      otpInputsRef.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < 5 && otpInputsRef.current[index + 1]) {
      otpInputsRef.current[index + 1].focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    clearErrors();
    const pasteData = e.clipboardData ? e.clipboardData.getData('text') : '';
    const digits = pasteData.replace(/\D/g, '').slice(0, 6);
    if (!digits) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = digits[i] || '';
    }
    setOtpDigits(updated);

    const nextIndex = Math.min(digits.length, 5);
    if (otpInputsRef.current[nextIndex]) {
      otpInputsRef.current[nextIndex].focus();
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    clearErrors();

    const cleanOtp = otpDigits.join('');
    if (!cleanOtp || cleanOtp.length < 6) {
      setLocalValidation('Please enter the 6-digit verification code.');
      return;
    }

    if (!confirmationResult) {
      setLocalValidation('Session expired. Please request a new verification code.');
      setPhoneStep('PHONE');
      return;
    }

    setPhoneLoading(true);
    try {
      const userCredential = await confirmationResult.confirm(cleanOtp);
      const idToken = await userCredential.user.getIdToken();

      await phoneLogin({
        idToken,
        name: phoneName.trim() || userCredential.user.displayName || 'Passenger',
        role: phoneRole || 'PASSENGER',
      });
    } catch (err) {
      console.error('OTP confirmation error:', err);
      const code = err.code || '';
      if (code === 'auth/invalid-verification-code') {
        setLocalValidation('Incorrect SMS code. Please check the code and try again.');
      } else if (code === 'auth/code-expired') {
        setLocalValidation('The verification code has expired. Please request a new code.');
      } else {
        setLocalValidation(err.message || 'Verification failed. Please try again.');
      }
    } finally {
      setPhoneLoading(false);
    }
  };

  const isBusy = authLoading || phoneLoading;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isRegister ? 'Create ChauffIQ Account' : 'Welcome to ChauffIQ'}</h2>
          <p>{isRegister ? 'Sign up to start booking or driving' : 'Sign in to access your dashboard'}</p>
        </div>

        {/* Tab 1: Sign In vs Register */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
            onClick={() => handleTabSwitch(false)}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab ${isRegister ? 'active' : ''}`}
            onClick={() => handleTabSwitch(true)}
          >
            Register
          </button>
        </div>

        {/* Tab 2: Auth Method Toggle */}
        <div className="auth-method-switcher">
          <button
            type="button"
            className={`method-pill ${authMethod === 'email' ? 'active' : ''}`}
            onClick={() => handleMethodSwitch('email')}
          >
            ✉️ Email & Password
          </button>
          <button
            type="button"
            className={`method-pill ${authMethod === 'phone' ? 'active' : ''}`}
            onClick={() => handleMethodSwitch('phone')}
          >
            📱 Phone SMS OTP
          </button>
        </div>

        <Alert
          type="error"
          message={localValidation || error}
          onClose={clearErrors}
        />

        {/* ============================================================ */}
        {/* OPTION A: Email & Password Form (Preserved 100%)              */}
        {/* ============================================================ */}
        {authMethod === 'email' && (
          <form onSubmit={handleEmailSubmit} className="auth-form">
            {isRegister && (
              <div className="form-group">
                <label htmlFor="auth-name">Full Name *</label>
                <input
                  id="auth-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Email Address *</label>
              <input
                id="auth-email"
                type="email"
                className="form-input"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password *</label>
              <input
                id="auth-password"
                type="password"
                className="form-input"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isRegister && (
              <>
                <div className="form-group">
                  <label htmlFor="auth-phone">Phone Number (Optional)</label>
                  <input
                    id="auth-phone"
                    type="tel"
                    className="form-input"
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="auth-role">Account Type</label>
                  <select
                    id="auth-role"
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    <option value="PASSENGER">Passenger (Book Rides)</option>
                    <option value="DRIVER">Driver (Provide Rides)</option>
                  </select>
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={isBusy}>
              {isBusy ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        )}

        {/* ============================================================ */}
        {/* OPTION B: Firebase Native Phone SMS OTP Flow (Real SMS OTP)  */}
        {/* ============================================================ */}
        {authMethod === 'phone' && (
          <div className="auth-form">
            {phoneStep === 'PHONE' ? (
              <form onSubmit={handleSendOtp}>
                {isRegister && (
                  <>
                    <div className="form-group">
                      <label htmlFor="phone-name">Full Name *</label>
                      <input
                        id="phone-name"
                        type="text"
                        className="form-input"
                        placeholder="e.g. Alex Morgan"
                        value={phoneName}
                        onChange={(e) => setPhoneName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone-role">Account Type</label>
                      <select
                        id="phone-role"
                        className="form-select"
                        value={phoneRole}
                        onChange={(e) => setPhoneRole(e.target.value)}
                      >
                        <option value="PASSENGER">Passenger (Book Rides)</option>
                        <option value="DRIVER">Driver (Provide Rides)</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="phone-number">Enter your mobile number *</label>
                  <input
                    id="phone-number"
                    type="tel"
                    className="form-input"
                    placeholder="+91 9876543210"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
                    Enter in international E.164 format (e.g. +91 9876543210 or +1 6505553434)
                  </small>
                </div>

                <div id="recaptcha-container"></div>

                <button type="submit" className="btn btn-primary btn-block" disabled={isBusy}>
                  {phoneLoading ? 'Sending SMS OTP...' : 'SEND OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div className="otp-box">
                  <p className="otp-info">
                    SMS sent to <span className="otp-phone-highlight">{phoneNumber}</span>
                    <br />
                    Enter OTP
                  </p>

                  <div className="otp-boxes-grid" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => {
                          otpInputsRef.current[index] = el;
                        }}
                        id={`otp-box-${index}`}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        className="otp-digit-box"
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        disabled={isBusy}
                        aria-label={`Digit ${index + 1} of 6`}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>

                  <div className="otp-actions-bar">
                    {cooldown > 0 ? (
                      <span className="otp-cooldown-text">
                        Resend OTP in {cooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="otp-resend-btn"
                        onClick={handleResendOtp}
                        disabled={isBusy}
                      >
                        Resend OTP
                      </button>
                    )}

                    <button
                      type="button"
                      className="otp-change-btn"
                      onClick={() => {
                        setPhoneStep('PHONE');
                        setOtpDigits(['', '', '', '', '', '']);
                        clearErrors();
                      }}
                      disabled={isBusy}
                    >
                      Change Mobile Number
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={isBusy || otpDigits.join('').length < 6}
                >
                  {phoneLoading ? 'Verifying...' : 'VERIFY & CONTINUE'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
