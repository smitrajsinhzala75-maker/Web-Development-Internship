import React from 'react';

const Navbar = ({ user, onLogout, currentView, onViewChange }) => {
  return (
    <nav className="navbar">
      <div className="logo" style={{ cursor: 'pointer' }} onClick={() => user && onViewChange('dashboard')}>
        🍕 Slices & Co.
      </div>
      
      {user ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontWeight: 600 }}>{user.name}</span>
            <span className={`badge ${user.role === 'admin' ? 'badge-admin' : 'badge-customer'}`}>
              {user.role}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {user.role === 'admin' ? (
              <button 
                onClick={() => onViewChange('admin_dashboard')} 
                className={`btn ${currentView === 'admin_dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                Admin Panel
              </button>
            ) : (
              <button 
                onClick={() => onViewChange('builder')} 
                className={`btn ${currentView === 'builder' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '0.9rem' }}
              >
                Custom Pizza Builder 🍕
              </button>
            )}

            <button 
              onClick={onLogout} 
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.9rem', borderColor: 'rgba(255, 51, 51, 0.3)', color: '#ff5555' }}
            >
              Logout
            </button>
          </div>
        </div>
      ) : (
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
          Premium Pizza Atelier
        </div>
      )}
    </nav>
  );
};

export default Navbar;
