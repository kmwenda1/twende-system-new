const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');
const app = express();

// CORS
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Database connection pool (PREVENTS TIMEOUT!)
const pool = mysql.createPool({
    connectionLimit: 10,
    uri: process.env.DATABASE_URL || process.env.MYSQL_URL,
    waitForConnections: true,
    enableKeepAlive: true
});

// Query helper
function query(sql, params) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, (err, results) => {
            if (err) reject(err);
            else resolve(results);
        });
    });
}

// Health check
app.get('/health', async (req, res) => {
    try {
        await query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (err) {
        res.status(503).json({ status: 'error', database: 'disconnected' });
    }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const [users] = await query('SELECT * FROM users WHERE email = ?', [req.body.email]);
        if (!users || users.length === 0) return res.json({ success: false, message: 'Invalid credentials' });
        
        const user = users[0];
        const valid = await bcrypt.compare(req.body.password, user.password);
        if (!valid) return res.json({ success: false, message: 'Invalid credentials' });
        
        const { password, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword, role: user.role });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get fleet
app.get('/api/fleet', async (req, res) => {
    try {
        const [fleet] = await query('SELECT * FROM fleet ORDER BY name');
        res.json({ success: true, data: fleet });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get bookings
app.get('/api/bookings', async (req, res) => {
    try {
        const [bookings] = await query('SELECT * FROM bookings ORDER BY created_at DESC');
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create booking
app.post('/api/bookings', async (req, res) => {
    try {
        const { user_id, vehicle_id, destination, start_date, end_date, travelers, amount } = req.body;
        const [result] = await query(
            'INSERT INTO bookings (user_id, vehicle_id, destination, start_date, end_date, travelers, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, "Pending")',
            [user_id, vehicle_id, destination, start_date, end_date, travelers, amount]
        );
        res.json({ success: true, bookingId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update booking status
app.put('/api/bookings/:id/status', async (req, res) => {
    try {
        await query('UPDATE bookings SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get inquiries
app.get('/api/inquiries', async (req, res) => {
    try {
        const [inquiries] = await query('SELECT * FROM inquiries ORDER BY created_at DESC');
        res.json({ success: true, data: inquiries });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update inquiry
app.put('/api/inquiries/:id', async (req, res) => {
    try {
        await query('UPDATE inquiries SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// M-Pesa STK Push (simplified)
app.post('/api/mpesa/stkpush', async (req, res) => {
    res.json({ success: true, message: 'STK Push sent' });
});

// ============ TEMPORARY: Update Admin Password (REMOVE AFTER USE) ============
app.get('/api/update-admin-password', async (req, res) => {
    try {
        // Hash password "123" with bcrypt
        const hashedPassword = await bcrypt.hash('123', 10);
        
        // Update admin user password
        await query(
            'UPDATE users SET password = ? WHERE email = ?',
            [hashedPassword, 'admin@twende.com']
        );
        
        res.json({ 
            success: true, 
            message: 'Admin password updated successfully!',
            hashedPassword: hashedPassword,
            note: 'REMOVE this route from server.js after use!'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// ============ END TEMPORARY ROUTE ============

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});