import React, { useState, useEffect } from 'react';

const ForgotResetPassword = ({ mode, onViewChange }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  // Extract token from URL if in reset mode
  useEffect(() => {
    if (mode === 'reset') {
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');
      if (tokenParam) {
        setToken(tokenParam);
      } else {
        setError('Reset token is missing from the URL. Please request a new link.');
      }
    }
  }, [mode]);

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setResetUrl('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error requesting reset link');
      }

      setSuccess(data.message);
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error resetting password');
      }

      setSuccess('Your password has been reset successfully! Redirecting to login...');
      setTimeout(() => {
        // Clean URL params
        window.history.pushState({}, document.title, window.location.pathname);
        onViewChange('login');
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'forgot') {
    return (
      <div className="auth-container">
        <div className="glass-card auth-card">
          <h2 className="auth-title">Reset Password</h2>
          <p className="auth-subtitle">We will email you a password recovery link</p>

          {error && <div className="alert alert-error">{error}</div>}
          {success && (
            <div className="alert alert-success">
              {success}
              {resetUrl && (
                <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dev mode link:</p>
                  <a href={resetUrl} style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', wordBreak: 'break-all' }}>
                    Click to Open Password Reset Form
                  </a>
                </div>
              )}
            </div>
          )}

          {!success && (
            <form onSubmit={handleForgotSubmit}>
              <div style={{ marginBottom: '20px' }}>
                <label htmlFor="forgot-email">Email Address</label>
                <input
                  type="email"
                  id="forgot-email"
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                disabled={loading}
              >
                {loading ? 'Sending link...' : 'Send Recovery Link'}
              </button>
            </form>
          )}

          <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Remembered your credentials?{' '}
            <span 
              onClick={() => onViewChange('login')} 
              style={{ color: 'var(--accent-orange)', cursor: 'pointer', fontWeight: 600 }}
            >
              Sign In
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Reset Mode
  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        <h2 className="auth-title">New Password</h2>
        <p className="auth-subtitle">Enter a new secure password below</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {!success && (
          <form onSubmit={handleResetSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="new-password">New Password</label>
              <input
                type="password"
                id="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={!token}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                type="password"
                id="confirm-password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={!token}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              disabled={loading || !token}
            >
              {loading ? 'Updating Password...' : 'Save & Login'}
            </button>
          </form>
        )}

        <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Back to{' '}
          <span 
            onClick={() => onViewChange('login')} 
            style={{ color: 'var(--accent-orange)', cursor: 'pointer', fontWeight: 600 }}
          >
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
};

export default ForgotResetPassword;
