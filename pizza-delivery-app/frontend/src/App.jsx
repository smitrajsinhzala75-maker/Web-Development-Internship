import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Register from './components/Register';
import ForgotResetPassword from './components/ForgotResetPassword';
import UserDashboard from './components/UserDashboard';
import CustomPizzaBuilder from './components/CustomPizzaBuilder';
import AdminDashboard from './components/AdminDashboard';
import DeveloperHelper from './components/DeveloperHelper';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // login, register, forgot_password, reset_password, dashboard, builder, admin_dashboard
  const [loading, setLoading] = useState(true);
  const [verifyMessage, setVerifyMessage] = useState({ type: '', text: '' });
  const [lastOrder, setLastOrder] = useState(null);

  // Parse URL on load for verification or reset tokens
  useEffect(() => {
    const handleUrlRouting = async () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      const tokenParam = params.get('token');

      if (path.includes('verify-email') && tokenParam) {
        setVerifyMessage({ type: 'info', text: 'Verifying email account...' });
        try {
          const res = await fetch(`/api/auth/verify-email?token=${tokenParam}`);
          const data = await res.json();
          if (res.ok) {
            setVerifyMessage({ type: 'success', text: data.message });
          } else {
            setVerifyMessage({ type: 'error', text: data.message });
          }
        } catch (err) {
          setVerifyMessage({ type: 'error', text: 'Connection error during email verification.' });
        }
        // Redirect to login page and strip URL params
        window.history.pushState({}, document.title, '/');
        setView('login');
      } else if (path.includes('reset-password') && tokenParam) {
        setView('reset_password');
      } else if (token) {
        // Fetch current user details if token exists
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'x-auth-token': token }
          });
          const data = await res.json();
          if (res.ok) {
            setUser(data);
            setView(data.role === 'admin' ? 'admin_dashboard' : 'dashboard');
          } else {
            // Token expired/invalid
            handleLogout();
          }
        } catch (err) {
          console.error('Session loading failed:', err);
        }
      }
      setLoading(false);
    };

    handleUrlRouting();
  }, [token]);

  const handleLoginSuccess = (userToken, loggedInUser) => {
    localStorage.setItem('token', userToken);
    setToken(userToken);
    setUser(loggedInUser);
    setView(loggedInUser.role === 'admin' ? 'admin_dashboard' : 'dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('prepopulate_pizza');
    setToken('');
    setUser(null);
    setView('login');
  };

  const handleOrderSuccess = (order) => {
    setLastOrder(order);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', animation: 'pulse-orange 1.5s infinite' }}>🍕</div>
          <p style={{ marginTop: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>Loading Slices & Co...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '100px' }}>
      <Navbar 
        user={user} 
        onLogout={handleLogout} 
        currentView={view} 
        onViewChange={setView}
      />

      {/* Render verification messages if present */}
      {view === 'login' && verifyMessage.text && (
        <div style={{ maxWidth: '450px', margin: '20px auto 0 auto', padding: '0 20px' }}>
          <div className={`alert alert-${verifyMessage.type}`}>
            {verifyMessage.text}
          </div>
        </div>
      )}

      {/* Main Switch-case Router */}
      <main>
        {view === 'login' && (
          <Login 
            onLoginSuccess={handleLoginSuccess} 
            onViewChange={setView} 
          />
        )}
        
        {view === 'register' && (
          <Register 
            onViewChange={setView} 
          />
        )}
        
        {view === 'forgot_password' && (
          <ForgotResetPassword 
            mode="forgot" 
            onViewChange={setView} 
          />
        )}
        
        {view === 'reset_password' && (
          <ForgotResetPassword 
            mode="reset" 
            onViewChange={setView} 
          />
        )}

        {view === 'dashboard' && user && (
          <UserDashboard 
            user={user} 
            token={token} 
            onViewChange={setView}
            lastNewOrder={lastOrder}
          />
        )}

        {view === 'builder' && user && (
          <CustomPizzaBuilder 
            user={user} 
            token={token} 
            onOrderSuccess={handleOrderSuccess}
            onViewChange={setView}
          />
        )}

        {view === 'admin_dashboard' && user && user.role === 'admin' && (
          <AdminDashboard 
            token={token} 
          />
        )}
      </main>

      {/* Dev helper sandbox tool bar */}
      <DeveloperHelper />
    </div>
  );
}

export default App;
