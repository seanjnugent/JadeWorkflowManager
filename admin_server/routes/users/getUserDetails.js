const express = require('express');
const router = express.Router();
const pool = require('../../database');

// Get user details by user ID
router.get('/:user_id', async (req, res) => {
    const { user_id } = req.params;

    try {
        // Call the stored procedure to get user summary
        const result = await pool.query(
            'SELECT * FROM workflow.get_user_details($1)',
            [user_id]
        );

        // Check if user exists
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return user details
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).json({ 
            error: 'Internal server error',
            details: err.message 
        });
    }
});

module.exports = router;