const express = require('express');
const router = express.Router();
const pool = require('../../database');

router.post('/', async (req, res) => {
    // Extract email (even if sent as 'email_address') and password
    const { email_address, password } = req.body;
    const email = email_address; // Handle both 'email' and 'email_address'

    try {
        // Use PostgreSQL function to validate login
        const result = await pool.query(
            'SELECT * FROM workflow.validate_login($1, $2)',
            [email, password]
        );

        // If no user found or password incorrect
        if (result.rows.length === 0) {
            // Track failed login attempts
            const failedAttemptsResult = await pool.query(
                `UPDATE workflow."user" 
                 SET 
                     failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
                     is_locked = (COALESCE(failed_login_attempts, 0) + 1 >= 5),
                     locked_until = CASE 
                         WHEN COALESCE(failed_login_attempts, 0) + 1 >= 5 
                         THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes'
                         ELSE NULL 
                     END
                 WHERE email = $1
                 RETURNING failed_login_attempts`,
                [email]
            );

            const failedAttempts = failedAttemptsResult.rows[0]?.failed_login_attempts || 0;
            const remainingAttempts = Math.max(0, 5 - failedAttempts);

            return res.status(401).json({ 
                message: 'Invalid email or password', 
                remainingAttempts 
            });
        }

        // Reset failed attempts on success
        await pool.query(
            `UPDATE workflow."user" 
             SET 
                 failed_login_attempts = 0,
                 is_locked = FALSE,
                 locked_until = NULL
             WHERE email = $1`,
            [email]
        );

        // Return user details
        const user = result.rows[0];
        res.json({ 
            userId: user.user_id, 
            username: user.username, 
            role: user.role 
        });

    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;