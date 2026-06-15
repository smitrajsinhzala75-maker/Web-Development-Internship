import React, { useState, useEffect } from 'react';

const CustomPizzaBuilder = ({ user, token, onOrderSuccess, onViewChange }) => {
  const [inventory, setInventory] = useState([]);
  const [step, setStep] = useState(1);
  
  // Custom pizza state selection
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedSauce, setSelectedSauce] = useState(null);
  const [selectedCheese, setSelectedCheese] = useState(null);
  const [selectedVeggies, setSelectedVeggies] = useState([]);
  const [selectedMeats, setSelectedMeats] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch current stock and options on mount
  const fetchInventory = async () => {
    try {
      const response = await fetch('/api/inventory', {
        headers: { 'x-auth-token': token }
      });
      if (!response.ok) throw new Error('Failed to load ingredient inventory');
      const data = await response.json();
      setInventory(data);

      // Auto select first available items if not set
      const bases = data.filter(i => i.category === 'base' && i.stock > 0);
      const sauces = data.filter(i => i.category === 'sauce' && i.stock > 0);
      const cheeses = data.filter(i => i.category === 'cheese' && i.stock > 0);
      
      if (bases.length > 0 && !selectedBase) setSelectedBase(bases[0]);
      if (sauces.length > 0 && !selectedSauce) setSelectedSauce(sauces[0]);
      if (cheeses.length > 0 && !selectedCheese) setSelectedCheese(cheeses[0]);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // Filter items by category
  const bases = inventory.filter(item => item.category === 'base');
  const sauces = inventory.filter(item => item.category === 'sauce');
  const cheeses = inventory.filter(item => item.category === 'cheese');
  const veggies = inventory.filter(item => item.category === 'veggies');
  const meats = inventory.filter(item => item.category === 'meat');

  // Compute live price
  const calculateTotal = () => {
    let total = 0;
    if (selectedBase) total += selectedBase.price;
    if (selectedSauce) total += selectedSauce.price;
    if (selectedCheese) total += selectedCheese.price;
    selectedVeggies.forEach(v => total += v.price);
    selectedMeats.forEach(m => total += m.price);
    return total;
  };

  const handleVeggieToggle = (veg) => {
    if (selectedVeggies.find(v => v.name === veg.name)) {
      setSelectedVeggies(selectedVeggies.filter(v => v.name !== veg.name));
    } else {
      setSelectedVeggies([...selectedVeggies, veg]);
    }
  };

  const handleMeatToggle = (meat) => {
    if (selectedMeats.find(m => m.name === meat.name)) {
      setSelectedMeats(selectedMeats.filter(m => m.name !== meat.name));
    } else {
      setSelectedMeats([...selectedMeats, meat]);
    }
  };

  // Checkout and Pay flow
  const handlePayment = async () => {
    if (!selectedBase || !selectedSauce || !selectedCheese) {
      setError('Please ensure base, sauce, and cheese are selected.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const pizzaItem = {
        base: { name: selectedBase.name, price: selectedBase.price },
        sauce: { name: selectedSauce.name, price: selectedSauce.price },
        cheese: { name: selectedCheese.name, price: selectedCheese.price },
        veggies: selectedVeggies.map(v => ({ name: v.name, price: v.price })),
        meats: selectedMeats.map(m => ({ name: m.name, price: m.price })),
        price: calculateTotal()
      };

      // Create Order endpoint call
      const orderRes = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify({
          items: [pizzaItem],
          totalAmount: pizzaItem.price
        })
      });

      const orderData = await orderRes.json();

      if (!orderRes.ok) {
        throw new Error(orderData.message || 'Failed to initialize order');
      }

      const { orderId, razorpayOrderId, amount, keyId, isMockPayment } = orderData;

      if (isMockPayment) {
        // Mock payment flow
        console.log('💳 DEV MODE: Simulating Razorpay checkout success...');
        const verifyRes = await fetch('/api/orders/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
          },
          body: JSON.stringify({
            orderId,
            razorpayOrderId,
            isMockSuccess: true
          })
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.message || 'Mock payment confirmation failed');

        onOrderSuccess(verifyData.order);
        onViewChange('dashboard');
      } else {
        // Real Razorpay modal initialization
        const options = {
          key: keyId,
          amount: amount * 100,
          currency: 'INR',
          name: 'Slices & Co. Pizza',
          description: 'Custom Handcrafted Pizza Order',
          order_id: razorpayOrderId,
          handler: async function (response) {
            try {
              const verifyRes = await fetch('/api/orders/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-auth-token': token
                },
                body: JSON.stringify({
                  orderId,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpaySignature: response.razorpay_signature
                })
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.message || 'Payment verification failed');
              
              onOrderSuccess(verifyData.order);
              onViewChange('dashboard');
            } catch (err) {
              setError(err.message);
            }
          },
          prefill: {
            name: user.name,
            email: user.email,
          },
          theme: {
            color: '#ff5e00',
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Pizza Atelier</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Design your custom culinary masterpiece</p>
        </div>
        <button onClick={() => onViewChange('dashboard')} className="btn btn-secondary">
          Back to Dashboard
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="dashboard-grid">
        <div className="glass-card">
          {/* Step dots */}
          <div className="step-indicator">
            <div className={`step-dot ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>1</div>
            <div className={`step-dot ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>2</div>
            <div className={`step-dot ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}>3</div>
            <div className={`step-dot ${step === 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}>4</div>
            <div className={`step-dot ${step === 5 ? 'active' : ''} ${step > 5 ? 'completed' : ''}`}>5</div>
          </div>

          <div style={{ minHeight: '260px' }}>
            {/* STEP 1: PIZZA BASES */}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 1: Choose Your Pizza Base</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Select from our handcrafted range of dough styles</p>
                <div className="builder-options">
                  {bases.map(item => (
                    <div 
                      key={item._id || item.id}
                      className={`option-card ${selectedBase?.name === item.name ? 'selected' : ''} ${item.stock < 1 ? 'btn-disabled' : ''}`}
                      onClick={() => item.stock > 0 && setSelectedBase(item)}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🥯</div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: 'var(--accent-orange)', marginTop: '4px', fontWeight: 700 }}>₹{item.price}</div>
                      {item.stock < 1 ? (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)', fontWeight: 'bold' }}>SOLD OUT</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stock: {item.stock}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 2: SAUCES */}
            {step === 2 && (
              <div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 2: Choose Your Sauce</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Add the perfect moisture and spiced layer</p>
                <div className="builder-options">
                  {sauces.map(item => (
                    <div 
                      key={item._id || item.id}
                      className={`option-card ${selectedSauce?.name === item.name ? 'selected' : ''} ${item.stock < 1 ? 'btn-disabled' : ''}`}
                      onClick={() => item.stock > 0 && setSelectedSauce(item)}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🍅</div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: 'var(--accent-orange)', marginTop: '4px', fontWeight: 700 }}>₹{item.price}</div>
                      {item.stock < 1 ? (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)', fontWeight: 'bold' }}>SOLD OUT</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stock: {item.stock}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 3: CHEESE TYPES */}
            {step === 3 && (
              <div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 3: Select Cheese Type</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>No pizza is complete without gooey, melted goodness</p>
                <div className="builder-options">
                  {cheeses.map(item => (
                    <div 
                      key={item._id || item.id}
                      className={`option-card ${selectedCheese?.name === item.name ? 'selected' : ''} ${item.stock < 1 ? 'btn-disabled' : ''}`}
                      onClick={() => item.stock > 0 && setSelectedCheese(item)}
                    >
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🧀</div>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ color: 'var(--accent-orange)', marginTop: '4px', fontWeight: 700 }}>₹{item.price}</div>
                      {item.stock < 1 ? (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)', fontWeight: 'bold' }}>SOLD OUT</span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stock: {item.stock}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP 4: VEGGIES */}
            {step === 4 && (
              <div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 4: Opt Veggies (Multiple Choice)</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Load up on healthy, crunchy garden toppings</p>
                <div className="builder-options">
                  {veggies.map(item => {
                    const isSelected = selectedVeggies.some(v => v.name === item.name);
                    return (
                      <div 
                        key={item._id || item.id}
                        className={`option-card ${isSelected ? 'selected' : ''} ${item.stock < 1 ? 'btn-disabled' : ''}`}
                        onClick={() => item.stock > 0 && handleVeggieToggle(item)}
                      >
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🥗</div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ color: 'var(--accent-orange)', marginTop: '4px', fontWeight: 700 }}>₹{item.price}</div>
                        {item.stock < 1 ? (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)', fontWeight: 'bold' }}>SOLD OUT</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stock: {item.stock}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 5: MEATS */}
            {step === 5 && (
              <div>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Step 5: Opt Meats (Multiple Choice)</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Satisify your protein cravings</p>
                <div className="builder-options">
                  {meats.map(item => {
                    const isSelected = selectedMeats.some(m => m.name === item.name);
                    return (
                      <div 
                        key={item._id || item.id}
                        className={`option-card ${isSelected ? 'selected' : ''} ${item.stock < 1 ? 'btn-disabled' : ''}`}
                        onClick={() => item.stock > 0 && handleMeatToggle(item)}
                      >
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🥩</div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ color: 'var(--accent-orange)', marginTop: '4px', fontWeight: 700 }}>₹{item.price}</div>
                        {item.stock < 1 ? (
                          <span style={{ fontSize: '0.7rem', color: 'var(--accent-red)', fontWeight: 'bold' }}>SOLD OUT</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Stock: {item.stock}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Stepper Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              Previous Step
            </button>

            {step < 5 ? (
              <button 
                className="btn btn-primary"
                onClick={() => setStep(s => Math.min(5, s + 1))}
              >
                Next Step
              </button>
            ) : (
              <button 
                className="btn btn-primary"
                style={{ background: 'linear-gradient(135deg, var(--accent-green) 0%, #00c853 100%)', boxShadow: '0 4px 15px rgba(0, 230, 118, 0.3)' }}
                onClick={handlePayment}
                disabled={loading}
              >
                {loading ? 'Processing Order...' : 'Pay & Checkout 💳'}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Order Summary */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
            My Custom Pizza 🍕
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            {/* Base Selection summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Base</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedBase ? selectedBase.name : 'Not selected'}</div>
              </div>
              <div style={{ fontWeight: 600 }}>₹{selectedBase ? selectedBase.price : 0}</div>
            </div>

            {/* Sauce Selection summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Sauce</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedSauce ? selectedSauce.name : 'Not selected'}</div>
              </div>
              <div style={{ fontWeight: 600 }}>₹{selectedSauce ? selectedSauce.price : 0}</div>
            </div>

            {/* Cheese Selection summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>Cheese</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedCheese ? selectedCheese.name : 'Not selected'}</div>
              </div>
              <div style={{ fontWeight: 600 }}>₹{selectedCheese ? selectedCheese.price : 0}</div>
            </div>

            {/* Veggies Selection summary */}
            {selectedVeggies.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Veggies</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {selectedVeggies.map(v => v.name).join(', ')}
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>
                  ₹{selectedVeggies.reduce((sum, v) => sum + v.price, 0)}
                </div>
              </div>
            )}

            {/* Meats Selection summary */}
            {selectedMeats.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>Meats</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {selectedMeats.map(m => m.name).join(', ')}
                  </div>
                </div>
                <div style={{ fontWeight: 600 }}>
                  ₹{selectedMeats.reduce((sum, m) => sum + m.price, 0)}
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: '2px dashed var(--border-glass)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>Total Amount</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-orange)' }}>₹{calculateTotal()}</span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            ⚠️ Placing the order will instantly update inventory stocks in real-time. Low stock warnings will trigger alerts to the admin.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomPizzaBuilder;
