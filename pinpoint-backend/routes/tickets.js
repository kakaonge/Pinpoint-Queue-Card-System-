const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

router.post('/issue', async (req, res) => {
  try {
    const { serviceType, customerName, priority } = req.body;

    const prefix = serviceType ? serviceType.substring(0, 2).toUpperCase() : 'TK';
    const randomNum = Math.floor(100 + Math.random() * 900);
    const ticketNumber = `${prefix}-${randomNum}`;

    const newTicket = new Ticket({
      ticketNumber,
      serviceType,
      customerName,
      priority
    });

    const savedTicket = await newTicket.save();
    
    const io = req.app.get('io');
    io.emit('new-ticket', savedTicket);

    res.status(201).json(savedTicket);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to issue ticket' });
  }
});

module.exports = router;
// PUT: Call the next person in line
router.put('/call-next', async (req, res) => {
  try {
    // Find the oldest 'Waiting' ticket
    const nextTicket = await Ticket.findOne({ status: 'Waiting' }).sort({ issuedAt: 1 });

    if (!nextTicket) {
      return res.status(404).json({ message: 'No one is waiting' });
    }

    // Update status to 'Serving'
    nextTicket.status = 'Serving';
    await nextTicket.save();

    // Broadcast to all screens (Dashboard, Public Display, etc.)
    const io = req.app.get('io');
    io.emit('ticket-called', nextTicket);

    res.json(nextTicket);
  } catch (err) {
    res.status(500).json({ error: 'Server error while calling next' });
  }
});
// PUT: Complete a serving session
router.put('/complete/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.status = 'Completed';
    // Optionally, you could track a 'completedAt' timestamp here for analytics
    await ticket.save();

    const io = req.app.get('io');
    io.emit('ticket-completed', ticket);

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete ticket' });
  }
});