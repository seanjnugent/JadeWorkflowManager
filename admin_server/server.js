const express = require('express');
const app = express();
const port = 5000;
const cors = require('cors');

app.use(cors());

// Middleware
app.use(express.json());

// Import routes and dynamically register them
const userRoutes = require('./routes/users');
//const priceRoutes = require('./routes/prices');

// Use the routes
app.use('/api/users', userRoutes);

// Test Route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
async function startServer() {
  try {    
    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

