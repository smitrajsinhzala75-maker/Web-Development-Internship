const Inventory = require('../models/Inventory');

exports.getInventory = async (req, res) => {
  try {
    const items = await Inventory.find({});
    res.json(items);
  } catch (error) {
    console.error('Get Inventory Error:', error);
    res.status(500).json({ message: 'Server error fetching inventory' });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { name, stock, price } = req.body;
    
    if (stock === undefined) {
      return res.status(400).json({ message: 'Stock value is required' });
    }

    const updateFields = { stock: parseInt(stock, 10) };
    if (price !== undefined) {
      updateFields.price = parseFloat(price);
    }

    const updated = await Inventory.updateOne({ name }, { $set: updateFields });
    if (!updated) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Broadcast inventory update to all connected clients
    if (global.io) {
      const items = await Inventory.find({});
      global.io.emit('inventoryUpdate', items);
    }

    res.json({ message: 'Stock updated successfully', name, stock, price });
  } catch (error) {
    console.error('Update Stock Error:', error);
    res.status(500).json({ message: 'Server error updating stock' });
  }
};
