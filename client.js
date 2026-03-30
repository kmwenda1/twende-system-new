const API_URL = 'https://twende-tours-production.up.railway.app';
let currentUser = null;
let allVehicles = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('twende_user'));
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('welcomeMessage').textContent = `Jambo, ${currentUser.name}!`;
    await loadDashboard();
    await loadVehicles();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// Load dashboard stats
async function loadDashboard() {
    const bookings = await fetch(`${API_URL}/api/bookings`).then(r => r.json());
    const userBookings = bookings.data?.filter(b => b.user_id === currentUser.id) || [];
    
    document.getElementById('totalTrips').textContent = userBookings.length;
    document.getElementById('upcomingTrips').textContent = userBookings.filter(b => b.status === 'Pending' || b.status === 'Confirmed').length;
    document.getElementById('totalSpent').textContent = `$${userBookings.reduce((sum, b) => sum + (b.amount || 0), 0)}`;
    
    loadBookingsList(userBookings);
}

// Load bookings list
function loadBookingsList(bookings) {
    const container = document.getElementById('bookingsList');
    container.innerHTML = bookings.map(b => `
        <div class="booking-card">
            <h3>${b.destination}</h3>
            <p>Vehicle: #${b.vehicle_id} | Date: ${b.start_date}</p>
            <p>Status: <strong>${b.status}</strong></p>
        </div>
    `).join('');
}

// Load vehicles for booking
async function loadVehicles() {
    const response = await fetch(`${API_URL}/api/fleet`);
    const result = await response.json();
    allVehicles = result.data || [];
    
    const select = document.getElementById('vehicleId');
    select.innerHTML = allVehicles.map(v => 
        `<option value="${v.id}">${v.name} - $${v.rate}/day</option>`
    ).join('');
}

// Show/hide sections
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.target.classList.add('active');
}

// Booking modal
function openBookingModal() {
    document.getElementById('bookingModal').classList.remove('hidden');
}

function closeBookingModal() {
    document.getElementById('bookingModal').classList.add('hidden');
}

// Submit booking
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const booking = {
        user_id: currentUser.id,
        vehicle_id: document.getElementById('vehicleId').value,
        destination: document.getElementById('destination').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('startDate').value,
        travelers: document.getElementById('travelers').value,
        amount: allVehicles.find(v => v.id == document.getElementById('vehicleId').value)?.rate || 0
    };
    
    const response = await fetch(`${API_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking)
    });
    
    const result = await response.json();
    if (result.success) {
        alert('Booking submitted! Staff will confirm soon.');
        closeBookingModal();
        loadDashboard();
    } else {
        alert('Failed to create booking');
    }
});

// Logout
function handleLogout() {
    sessionStorage.removeItem('twende_user');
    window.location.href = 'index.html';
}