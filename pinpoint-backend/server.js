require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();
const server = http.createServer(app); 

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('⚡ A screen connected to the Live Display');
  
  socket.on('disconnect', () => {
    console.log('🔌 A screen disconnected');
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB database'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Routes
const ticketRoutes = require('./routes/tickets');
app.use('/api/tickets', ticketRoutes);

app.get('/', (req, res) => {
  res.send('PinPoint API is running with WebSockets!');
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});