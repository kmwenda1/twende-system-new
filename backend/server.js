const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// Database connection pool
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
            if (err) {
                console.error("DB ERROR:", err);
                reject(err);
            } else {
                resolve(results);
            }
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

// ================= REGISTRATION =================
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, phone, interest, role } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, email, and password are required' 
            });
        }
        
        const [existing] = await query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing && existing.length > 0) {
            return res.json({ success: false, message: 'Email already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRole = role || 'client';
        const isApproved = userRole === 'client';
        
        await query(
            'INSERT INTO users (name, email, password, role, phone, interest, is_approved) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, email, hashedPassword, userRole, phone || '', interest || '', isApproved]
        );
        
        res.json({ success: true, message: 'Registration successful' });
        
    } catch (err) {
        console.error('REGISTRATION ERROR:', err);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// ================= LOGIN =================
app.post('/api/login', async (req, res) => {
    try {
        const users = await query('SELECT * FROM users WHERE email = ?', [req.body.email]);

        if (!users || users.length === 0) {
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];
        const valid = await bcrypt.compare(req.body.password, user.password);

        if (!valid) {
            return res.json({ success: false, message: 'Invalid credentials' });
        }

        if (user.role === 'staff' && !user.is_approved) {
            return res.json({ success: false, message: 'Account pending approval' });
        }

        const { password, ...userWithoutPassword } = user;

        res.json({
            success: true,
            user: userWithoutPassword,
            role: user.role
        });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

// ================= FLEET =================
app.get('/api/fleet', async (req, res) => {
    try {
        const fleet = await query('SELECT * FROM fleet ORDER BY name');
        res.json({ success: true, data: fleet });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ✅ NEW: Update Fleet Status Endpoint
app.put('/api/fleet/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;
        
        await query('UPDATE fleet SET status = ? WHERE id = ?', [status, id]);
        res.json({ success: true, message: 'Fleet status updated' });
    } catch (err) {
        console.error('FLEET STATUS ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// ================= BOOKINGS =================
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await query('SELECT * FROM bookings ORDER BY created_at DESC');
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { user_id, vehicle_id, destination, start_date, end_date, travelers, amount } = req.body;

        const result = await query(
            'INSERT INTO bookings (user_id, vehicle_id, destination, start_date, end_date, travelers, amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, "Pending")',
            [user_id, vehicle_id, destination, start_date, end_date, travelers, amount]
        );

        res.json({ success: true, bookingId: result.insertId });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bookings/:id/status', async (req, res) => {
    try {
        await query('UPDATE bookings SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= INQUIRIES =================
app.get('/api/inquiries', async (req, res) => {
    try {
        const inquiries = await query('SELECT * FROM inquiries ORDER BY created_at DESC');
        res.json({ success: true, data: inquiries });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/inquiries/:id', async (req, res) => {
    try {
        await query('UPDATE inquiries SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= MPESA =================
app.post('/api/mpesa/stkpush', async (req, res) => {
    res.json({ success: true, message: 'STK Push sent' });
});

// ================= TEMP PASSWORD RESET =================
app.get('/api/update-admin-password', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash('123', 10);
        await query('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, 'admin@twende.com']);
        res.json({ success: true, message: 'Admin password updated!' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});