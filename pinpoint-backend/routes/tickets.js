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