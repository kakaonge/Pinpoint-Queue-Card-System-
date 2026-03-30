const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: { type: String, required: true },
  serviceType: { type: String, required: true },
  customerName: { type: String, default: 'Guest' },
  priority: { type: String, default: 'Normal' },
  status: { type: String, default: 'Waiting' }, // Waiting, Serving, Completed
  issuedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
