const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const stripeRoutes = require('./routes/stripe');
const spotifyRoutes = require('./routes/spotify');
const geniusRoutes = require('./routes/genius');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/payment', stripeRoutes);
app.use('/api/music', spotifyRoutes);
app.use('/api/lyrics', geniusRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Musij Backend API is running',
    timestamp: new Date().toISOString(),
    apis: {
      stripe: !!process.env.STRIPE_SECRET_KEY,
      spotify: !!process.env.SPOTIFY_CLIENT_ID,
      genius: !!process.env.GENIUS_ACCESS_TOKEN
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Musij Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎵 Environment: ${process.env.NODE_ENV || 'development'}`);
});
