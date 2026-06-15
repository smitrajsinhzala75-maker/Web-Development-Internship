import React, { useState } from 'react';

const Register = ({ onViewChange }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('customer');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setVerifyUrl('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setSuccess(data.message);
      if (data.verifyUrl) {
        setVerifyUrl(data.verifyUrl);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-subtitle">Join Slices & Co. Pizza Club</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && (
          <div className="alert alert-success">
            {success}
            {verifyUrl && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Dev mode link:</p>
                <a href={verifyUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', wordBreak: 'break-all' }}>
                  Click to Auto-Verify Email
                </a>
              </div>
            )}
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="reg-name">Full Name</label>
              <input
                type="text"
                id="reg-name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="reg-email">Email Address</label>
              <input
                type="email"
                id="reg-email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="reg-password">Password</label>
              <input
                type="password"
                id="reg-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="reg-role">Account Type (For Testing)</label>
              <select 
                id="reg-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="customer">Customer (Order Pizza)</option>
                <option value="admin">Admin (Manage Stock & Orders)</option>
              </select>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                *Note: The first registered user overall will become Admin automatically.
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        )}

        <p style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <span 
            onClick={() => onViewChange('login')} 
            style={{ color: 'var(--accent-orange)', cursor: 'pointer', fontWeight: 600 }}
          >
            Sign in instead
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
