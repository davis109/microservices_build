require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

// Import routes
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const generateRoutes = require('./routes/generate');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Kontrol Backend API',
    version: '1.0.0',
    aiProvider: 'Google Gemini',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      projects: '/api/projects',
      generate: '/api/generate',
      ai: '/api/ai'
    },
    documentation: 'See README.md for API documentation'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Kontrol Backend API',
    aiProvider: 'Google Gemini',
    model: process.env.GEMINI_MODEL
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch((err) => {
  console.warn('⚠️  MongoDB connection error:', err.message);
  console.warn('⚠️  Running without database. Some features may not work.');
});

// Start server regardless of MongoDB connection
app.listen(PORT, () => {
  console.log(`🚀 Kontrol Backend API running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🤖 AI Provider: Google Gemini (${process.env.GEMINI_MODEL})`);
});

module.exports = app;
