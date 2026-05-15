const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['backup', 'restore', 'replicate'], required: true },
  serverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Server', required: true },
  schedule: { type: String, default: 'manual' },
  status: { type: String, enum: ['created', 'running', 'completed', 'failed'], default: 'created' },
  customerId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', JobSchema);
