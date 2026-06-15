import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const AdminDashboard = ({ token }) => {
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [socket, setSocket] = useState(null);

  // States for stock editing modal/inputs
  const [editingItem, setEditingItem] = useState(null);
  const [editStockValue, setEditStockValue] = useState(0);
  const [editPriceValue, setEditPriceValue] = useState(0);

  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory', {
        headers: { 'x-auth-token': token }
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders', {
        headers: { 'x-auth-token': token }
      });
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchOrders();

    // Setup Socket connection
    const newSocket = io(window.location.origin || 'http://localhost:5000');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // Socket updates listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('orderUpdate', (updatedOrders) => {
      setOrders(updatedOrders);
    });

    socket.on('inventoryUpdate', (updatedInventory) => {
      setInventory(updatedInventory);
    });

    return () => {
      socket.off('orderUpdate');
      socket.off('inventoryUpdate');
    };
  }, [socket]);

  // Update order status trigger
  const handleUpdateStatus = async (orderId, newStatus) => {
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update order status');
      
      setSuccess(`Order status updated to "${newStatus}"!`);
      // Update local state orders array
      setOrders(prev => prev.map(o => (o._id === orderId || o.id === orderId) ? { ...o, status: newStatus } : o));
    } catch (err) {
      setError(err.message);
    }
  };

  // Trigger manual stock update
  const handleSaveStock = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!editingItem) return;

    try {
      const response = await fetch('/api/inventory/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          name: editingItem.name,
          stock: editStockValue,
          price: editPriceValue
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update stock');

      setSuccess(`Successfully updated stock for ${editingItem.name}!`);
      setEditingItem(null);
      // Fetch fresh inventory data
      fetchInventory();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditStockValue(item.stock);
    setEditPriceValue(item.price);
  };

  // Helper to color stock indicator
  const getStockFillClass = (stock) => {
    if (stock < 20) return 'critical';
    if (stock < 35) return 'warning';
    return 'normal';
  };

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Admin Operations Panel</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage ingredient inventory and supervise real-time order dispatch pipelines.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Stock Edit Popup / Inline Form */}
      {editingItem && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
            <h3 style={{ fontSize: '1.3rem', marginBottom: '16px' }}>Adjust Inventory: {editingItem.name}</h3>
            
            <form onSubmit={handleSaveStock}>
              <div style={{ marginBottom: '16px' }}>
                <label>Stock Count</label>
                <input 
                  type="number" 
                  value={editStockValue} 
                  onChange={(e) => setEditStockValue(e.target.value)} 
                  required 
                  min={0}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label>Unit Price (₹)</label>
                <input 
                  type="number" 
                  value={editPriceValue} 
                  onChange={(e) => setEditPriceValue(e.target.value)} 
                  required 
                  min={0}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* 1. Inventory Management Section */}
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '20px' }}>🍕 Pizza Ingredient Stocks</h2>
          
          {loadingInventory ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading inventory data...</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {inventory.map(item => (
                <div key={item._id || item.id} className="glass-card" style={{ position: 'relative', padding: '16px' }}>
                  {item.stock < 20 && (
                    <span 
                      className="badge" 
                      style={{ 
                        position: 'absolute', 
                        top: '12px', 
                        right: '12px', 
                        background: 'rgba(255, 51, 51, 0.15)', 
                        color: 'var(--accent-red)',
                        border: '1px solid rgba(255, 51, 51, 0.3)',
                        fontSize: '0.65rem'
                      }}
                    >
                      🚨 Low Stock (&lt;20)
                    </span>
                  )}
                  
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
                    {item.category}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: '4px 0 8px 0' }}>{item.name}</h3>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-orange)' }}>₹{item.price}</span>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Stock: {item.stock} units</span>
                  </div>

                  {/* Progress bar */}
                  <div className="stock-bar">
                    <div 
                      className={`stock-fill ${getStockFillClass(item.stock)}`}
                      style={{ width: `${Math.min(100, (item.stock / 100) * 100)}%` }}
                    ></div>
                  </div>

                  <button 
                    onClick={() => handleStartEdit(item)}
                    className="btn btn-secondary"
                    style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', marginTop: '14px' }}
                  >
                    Adjust Stock 🛠️
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. Order Dispatch Supervisor Section */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            📥 Order Dispatch Queue ({orders.filter(o => o.paymentStatus === 'paid').length})
          </h2>

          {loadingOrders ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading incoming orders...</p>
          ) : orders.filter(o => o.paymentStatus === 'paid').length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px 0' }}>
              No active paid orders in the queue.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '600px', overflowY: 'auto' }}>
              {orders.filter(o => o.paymentStatus === 'paid').map(order => (
                <div 
                  key={order._id || order.id}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '10px',
                    padding: '14px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                      Order #{order._id?.slice(-6) || order.id?.slice(-6)}
                    </span>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: order.status === 'Sent to delivery' ? 'var(--accent-green)' : 'var(--accent-gold)' 
                    }}>
                      {order.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    <strong>Email:</strong> {order.userEmail} <br />
                    <strong>Time:</strong> {new Date(order.createdAt).toLocaleString()}
                  </div>

                  {/* Items summary */}
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '6px', marginBottom: '12px', fontSize: '0.8rem' }}>
                    {order.items.map((item, idx) => (
                      <div key={idx}>
                        <strong>Base:</strong> {item.base.name} <br />
                        <strong>Sauce:</strong> {item.sauce.name} <br />
                        <strong>Cheese:</strong> {item.cheese.name} <br />
                        {item.veggies.length > 0 && (
                          <><strong>Veggies:</strong> {item.veggies.map(v => v.name).join(', ')}<br /></>
                        )}
                        {item.meats.length > 0 && (
                          <><strong>Meats:</strong> {item.meats.map(m => m.name).join(', ')}<br /></>
                        )}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Total Amount:</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-orange)' }}>₹{order.totalAmount}</span>
                  </div>

                  {/* Actions buttons based on current status */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {order.status === 'Order Received' && (
                      <button 
                        onClick={() => handleUpdateStatus(order._id || order.id, 'In the kitchen')} 
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        👨‍🍳 Start Preparing
                      </button>
                    )}
                    {order.status === 'In the kitchen' && (
                      <button 
                        onClick={() => handleUpdateStatus(order._id || order.id, 'Sent to delivery')} 
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '6px 12px', fontSize: '0.8rem', background: 'linear-gradient(135deg, var(--accent-green) 0%, #00c853 100%)', boxShadow: 'none' }}
                      >
                        🛵 Dispatch Order
                      </button>
                    )}
                    {order.status === 'Sent to delivery' && (
                      <div style={{ textAlign: 'center', width: '100%', fontSize: '0.8rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                        ✓ Order Delivered
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
