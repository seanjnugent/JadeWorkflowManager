const express = require('express');
const router = express.Router();
const pool = require('../../database');

router.post('/', async (req, res) => {   // Changed from '/login' to '/'
  const { email_address, password } = req.body;

  try {
    // Fetch the client with the provided email
    const clientResult = await pool.query(
      'SELECT client_id, email_address, password, date_last_login FROM client WHERE email_address = $1',
      [email_address]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ message: 'Invalid email or password' });
    }

    const client = clientResult.rows[0];

    // Verify password (adjust if using hashed passwords in the future)
    if (client.password !== password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update the last_login_date
    await pool.query(
      'UPDATE client SET date_last_login = CURRENT_TIMESTAMP WHERE client_id = $1',
      [client.client_id]
    );

    // Return client_id as userId
    res.json({ userId: client.client_id });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
