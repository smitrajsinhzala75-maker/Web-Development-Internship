import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const PREMADE_PIZZAS = [
  {
    name: 'Classic Margherita',
    description: 'Thin Crust, Classic Marinara, Mozzarella, and double Onions & Tomatoes.',
    base: 'Thin Crust',
    sauce: 'Classic Marinara',
    cheese: 'Mozzarella',
    veggies: ['Onions', 'Tomatoes'],
    meats: [],
    price: 180,
    emoji: '🧀'
  },
  {
    name: 'Pepperoni Feast',
    description: 'Cheese Burst base, Barbecue Sauce, Mozzarella, Pepperoni, and Smoked Bacon.',
    base: 'Cheese Burst',
    sauce: 'Barbecue Sauce',
    cheese: 'Mozzarella',
    veggies: [],
    meats: ['Pepperoni', 'Smoked Bacon'],
    price: 330,
    emoji: '🍕'
  },
  {
    name: 'Veggie Supreme',
    description: 'Neapolitan Crust, Basil Pesto, Parmesan, Bell Peppers, Mushrooms, and Sweet Corn.',
    base: 'Neapolitan Crust',
    sauce: 'Basil Pesto',
    cheese: 'Parmesan',
    veggies: ['Bell Peppers', 'Mushrooms', 'Sweet Corn'],
    meats: [],
    price: 270,
    emoji: '🥦'
  },
  {
    name: 'Spicy Chicken Delight',
    description: 'Thick Crust, Spicy Schezwan, Cheddar, Grilled Chicken, Onions, and Jalapenos.',
    base: 'Thick Crust',
    sauce: 'Spicy Schezwan',
    cheese: 'Cheddar',
    veggies: ['Onions', 'Jalapenos'],
    meats: ['Grilled Chicken'],
    price: 290,
    emoji: '🌶️'
  }
];

const UserDashboard = ({ user, token, onViewChange, lastNewOrder }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socket, setSocket] = useState(null);

  // Fetch past and current orders
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Establish WebSocket Connection
    const newSocket = io(window.location.origin || 'http://localhost:5000');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // Listen for real-time order status updates from Socket.io
  useEffect(() => {
    if (!socket) return;

    // Listen to generic order status updates
    socket.on('orderUpdate', (allOrders) => {
      // Filter for current user's orders
      const userOrders = allOrders.filter(o => o.userId === user.id);
      setOrders(userOrders);
    });

    // Also register specific listener for each of the user's active orders
    orders.forEach(order => {
      if (order.status !== 'Sent to delivery') {
        socket.on(`orderStatus_${order._id || order.id}`, ({ orderId, status }) => {
          setOrders(prevOrders => 
            prevOrders.map(o => (o._id === orderId || o.id === orderId) ? { ...o, status } : o)
          );
        });
      }
    });

    return () => {
      socket.off('orderUpdate');
      orders.forEach(order => {
        socket.off(`orderStatus_${order._id || order.id}`);
      });
    };
  }, [socket, orders, user.id]);

  // Order a premade pizza by opening the builder and pre-populating selections
  const handleOrderPremade = async (premade) => {
    // We redirect to builder with query params or state. For simplicity, we save it to localStorage
    // and trigger the builder view, which will load it from localStorage.
    localStorage.setItem('prepopulate_pizza', JSON.stringify(premade));
    onViewChange('builder');
  };

  const activeOrders = orders.filter(o => o.status !== 'Sent to delivery' && o.paymentStatus === 'paid');
  const pastOrders = orders.filter(o => o.status === 'Sent to delivery' || o.paymentStatus !== 'paid');

  // Helper to map status to step percentage
  const getStatusPercent = (status) => {
    if (status === 'Order Received') return '0%';
    if (status === 'In the kitchen') return '50%';
    if (status === 'Sent to delivery') return '100%';
    return '0%';
  };

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Welcome, {user.name}! 🍕</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Grab a fresh custom pizza or pick a gourmet classic.</p>
        </div>
        <button 
          onClick={() => {
            localStorage.removeItem('prepopulate_pizza');
            onViewChange('builder');
          }} 
          className="btn btn-primary"
        >
          Create Custom Pizza 🛠️
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* 1. Real-Time Order Tracking for Active Paid Orders */}
      {activeOrders.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>⚡ Active Orders Tracking</span>
            <span className="badge badge-admin" style={{ fontSize: '0.65rem' }}>Live updates</span>
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {activeOrders.map(order => (
              <div key={order._id || order.id} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
                  <div>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Order #{order._id?.slice(-6) || order.id?.slice(-6)}</span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '12px', fontSize: '0.85rem' }}>
                      Placing time: {new Date(order.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div style={{ fontWeight: 'bold', color: 'var(--accent-orange)' }}>
                    Total: ₹{order.totalAmount}
                  </div>
                </div>

                {/* Status Pipeline tracker */}
                <div className="tracker-container">
                  <div 
                    className="tracker-progress-bar" 
                    style={{ width: `calc(${getStatusPercent(order.status)} * 0.8)` }}
                  ></div>
                  
                  <div className={`tracker-step ${order.status === 'Order Received' || order.status === 'In the kitchen' || order.status === 'Sent to delivery' ? 'completed' : ''} ${order.status === 'Order Received' ? 'active' : ''}`}>
                    <div className="tracker-icon">📥</div>
                    <div className="tracker-label">Order Received</div>
                  </div>

                  <div className={`tracker-step ${order.status === 'In the kitchen' || order.status === 'Sent to delivery' ? 'completed' : ''} ${order.status === 'In the kitchen' ? 'active' : ''}`}>
                    <div className="tracker-icon">👨‍🍳</div>
                    <div className="tracker-label">In the Kitchen</div>
                  </div>

                  <div className={`tracker-step ${order.status === 'Sent to delivery' ? 'completed' : ''} ${order.status === 'Sent to delivery' ? 'active' : ''}`}>
                    <div className="tracker-icon">🛵</div>
                    <div className="tracker-label">Out for Delivery</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* 2. Available Pizza Varieties Dashboard */}
        <div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '20px' }}>Chef's Handcrafted Menu</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
            {PREMADE_PIZZAS.map((pizza, index) => (
              <div key={index} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1.8rem' }}>{pizza.emoji}</span>
                    <span style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--accent-orange)' }}>₹{pizza.price}</span>
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>{pizza.name}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4', marginBottom: '16px' }}>
                    {pizza.description}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => handleOrderPremade(pizza)} 
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    Customize & Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Order History Sidebar */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            Order History
          </h2>
          
          {loading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading order history...</p>
          ) : pastOrders.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              No past orders found. Create your first pizza to get cooking!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '400px', overflowY: 'auto' }}>
              {pastOrders.map(order => (
                <div 
                  key={order._id || order.id} 
                  style={{ 
                    padding: '12px', 
                    borderRadius: '8px', 
                    background: 'rgba(255,255,255,0.02)', 
                    border: '1px solid var(--border-glass)' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      Order #{order._id?.slice(-6) || order.id?.slice(-6)}
                    </span>
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--accent-orange)' }}>
                      ₹{order.totalAmount}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${
                      order.paymentStatus === 'paid' ? 'badge-admin' : 'badge-customer'
                    }`} style={{ fontSize: '0.65rem' }}>
                      {order.paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
                    </span>
                    <span style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: 600, 
                      color: order.status === 'Sent to delivery' ? 'var(--accent-green)' : 'var(--accent-gold)' 
                    }}>
                      {order.status}
                    </span>
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

export default UserDashboard;
