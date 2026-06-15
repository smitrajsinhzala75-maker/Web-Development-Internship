const mongoose = require('mongoose');
const mockDb = require('../utils/mockDb');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  createdAt: { type: Date, default: Date.now }
});

const MongooseUser = mongoose.model('User', UserSchema);

const UserProxy = {
  find: (...args) => global.isMockDb ? mockDb.users.find(...args) : MongooseUser.find(...args),
  findOne: (...args) => global.isMockDb ? mockDb.users.findOne(...args) : MongooseUser.findOne(...args),
  findById: (...args) => global.isMockDb ? mockDb.users.findById(...args) : MongooseUser.findById(...args),
  create: (...args) => global.isMockDb ? mockDb.users.create(...args) : MongooseUser.create(...args),
  findByIdAndUpdate: (...args) => global.isMockDb ? mockDb.users.findByIdAndUpdate(...args) : MongooseUser.findByIdAndUpdate(...args),
  mongooseModel: MongooseUser
};

module.exports = UserProxy;
