import React, { useState, useEffect } from 'react';

const DeveloperHelper = () => {
  const [emails, setEmails] = useState([]);
  const [status, setStatus] = useState({ isMockDb: false, emailCount: 0 });
  const [collapsed, setCollapsed] = useState(true);

  const fetchData = async () => {
    try {
      // Fetch status
      const resStatus = await fetch('/api/dev/status');
      if (resStatus.ok) {
        const dataStatus = await resStatus.json();
        setStatus(dataStatus);
      }

      // Fetch emails
      const resEmails = await fetch('/api/dev/emails');
      if (resEmails.ok) {
        const dataEmails = await resEmails.json();
        setEmails(dataEmails);
      }
    } catch (err) {
      // Backend might not be running yet
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 4000); // poll every 4 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="dev-helper"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: collapsed ? '300px' : '450px',
        zIndex: 9999,
        background: 'rgba(10, 25, 47, 0.95)',
        border: '1px solid rgba(0, 242, 254, 0.4)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden'
      }}
    >
      <div 
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '12px 16px',
          background: 'rgba(0, 242, 254, 0.15)',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontWeight: 700,
          color: '#00f2fe',
          fontSize: '0.85rem',
          letterSpacing: '0.5px'
        }}
      >
        <span>🛠️ DEV SANDBOX TOOLBAR</span>
        <span>{collapsed ? '▲ Show' : '▼ Hide'}</span>
      </div>

      {!collapsed && (
        <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto', fontSize: '0.85rem' }}>
          {/* Status Section */}
          <div style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Database:</span>
              <span style={{ fontWeight: 'bold', color: status.isMockDb ? 'var(--accent-gold)' : 'var(--accent-green)' }}>
                {status.isMockDb ? '📂 Fallback JSON DB' : '📡 Connected MongoDB'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
              {status.isMockDb 
                ? 'Using local JSON file for database (backend/mock_database.json). Run MongoDB locally to swap to Mongoose.'
                : 'Connected to live MongoDB server successfully.'
              }
            </p>
          </div>

          {/* Emails Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#00f2fe' }}>✉️ Sent Email Logger ({emails.length})</span>
              <button 
                onClick={fetchData} 
                className="btn btn-secondary" 
                style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
              >
                Refresh
              </button>
            </div>

            {emails.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px 0' }}>
                No emails triggered yet. Try registering a user, requesting a password reset, or causing stock to go below 20.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {emails.slice().reverse().map((email) => {
                  // Extract links using regex
                  const linkRegex = /https?:\/\/[^\s"']+/g;
                  const links = email.text.match(linkRegex) || [];

                  return (
                    <div 
                      key={email.id}
                      style={{ 
                        background: 'rgba(255,255,255,0.03)', 
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        padding: '10px'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '4px' }}>
                        To: {email.to}
                      </div>
                      <div style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: '0.8rem', marginBottom: '6px' }}>
                        Subject: {email.subject}
                      </div>
                      
                      {links.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                          {links.map((link, idx) => (
                            <a 
                              key={idx}
                              href={link} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn btn-primary"
                              style={{ 
                                padding: '6px 10px', 
                                fontSize: '0.75rem', 
                                display: 'block', 
                                textAlign: 'center',
                                textDecoration: 'none',
                                background: 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                                color: '#000',
                                fontWeight: 700,
                                boxShadow: 'none'
                              }}
                            >
                              🚀 Click Action Link
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeveloperHelper;
