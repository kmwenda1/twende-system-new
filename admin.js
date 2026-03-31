const API_URL = 'https://twende-system-new-production.up.railway.app';
let currentUser = null;
let allData = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('twende_user'));
    
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('adminName').textContent = currentUser.name || 'Admin';
    await loadAllData();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// Load all data
async function loadAllData() {
    try {
        const [bookings, fleet, users, inquiries] = await Promise.all([
            fetch(`${API_URL}/api/bookings`).then(r => r.json()),
            fetch(`${API_URL}/api/fleet`).then(r => r.json()),
            fetch(`${API_URL}/api/users`).then(r => r.json()),
            fetch(`${API_URL}/api/inquiries`).then(r => r.json())
        ]);
        
        allData = {
            bookings: bookings.data || [],
            fleet: fleet.data || [],
            users: users.data || [],
            inquiries: inquiries.data || []
        };
        
        updateDashboard();
        loadFleet();
        loadUsers();
        loadInquiries();
        loadBookings();
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

// Update dashboard stats
function updateDashboard() {
    const { bookings, fleet, users } = allData;
    
    const revenue = bookings
        .filter(b => b.status === 'Confirmed' || b.status === 'Completed')
        .reduce((sum, b) => sum + (b.amount || 0), 0);
    
    const activeFleet = fleet.filter(v => v.status === 'Booked').length;
    const availableFleet = fleet.filter(v => v.status === 'Available').length;
    const clients = users.filter(u => u.role === 'client').length;
    
    // Dashboard
    document.getElementById('dashRevenue').textContent = `$${revenue.toLocaleString()}`;
    document.getElementById('dashActiveFleet').textContent = activeFleet;
    document.getElementById('dashAvailableFleet').textContent = availableFleet;
    document.getElementById('dashClients').textContent = clients;
    
    // Intelligence
    document.getElementById('intelRevenue').textContent = `$${revenue.toLocaleString()}`;
    document.getElementById('intelActiveFleet').textContent = activeFleet;
    document.getElementById('intelAvailableFleet').textContent = availableFleet;
    document.getElementById('intelClients').textContent = clients;
    
    // Recent activity
    loadRecentActivity();
}

// Load recent activity
function loadRecentActivity() {
    const container = document.getElementById('recentActivity');
    const recent = allData.bookings.slice(0, 5);
    
    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="activity"></i>
                <p>No recent activity</p>
            </div>
        `;
    } else {
        container.innerHTML = recent.map(b => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i data-lucide="calendar"></i>
                </div>
                <div class="activity-info">
                    <div class="activity-title">New booking: ${b.destination}</div>
                    <div class="activity-time">${new Date(b.created_at).toLocaleDateString()}</div>
                </div>
            </div>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Load fleet
function loadFleet() {
    const container = document.getElementById('fleetList');
    
    container.innerHTML = allData.fleet.map(v => `
        <div class="fleet-item">
            <div class="fleet-info">
                <div class="fleet-name">${v.name}</div>
                <div class="fleet-details">${v.type} · $${v.rate}/day</div>
            </div>
            <div class="fleet-status">
                <span class="status-badge status-${v.status?.toLowerCase()}">${v.status}</span>
                <select class="status-select" onchange="updateFleetStatus(${v.id}, this.value)">
                    <option value="Available" ${v.status === 'Available' ? 'selected' : ''}>Available</option>
                    <option value="Booked" ${v.status === 'Booked' ? 'selected' : ''}>Booked</option>
                    <option value="Maintenance" ${v.status === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
                </select>
            </div>
        </div>
    `).join('');
}

// Update fleet status
async function updateFleetStatus(vehicleId, status) {
    try {
        await fetch(`${API_URL}/api/fleet/${vehicleId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        await loadAllData();
    } catch (err) {
        console.error('Error updating fleet:', err);
    }
}

// Load users
function loadUsers() {
    const container = document.getElementById('usersList');
    
    container.innerHTML = allData.users.map(u => `
        <div class="user-item">
            <div class="user-item-info">
                <div class="user-item-name">${u.name}</div>
                <div class="user-item-role">${u.role}</div>
            </div>
            <div class="user-item-date">${new Date(u.created_at).toLocaleDateString()}</div>
        </div>
    `).join('');
}

// Load inquiries
function loadInquiries() {
    const container = document.getElementById('inboxList');
    
    if (allData.inquiries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="inbox"></i>
                <p>No inquiries yet.</p>
            </div>
        `;
    } else {
        container.innerHTML = allData.inquiries.map(i => `
            <div class="inquiry-item">
                <div class="inquiry-header">
                    <div class="inquiry-client">${i.client_name}</div>
                    <div class="inquiry-date">${new Date(i.created_at).toLocaleDateString()}</div>
                </div>
                <div class="inquiry-message">${i.notes || i.subject || 'No message'}</div>
                <div class="inquiry-contact">
                    <strong>Email:</strong> ${i.client_email} · 
                    <strong>Phone:</strong> ${i.client_phone || 'N/A'}
                </div>
            </div>
        `).join('');
    }
}

// Load bookings
function loadBookings() {
    const container = document.getElementById('bookingsList');
    const vehicleSelect = document.getElementById('bookingVehicle');
    
    // Populate vehicle dropdown
    vehicleSelect.innerHTML = '<option value="">Select vehicle</option>' +
        allData.fleet.filter(v => v.status === 'Available').map(v => 
            `<option value="${v.id}">${v.name} - $${v.rate}/day</option>`
        ).join('');
    
    // Show bookings table
    if (allData.bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="calendar"></i>
                <p>No bookings yet</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="text-align: left; border-bottom: 2px solid var(--border);">
                        <th style="padding: 12px;">Client</th>
                        <th style="padding: 12px;">Destination</th>
                        <th style="padding: 12px;">Dates</th>
                        <th style="padding: 12px;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${allData.bookings.map(b => `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 12px;">${b.user_id || 'N/A'}</td>
                            <td style="padding: 12px;">${b.destination}</td>
                            <td style="padding: 12px;">${b.start_date}</td>
                            <td style="padding: 12px;">
                                <span class="status-badge status-${b.status?.toLowerCase()}">${b.status}</span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// Create booking
async function createBooking(e) {
    e.preventDefault();
    
    const booking = {
        user_id: currentUser.id,
        vehicle_id: document.getElementById('bookingVehicle').value,
        destination: document.getElementById('bookingDestination').value,
        start_date: document.getElementById('bookingStart').value,
        end_date: document.getElementById('bookingEnd').value,
        travelers: document.getElementById('bookingTravelers').value,
        amount: allData.fleet.find(v => v.id == document.getElementById('bookingVehicle').value)?.rate || 0,
        status: 'Confirmed'
    };
    
    try {
        const response = await fetch(`${API_URL}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Booking created successfully!');
            document.getElementById('bookingForm').reset();
            await loadAllData();
        } else {
            alert('Failed to create booking');
        }
    } catch (error) {
        console.error('Booking error:', error);
        alert('Connection error');
    }
}

// Show/hide sections
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event?.target?.closest('.nav-link')?.classList.add('active');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Logout
function logout() {
    sessionStorage.removeItem('twende_user');
    window.location.href = 'index.html';
}