const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const auth = require('../middleware/auth'); // Security Guard

// 1. POST: Issue a new ticket (Public - No auth required)
router.post('/issue', async (req, res) => {
  try {
    const { serviceType, customerName, priority, phone } = req.body;

    const prefix = serviceType ? serviceType.substring(0, 2).toUpperCase() : 'TK';
    const randomNum = Math.floor(100 + Math.random() * 900);
    const ticketNumber = `${prefix}-${randomNum}`;

    const newTicket = new Ticket({
      ticketNumber,
      serviceType,
      customerName,
      priority,
      status: 'Waiting'
    });

    const savedTicket = await newTicket.save();

    // Broadcast to all screens
    const io = req.app.get('io');
    if (io) {
      io.emit('new-ticket', savedTicket);
    }

    res.status(201).json(savedTicket);
  } catch (err) {
    console.error('Error issuing ticket:', err);
    res.status(500).json({ error: 'Failed to issue ticket' });
  }
});

// 2. PUT: Call the next person in line (Protected)
router.put('/call-next', auth, async (req, res) => {
  try {
    const { counter } = req.body; 
    const nextTicket = await Ticket.findOne({ status: 'Waiting' }).sort({ issuedAt: 1 });

    if (!nextTicket) {
      return res.status(404).json({ message: 'No one is waiting' });
    }

    nextTicket.status = 'Serving';
    nextTicket.counter = counter || 'Auto-Assigned'; 
    await nextTicket.save();

    const io = req.app.get('io');
    if (io) io.emit('ticket-called', nextTicket);

    res.json(nextTicket);
  } catch (err) {
    res.status(500).json({ error: 'Server error while calling next' });
  }
});

// 3. PUT: Complete a serving session (Protected)
router.put('/complete/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.status = 'Completed';
    await ticket.save();

    const io = req.app.get('io');
    if (io) io.emit('ticket-completed', ticket);

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete ticket' });
  }
});

// 4. GET: Fetch Queue Analytics (Protected)
router.get('/stats', auth, async (req, res) => {
  try {
    const totalServed = await Ticket.countDocuments({ status: 'Completed' });
    const waitingNow = await Ticket.countDocuments({ status: 'Waiting' });

    const serviceBreakdown = await Ticket.aggregate([
      { $match: { status: 'Completed' } },
      { $group: { _id: "$serviceType", count: { $sum: 1 } } }
    ]);

    res.json({
      totalServed,
      waitingNow,
      serviceBreakdown,
      avgWaitTime: "4.2m" 
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// 5. PUT: Reassign ticket to a new counter (Protected)
router.put('/reassign/:id', auth, async (req, res) => {
  try {
    const { targetCounter } = req.body;
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.counter = targetCounter;
    await ticket.save();

    const io = req.app.get('io');
    if (io) io.emit('ticket-completed', ticket); 

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: 'Failed to reassign ticket' });
  }
});

module.exports = router;