const mongoose = require('mongoose');

const ServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ipAddress: { type: String, required: true, unique: true },
  environment: { type: String, enum: ['onprem', 'cloud'], default: 'onprem' },
  os: { type: String, default: 'linux' },
  hypervisor: { type: String, default: 'esxi' },
  status: { type: String, enum: ['pending', 'online', 'offline'], default: 'pending' },
  customerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Server', ServerSchema);
