const API_URL = 'https://twende-system-new-production.up.railway.app';
let currentUser = null;
let allVehicles = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('twende_user'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    updateUserInfo();
    await loadDashboard();
    await loadFleet();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Modal: close on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeBookingModal();
    });
});

// Update user info
function updateUserInfo() {
    document.getElementById('userName').textContent = currentUser.name || 'Client';
    document.getElementById('profileName').textContent = currentUser.name || '';
    document.getElementById('profileEmail').textContent = currentUser.email || '';
    document.getElementById('profilePhone').textContent = currentUser.phone || '';
}

// Show/hide sections
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event?.target?.closest('.nav-link')?.classList.add('active');
    
    if (sectionId === 'dashboard') loadDashboard();
    if (sectionId === 'bookings') loadBookings();
}

// Load dashboard
async function loadDashboard() {
    try {
        const bookings = await fetch(`${API_URL}/api/bookings`).then(r => r.json());
        const userBookings = bookings.data?.filter(b => b.user_id === currentUser.id) || [];
        
        document.getElementById('totalTrips').textContent = userBookings.length;
        document.getElementById('upcomingTrips').textContent = 
            userBookings.filter(b => b.status === 'Pending' || b.status === 'Confirmed').length;
        document.getElementById('totalSpent').textContent = 
            `$${userBookings.reduce((sum, b) => sum + (b.amount || 0), 0)}`;
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

// Load fleet
async function loadFleet() {
    try {
        const response = await fetch(`${API_URL}/api/fleet`);
        const result = await response.json();
        allVehicles = result.data || [];
        
        const grid = document.getElementById('fleetGrid');
        grid.innerHTML = allVehicles.map(v => `
            <div class="vehicle-card">
                <img src="${v.image_url || 'https://via.placeholder.com/400x200'}" alt="${v.name}">
                <div class="vehicle-info">
                    <h3>${v.name}</h3>
                    <p class="vehicle-type">${v.type}</p>
                    <div class="vehicle-price">$${v.rate}/day</div>
                    <span class="status-badge status-${v.status?.toLowerCase()}">${v.status}</span>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading fleet:', err);
    }
}

// Load bookings
async function loadBookings() {
    try {
        const response = await fetch(`${API_URL}/api/bookings`);
        const result = await response.json();
        const userBookings = result.data?.filter(b => b.user_id === currentUser.id) || [];
        
        const list = document.getElementById('bookingsList');
        list.innerHTML = userBookings.map(b => `
            <div class="booking-card">
                <h3>${b.destination}</h3>
                <p>Vehicle: #${b.vehicle_id}</p>
                <p>Date: ${b.start_date}</p>
                <p>Travelers: ${b.travelers}</p>
                <p>Status: <strong>${b.status}</strong></p>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error loading bookings:', err);
    }
}

// Booking modal - FIXED
function openBookingModal() {
    const select = document.getElementById('vehicleSelect');
    select.innerHTML = '<option value="">Select a vehicle</option>' +
        allVehicles.filter(v => v.status === 'Available').map(v => 
            `<option value="${v.id}">${v.name} - $${v.rate}/day</option>`
        ).join('');
    
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').min = today;
    
    document.getElementById('bookingModal').classList.remove('hidden');
}

function closeBookingModal() {
    document.getElementById('bookingModal').classList.add('hidden');
    document.getElementById('bookingForm').reset();
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('bookingModal');
    if (e.target === modal) closeBookingModal();
});

// Submit booking
async function submitBooking(e) {
    e.preventDefault();
    
    const vehicleId = document.getElementById('vehicleSelect').value;
    const vehicle = allVehicles.find(v => v.id == vehicleId);
    
    const booking = {
        user_id: currentUser.id,
        vehicle_id: vehicleId,
        destination: document.getElementById('destination').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('startDate').value,
        travelers: document.getElementById('travelers').value,
        amount: vehicle ? vehicle.rate : 0
    };
    
    try {
        const response = await fetch(`${API_URL}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Booking submitted successfully!');
            closeBookingModal();
            loadDashboard();
        } else {
            alert('Failed: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Booking error:', error);
        alert('Connection error. Please try again.');
    }
}

// Logout
function logout() {
    sessionStorage.removeItem('twende_user');
    window.location.href = 'index.html';
}