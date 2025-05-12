// index.js 
require('dotenv').config(); // Load .env variables from .env file first
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// require route handlers
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const adminRoutes = require('./routes/adminRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable Cross-Origin Resource Sharing (adjust origins in production)
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// --- Database Connection ---
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("FATAL ERROR: MONGO_URI is not defined in .env file");
  process.exit(1); // Exit the application if DB connection string is missing
}

console.log('Connecting to:', MONGO_URI);
mongoose.connect(MONGO_URI).then(() => console.log('MongoDB Connected Successfully!'))
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1); // Exit if DB connection fails on startup
});

// --- API Routes ---
app.get('/', (req, res) => { // Basic check route
    res.send('Grocery App Backend API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes)

// --- Error Handling Middleware (Basic Example) ---
// Not Found Handler (should be after all routes)
app.use((req, res, next) => {
  res.status(404).json({ message: `Route Not Found - ${req.originalUrl}` });
});

// General Error Handler (should be the last middleware)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err.stack || err);
  // Customize error response based on error type if needed
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    // Optionally include stack trace in development
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});


// --- Start Server ---
const PORT = process.env.PORT || 5001; // Use port from .env or default to 5001

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});