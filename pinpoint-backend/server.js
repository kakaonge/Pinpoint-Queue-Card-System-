require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 
const jwt = require('jsonwebtoken');

const app = express();
const server = http.createServer(app); 

// ════════════════════════════════════════════════
// 🟢 MIDDLEWARE (The VIP Pass and Translators)
// ════════════════════════════════════════════════
app.use(cors()); // Allows your Vite frontend to talk to this backend
app.use(express.json()); // Tells Express how to read the username/password

// ════════════════════════════════════════════════
// 🟢 WEBSOCKETS SETUP (Live UI Updates)
// ════════════════════════════════════════════════
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('⚡ A screen connected to the Live Display');
  socket.on('disconnect', () => {
    console.log('🔌 A screen disconnected');
  });
});

// ════════════════════════════════════════════════
// 🟢 DATABASE CONNECTION
// ════════════════════════════════════════════════
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB database'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ════════════════════════════════════════════════
// 🟢 AUTHENTICATION ROUTE (The Key-Maker)
// ════════════════════════════════════════════════
// Ensure this matches the secret in your middleware/auth.js!
const JWT_SECRET = process.env.JWT_SECRET || 'kca_pinpoint_super_secret_key_2026';

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Verify the default Admin credentials
  if (username === 'admin' && password === 'admin123') {
    // Generate the secure JWT Token (Digital Badge)
    const token = jwt.sign({ user: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    
    // Send it back to the frontend
    res.json({ token, message: 'Login successful' });
  } else {
    // Reject invalid passwords
    res.status(401).json({ message: 'Invalid username or password' });
  }
});

// ════════════════════════════════════════════════
// 🟢 WHATSAPP BOT INTEGRATION (Temporarily Disabled)
// ════════════════════════════════════════════════
/*
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const whatsapp = new Client({
  authStrategy: new LocalAuth(), 
  puppeteer: { headless: true }
});

whatsapp.on('qr', (qr) => {
  console.log('\n📱 Scan this QR code with your WhatsApp to link the system:');
  qrcode.generate(qr, { small: true });
});

whatsapp.on('ready', () => {
  console.log('✅ WhatsApp Bot is fully linked and ready to send messages!');
});

whatsapp.initialize();

app.set('whatsapp', whatsapp); 
*/
// ════════════════════════════════════════════════

// ════════════════════════════════════════════════
// 🟢 ROUTES
// ════════════════════════════════════════════════
const ticketRoutes = require('./routes/tickets');
app.use('/api/tickets', ticketRoutes);

// Base Route
app.get('/', (req, res) => {
  res.send('PinPoint API is running with WebSockets & Authentication!');
});

// ════════════════════════════════════════════════
// 🟢 START SERVER
// ════════════════════════════════════════════════
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});