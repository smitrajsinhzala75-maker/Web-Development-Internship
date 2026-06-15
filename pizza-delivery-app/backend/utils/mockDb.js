const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../mock_database.json');

const defaultData = {
  users: [],
  inventory: [
    // Bases (5 options)
    { id: 'b1', name: 'Thin Crust', category: 'base', price: 80, stock: 50 },
    { id: 'b2', name: 'Thick Crust', category: 'base', price: 90, stock: 50 },
    { id: 'b3', name: 'Gluten-Free', category: 'base', price: 120, stock: 30 },
    { id: 'b4', name: 'Cheese Burst', category: 'base', price: 150, stock: 40 },
    { id: 'b5', name: 'Neapolitan Crust', category: 'base', price: 110, stock: 35 },
    // Sauces (5 options)
    { id: 's1', name: 'Classic Marinara', category: 'sauce', price: 20, stock: 80 },
    { id: 's2', name: 'Spicy Schezwan', category: 'sauce', price: 25, stock: 75 },
    { id: 's3', name: 'Barbecue Sauce', category: 'sauce', price: 30, stock: 60 },
    { id: 's4', name: 'Creamy Alfredo', category: 'sauce', price: 35, stock: 50 },
    { id: 's5', name: 'Basil Pesto', category: 'sauce', price: 40, stock: 45 },
    // Cheeses
    { id: 'c1', name: 'Mozzarella', category: 'cheese', price: 50, stock: 60 },
    { id: 'c2', name: 'Cheddar', category: 'cheese', price: 60, stock: 50 },
    { id: 'c3', name: 'Parmesan', category: 'cheese', price: 70, stock: 40 },
    { id: 'c4', name: 'Feta', category: 'cheese', price: 65, stock: 30 },
    { id: 'c5', name: 'Vegan Cheese', category: 'cheese', price: 80, stock: 25 },
    // Veggies
    { id: 'v1', name: 'Onions', category: 'veggies', price: 15, stock: 100 },
    { id: 'v2', name: 'Tomatoes', category: 'veggies', price: 15, stock: 100 },
    { id: 'v3', name: 'Bell Peppers', category: 'veggies', price: 20, stock: 90 },
    { id: 'v4', name: 'Mushrooms', category: 'veggies', price: 30, stock: 70 },
    { id: 'v5', name: 'Black Olives', category: 'veggies', price: 25, stock: 80 },
    { id: 'v6', name: 'Jalapenos', category: 'veggies', price: 25, stock: 85 },
    { id: 'v7', name: 'Sweet Corn', category: 'veggies', price: 20, stock: 95 },
    // Meats
    { id: 'm1', name: 'Pepperoni', category: 'meat', price: 60, stock: 40 },
    { id: 'm2', name: 'Grilled Chicken', category: 'meat', price: 50, stock: 50 },
    { id: 'm3', name: 'Italian Sausage', category: 'meat', price: 55, stock: 40 },
    { id: 'm4', name: 'Smoked Bacon', category: 'meat', price: 70, stock: 30 }
  ],
  orders: []
};

// Initialize DB file if not exists
function initDb() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
  } else {
    // Read and verify structure
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      // If inventory is empty, reset it
      if (!data.inventory || data.inventory.length === 0) {
        data.inventory = defaultData.inventory;
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
      }
    } catch (e) {
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8');
    }
  }
}

function readDb() {
  initDb();
  const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(fileContent);
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

const mockDb = {
  // Collection-like operations
  users: {
    find: async (query = {}) => {
      const db = readDb();
      return db.users.filter(u => {
        for (let key in query) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      });
    },
    findOne: async (query = {}) => {
      const db = readDb();
      return db.users.find(u => {
        for (let key in query) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      }) || null;
    },
    findById: async (id) => {
      const db = readDb();
      return db.users.find(u => u._id === id || u.id === id) || null;
    },
    create: async (userData) => {
      const db = readDb();
      const newUser = {
        _id: Math.random().toString(36).substring(2, 11),
        isVerified: false,
        role: 'customer',
        createdAt: new Date().toISOString(),
        ...userData
      };
      db.users.push(newUser);
      writeDb(db);
      return newUser;
    },
    findByIdAndUpdate: async (id, update) => {
      const db = readDb();
      const index = db.users.findIndex(u => u._id === id || u.id === id);
      if (index === -1) return null;
      db.users[index] = { ...db.users[index], ...update };
      writeDb(db);
      return db.users[index];
    }
  },

  inventory: {
    find: async (query = {}) => {
      const db = readDb();
      return db.inventory.filter(item => {
        for (let key in query) {
          if (item[key] !== query[key]) return false;
        }
        return true;
      });
    },
    findOne: async (query = {}) => {
      const db = readDb();
      return db.inventory.find(item => {
        for (let key in query) {
          if (item[key] !== query[key]) return false;
        }
        return true;
      }) || null;
    },
    updateOne: async (query, update) => {
      const db = readDb();
      const item = db.inventory.find(i => {
        for (let key in query) {
          if (i[key] !== query[key]) return false;
        }
        return true;
      });
      if (!item) return null;
      
      let updateFields = update;
      if (update.$set) updateFields = update.$set;
      if (update.$inc) {
        for (let k in update.$inc) {
          item[k] = (item[k] || 0) + update.$inc[k];
        }
      }
      
      Object.assign(item, updateFields);
      writeDb(db);
      return item;
    },
    updateMany: async (filter, update) => {
      // Mock simple update many if needed
    }
  },

  orders: {
    find: async (query = {}) => {
      const db = readDb();
      // Sort orders by createdAt desc by default
      const filtered = db.orders.filter(o => {
        for (let key in query) {
          if (o[key] !== query[key]) return false;
        }
        return true;
      });
      return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    findById: async (id) => {
      const db = readDb();
      return db.orders.find(o => o._id === id || o.id === id) || null;
    },
    create: async (orderData) => {
      const db = readDb();
      const newOrder = {
        _id: 'ord_' + Math.random().toString(36).substring(2, 11),
        status: 'Order Received',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        ...orderData
      };
      db.orders.push(newOrder);
      writeDb(db);
      return newOrder;
    },
    findByIdAndUpdate: async (id, update) => {
      const db = readDb();
      const index = db.orders.findIndex(o => o._id === id || o.id === id);
      if (index === -1) return null;
      
      let updateFields = update;
      if (update.$set) updateFields = update.$set;
      
      db.orders[index] = { ...db.orders[index], ...updateFields };
      writeDb(db);
      return db.orders[index];
    }
  }
};

// Initialize on load
initDb();

module.exports = mockDb;
