const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// The secret key used to stamp the digital ID cards (JWTs)
const JWT_SECRET = process.env.JWT_SECRET || 'kca_pinpoint_super_secret_key_2026';

// 1. One-time Setup Route (Run this once to create the Admin)
router.post('/setup', async (req, res) => {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (adminExists) return res.status(400).json({ message: 'Admin already exists' });

    // Scramble the password securely before saving
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = new User({ 
      username: 'admin', 
      password: hashedPassword, 
      role: 'admin' 
    });
    
    await admin.save();
    res.json({ message: 'Admin user created successfully! You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Setup failed' });
  }
});

// 2. The Real Login Route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Compare the typed password with the hashed password in MongoDB
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // If passwords match, create the JSON Web Token (JWT)
    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username }, 
      JWT_SECRET, 
      { expiresIn: '8h' } // Token expires at the end of a shift
    );

    // Send the token back to the frontend
    res.json({ 
      token, 
      user: { username: user.username, role: user.role } 
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

module.exports = router;