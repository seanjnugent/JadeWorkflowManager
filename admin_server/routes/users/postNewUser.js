
const express = require('express');
const router = express.Router();
const pool = require('../../database');

router.post('', async (req, res) => {
    const {
      firstName,
      surname,
      dateOfBirth,
      countryOfResidence,
      residentialAddress,
      clientProfile,
      emailAddress,
      phoneNumber,
    } = req.body;
  
    try {
      const clientData = [
        firstName,
        surname,
        dateOfBirth,
        JSON.stringify(residentialAddress),
        countryOfResidence,
        JSON.stringify(clientProfile),
        emailAddress,
        phoneNumber,
      ];
  
      const result = await pool.query(
        'SELECT * FROM post_new_client($1, $2, $3, $4, $5, $6, $7, $8) AS f(client_id integer, message text)',
        clientData
      );
  
      if (result.rows.length > 0) {
        res.status(201).json({
          message: result.rows[0].message,
          clientId: result.rows[0].client_id
        });
      } else {
        res.status(500).json({ error: 'Client creation failed' });
      }
    } catch (err) {
      console.error('Error creating client:', err);
      res.status(500).json({
        error: 'Internal server error',
        details: err.message
      });
    }
  });

module.exports = router;