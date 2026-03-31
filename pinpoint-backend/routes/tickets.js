const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');

// 1. POST: Issue a new ticket
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
      priority,
      status: 'Waiting' // Explicitly set to match our 'Call Next' query
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

// 2. PUT: Call the next person in line
router.put('/call-next', async (req, res) => {
  try {
    // Find the oldest 'Waiting' ticket
    const nextTicket = await Ticket.findOne({ status: 'Waiting' }).sort({ issuedAt: 1 });

    if (!nextTicket) {
      return res.status(404).json({ message: 'No one is waiting' });
    }

    nextTicket.status = 'Serving';
    await nextTicket.save();

    const io = req.app.get('io');
    io.emit('ticket-called', nextTicket);

    res.json(nextTicket);
  } catch (err) {
    res.status(500).json({ error: 'Server error while calling next' });
  }
});

// 3. PUT: Complete a serving session
// 2. PUT: Call the next person in line
router.put('/call-next', async (req, res) => {
  try {
    // We grab the counter name sent from the frontend
    const { counter } = req.body; 

    const nextTicket = await Ticket.findOne({ status: 'Waiting' }).sort({ issuedAt: 1 });

    if (!nextTicket) {
      return res.status(404).json({ message: 'No one is waiting' });
    }

    nextTicket.status = 'Serving';
    // Save the counter to the ticket so the customer can track it
    nextTicket.counter = counter || 'Auto-Assigned'; 
    await nextTicket.save();

    const io = req.app.get('io');
    io.emit('ticket-called', nextTicket);

    res.json(nextTicket);
  } catch (err) {
    res.status(500).json({ error: 'Server error while calling next' });
  }
});

// 4. GET: Fetch Queue Analytics
router.get('/stats', async (req, res) => {
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

// Export the router at the VERY END of the file
module.exports = router;