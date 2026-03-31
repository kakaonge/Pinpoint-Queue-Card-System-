const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketNumber: String,
  serviceType: String,
  customerName: String,
  priority: String,
  status: { type: String, default: 'Waiting' }, // <--- Make sure this is 'Waiting'
  issuedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
