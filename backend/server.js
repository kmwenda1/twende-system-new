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

// ================= USERS =================
app.get('/api/users', async (req, res) => {
    try {
        const users = await query('SELECT id, name, email, role, phone, created_at, is_approved FROM users ORDER BY created_at DESC');
        res.json({ success: true, data: users });
    } catch (err) {
        console.error('USERS ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

// ================= STAFF APPROVAL =================
app.get('/api/staff/pending', async (req, res) => {
    try {
        const staff = await query(
            'SELECT id, name, email, phone, created_at FROM users WHERE role = "staff" AND is_approved = FALSE ORDER BY created_at DESC'
        );
        res.json({ success: true, data: staff });
    } catch (err) {
        console.error('PENDING STAFF ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/staff/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { approved } = req.body;
        
        await query(
            'UPDATE users SET is_approved = ? WHERE id = ? AND role = "staff"', 
            [approved ? 1 : 0, id]
        );
        
        res.json({ 
            success: true, 
            message: approved ? 'Staff approved successfully' : 'Staff rejected'
        });
    } catch (err) {
        console.error('STAFF APPROVAL ERROR:', err);
        res.status(500).json({ error: err.message, success: false });
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

app.put('/api/fleet/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;
        
        await query('UPDATE fleet SET status = ? WHERE id = ?', [status, id]);
        
        res.json({ success: true, message: 'Fleet status updated' });
    } catch (err) {
        console.error('FLEET STATUS ERROR:', err);
        res.status(500).json({ error: err.message, success: false });
    }
});

// ================= BOOKINGS =================
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await query(`
            SELECT b.*, u.name as client_name, f.name as vehicle_name 
            FROM bookings b 
            LEFT JOIN users u ON b.user_id = u.id 
            LEFT JOIN fleet f ON b.vehicle_id = f.id 
            ORDER BY b.created_at DESC
        `);
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/bookings/check-availability', async (req, res) => {
    try {
        const { vehicle_id, start_date, end_date, exclude_booking_id } = req.body;
        
        let sql = `
            SELECT * FROM bookings 
            WHERE vehicle_id = ? 
            AND status != 'Cancelled'
            AND (
                (start_date <= ? AND end_date >= ?) OR
                (start_date <= ? AND end_date >= ?) OR
                (start_date >= ? AND end_date <= ?)
            )
        `;
        
        const params = [
            vehicle_id,
            end_date, start_date,
            start_date, end_date,
            start_date, end_date
        ];
        
        if (exclude_booking_id) {
            sql += ' AND id != ?';
            params.push(exclude_booking_id);
        }
        
        const conflicts = await query(sql, params);
        
        res.json({ 
            success: true, 
            available: conflicts.length === 0,
            conflicts: conflicts
        });
    } catch (err) {
        console.error('AVAILABILITY CHECK ERROR:', err);
        res.status(500).json({ error: err.message, success: false });
    }
});

app.post('/api/bookings', async (req, res) => {
    try {
        const { user_id, vehicle_id, destination, start_date, end_date, travelers, amount, notes } = req.body;

        // Check for date overlap
        const availability = await query(`
            SELECT * FROM bookings 
            WHERE vehicle_id = ? 
            AND status != 'Cancelled'
            AND (
                (start_date <= ? AND end_date >= ?) OR
                (start_date <= ? AND end_date >= ?) OR
                (start_date >= ? AND end_date <= ?)
            )
        `, [
            vehicle_id,
            end_date, start_date,
            start_date, end_date,
            start_date, end_date
        ]);
        
        if (availability.length > 0) {
            return res.json({ 
                success: false, 
                message: 'Vehicle is not available for selected dates. Please choose different dates or vehicle.' 
            });
        }

        const result = await query(
            'INSERT INTO bookings (user_id, vehicle_id, destination, start_date, end_date, travelers, amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, "Pending", ?)',
            [user_id, vehicle_id, destination, start_date, end_date, travelers, amount, notes || '']
        );

        res.json({ success: true, bookingId: result.insertId });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/bookings/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;
        
        const validStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        
        await query('UPDATE bookings SET status = ? WHERE id = ?', [status, id]);
        
        if (status === 'Confirmed') {
            const [booking] = await query('SELECT vehicle_id FROM bookings WHERE id = ?', [id]);
            if (booking) {
                await query('UPDATE fleet SET status = "Booked" WHERE id = ?', [booking.vehicle_id]);
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bookings/calendar', async (req, res) => {
    try {
        const { vehicle_id, month, year } = req.query;
        
        let sql = `
            SELECT b.*, u.name as client_name, f.name as vehicle_name 
            FROM bookings b 
            LEFT JOIN users u ON b.user_id = u.id 
            LEFT JOIN fleet f ON b.vehicle_id = f.id 
            WHERE b.status != 'Cancelled'
        `;
        
        const params = [];
        
        if (vehicle_id) {
            sql += ' AND b.vehicle_id = ?';
            params.push(vehicle_id);
        }
        
        if (month && year) {
            sql += ` AND MONTH(b.start_date) = ? AND YEAR(b.start_date) = ?`;
            params.push(parseInt(month), parseInt(year));
        }
        
        sql += ' ORDER BY b.start_date';
        
        const bookings = await query(sql, params);
        res.json({ success: true, data: bookings });
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
        console.error('GET INQUIRIES ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/inquiries', async (req, res) => {
    try {
        const { client_name, client_email, client_phone, destination, notes, source, subject } = req.body;
        
        console.log('📩 Received inquiry:', { client_name, client_email, source, subject });
        
        if (!client_name || !client_email || !notes) {
            return res.status(400).json({ 
                success: false, 
                message: 'Name, email, and message are required' 
            });
        }
        
        const result = await query(
            `INSERT INTO inquiries 
             (client_name, client_email, client_phone, destination, notes, source, subject, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, 'NO ACTION', NOW())`,
            [
                client_name,
                client_email,
                client_phone || '',
                destination || '',
                notes,
                source || 'Website',
                subject || ''
            ]
        );
        
        console.log('✅ Inquiry created with ID:', result.insertId);
        
        res.json({ 
            success: true, 
            message: 'Inquiry submitted successfully',
            inquiryId: result.insertId 
        });
    } catch (err) {
        console.error('❌ INQUIRY ERROR:', err);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to submit inquiry',
            error: err.message 
        });
    }
});

app.put('/api/inquiries/:id', async (req, res) => {
    try {
        const { status, reply_notes } = req.body;
        const { id } = req.params;
        
        console.log(`🔄 Updating inquiry ${id} to status: ${status}`);
        
        if (reply_notes) {
            await query(
                'UPDATE inquiries SET status = ?, reply_notes = ?, replied_at = NOW() WHERE id = ?',
                [status, reply_notes, id]
            );
        } else {
            await query('UPDATE inquiries SET status = ? WHERE id = ?', [status, id]);
        }
        
        console.log('✅ Inquiry updated successfully');
        res.json({ success: true });
    } catch (err) {
        console.error('❌ UPDATE INQUIRY ERROR:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/inquiries/old', async (req, res) => {
    try {
        const oldInquiries = await query(`
            SELECT * FROM inquiries 
            WHERE status = 'NO ACTION' 
            AND created_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)
            ORDER BY created_at ASC
        `);
        res.json({ success: true, data: oldInquiries });
    } catch (err) {
        console.error('OLD INQUIRIES ERROR:', err);
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