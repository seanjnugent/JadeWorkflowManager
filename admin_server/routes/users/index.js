const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

// Dynamically load all route files inside the 'clients' folder (except 'index.js')
fs.readdirSync(__dirname).forEach(file => {
  if (file !== 'index.js' && file.endsWith('.js')) {
    const route = require(path.join(__dirname, file));  // Dynamically require the route file
    const routePath = `/${file.replace('.js', '')}`;     // Use the file name as the route path
    router.use(routePath, route);                        // Register the route with the corresponding path
  }
});

module.exports = router;
