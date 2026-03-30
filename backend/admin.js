// API Base URL
const API_URL = 'https://twende-tours-production.up.railway.app';

let currentUser = null;
let allBookings = [];
let allFleet = [];
let allUsers = [];
let allInquiries = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('twende_user'));
    
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = 'index.html';
        return;
    }
    
    await loadDashboard();
    
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

// Load dashboard
async function loadDashboard() {
    try {
        const [bookings, fleet, users, inquiries] = await Promise.all([
            fetch(`${API_URL}/api/bookings`).then(r => r.json()),
            fetch(`${API_URL}/api/fleet`).then(r => r.json()),
            fetch(`${API_URL}/api/users`).then(r => r.json()),
            fetch(`${API_URL}/api/inquiries`).then(r => r.json())
        ]);
        
        allBookings = bookings.data || [];
        allFleet = fleet.data || [];
        allUsers = users.data || [];
        allInquiries = inquiries.data || [];
        
        // Update stats
        document.getElementById('totalBookings').textContent = allBookings.length;
        document.getElementById('pendingBookings').textContent = 
            allBookings.filter(b => b.status === 'Pending').length;
        document.getElementById('totalRevenue').textContent = 
            `$${allBookings.reduce((sum, b) => sum + (b.amount || 0), 0)}`;
        document.getElementById('availableVehicles').textContent = 
            allFleet.filter(v => v.status === 'Available').length;
        
        // Load recent bookings
        loadRecentBookings();
        loadAllBookings();
        loadFleet();
        loadUsers();
        loadInquiries();
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

// Load recent bookings
function loadRecentBookings() {
    const container = document.getElementById('recentBookings');
    const recent = allBookings.slice(0, 5);
    
    container.innerHTML = recent.map(b => `
        <div class="booking-item">
            <div>
                <strong>Booking #${b.id}</strong> - ${b.destination}
                <br><small>Client: ${b.user_id} | ${b.start_date}</small>
            </div>
            <span class="badge">${b.status}</span>
        </div>
    `).join('');
}

// Load all bookings
function loadAllBookings() {
    const container = document.getElementById('allBookings');
    
    container.innerHTML = `
        <div class="bookings-table">
            ${allBookings.map(b => `
                <div class="booking-item">
                    <div>
                        <strong>#${b.id}</strong> - ${b.destination}
                        <br><small>Vehicle: ${b.vehicle_id} | Travelers: ${b.travelers}</small>
                    </div>
                    <div>
                        <span>${b.status}</span>
                        ${b.status === 'Pending' ? `
                            <button class="btn-approve" onclick="updateBookingStatus(${b.id}, 'Confirmed')">Approve</button>
                            <button class="btn-reject" onclick="updateBookingStatus(${b.id}, 'Cancelled')">Reject</button>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Update booking status
async function updateBookingStatus(bookingId, status) {
    try {
        await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        alert(`Booking ${status}`);
        loadDashboard();
    } catch (error) {
        alert('Failed to update booking');
    }
}

// Load fleet
function loadFleet() {
    const container = document.getElementById('fleetList');
    
    container.innerHTML = allFleet.map(v => `
        <div class="fleet-card">
            <h3>${v.name}</h3>
            <p>Type: ${v.type}</p>
            <p>Rate: KES ${v.rate}/day</p>
            <p>Seats: ${v.seats}</p>
            <p>Status: ${v.status}</p>
        </div>
    `).join('');
}

// Load users
function loadUsers() {
    const pendingContainer = document.getElementById('pendingUsers');
    const allContainer = document.getElementById('allUsers');
    
    const pending = allUsers.filter(u => u.role === 'staff' && !u.is_approved);
    
    pendingContainer.innerHTML = pending.map(u => `
        <div class="user-item">
            <div class="user-info">
                <div class="user-name">${u.name}</div>
                <div class="user-email">${u.email}</div>
            </div>
            <button class="btn-approve" onclick="approveUser(${u.id})">Approve</button>
        </div>
    `).join('');
    
    allContainer.innerHTML = allUsers.map(u => `
        <div class="user-item">
            <div class="user-info">
                <div class="user-name">${u.name}</div>
                <div class="user-email">${u.email} (${u.role})</div>
            </div>
            <span>${u.is_approved ? '✓' : '⏳'}</span>
        </div>
    `).join('');
}

// Approve user
async function approveUser(userId) {
    try {
        await fetch(`${API_URL}/api/users/${userId}/approve`, {
            method: 'PUT'
        });
        
        alert('User approved');
        loadDashboard();
    } catch (error) {
        alert('Failed to approve user');
    }
}

// Load inquiries
function loadInquiries() {
    const container = document.getElementById('inquiriesList');
    
    container.innerHTML = allInquiries.map(i => `
        <div class="inquiry-card ${i.status === 'NO ACTION' ? 'new' : ''}">
            <div class="inquiry-header">
                <div class="inquiry-client">${i.client_name}</div>
                <span class="inquiry-status ${i.status === 'NO ACTION' ? 'new' : 'replied'}">${i.status}</span>
            </div>
            <p><strong>Email:</strong> ${i.client_email}</p>
            <p><strong>Destination:</strong> ${i.destination}</p>
            <p><strong>Notes:</strong> ${i.notes}</p>
            ${i.status === 'NO ACTION' ? `
                <button class="btn-approve" onclick="markInquiryReplied(${i.id})">Mark as Replied</button>
            ` : ''}
        </div>
    `).join('');
}

// Mark inquiry replied
async function markInquiryReplied(inquiryId) {
    try {
        await fetch(`${API_URL}/api/inquiries/${inquiryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Replied' })
        });
        
        alert('Inquiry marked as replied');
        loadDashboard();
    } catch (error) {
        alert('Failed to update inquiry');
    }
}

// Show/hide sections
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.target.classList.add('active');
}

// Add vehicle modal
function openAddVehicleModal() {
    document.getElementById('vehicleModal').classList.remove('hidden');
}

function closeAddVehicleModal() {
    document.getElementById('vehicleModal').classList.add('hidden');
}

// Add vehicle
async function addVehicle(e) {
    e.preventDefault();
    
    const vehicle = {
        name: document.getElementById('vehicleName').value,
        type: document.getElementById('vehicleType').value,
        rate: document.getElementById('vehicleRate').value,
        seats: document.getElementById('vehicleSeats').value,
        status: 'Available'
    };
    
    // Note: You'll need to add POST /api/fleet endpoint
    alert('Vehicle added! (Backend endpoint needed)');
    closeAddVehicleModal();
    loadDashboard();
}

// Logout
function handleLogout() {
    sessionStorage.removeItem('twende_user');
    window.location.href = 'index.html';
}