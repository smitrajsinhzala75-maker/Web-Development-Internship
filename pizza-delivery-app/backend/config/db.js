const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connString = process.env.MONGODB_URI;
    if (!connString) {
      throw new Error('No MONGODB_URI found in environment variables');
    }
    
    // Set connection timeout to 3 seconds for quick fallback check
    const conn = await mongoose.connect(connString, {
      serverSelectionTimeoutMS: 3000
    });
    
    global.isMockDb = false;
    console.log(`📡 MongoDB Connected: ${conn.connection.host}`);
    
    // Seed initial inventory if empty in MongoDB
    const Inventory = require('../models/Inventory');
    const count = await Inventory.countDocuments();
    if (count === 0) {
      console.log('🌱 Seeding initial inventory to MongoDB...');
      const mockDb = require('../utils/mockDb');
      const items = await mockDb.inventory.find({});
      // Remove mock database IDs
      const cleanItems = items.map(({ id, ...rest }) => rest);
      await Inventory.insertMany(cleanItems);
      console.log('✅ MongoDB inventory seeded successfully!');
    }
  } catch (err) {
    global.isMockDb = true;
    console.log('⚠️ MongoDB connection failed or MONGODB_URI not set.');
    console.log('🚀 FALLBACK: Using local JSON mock database (backend/mock_database.json).');
  }
};

module.exports = connectDB;
