const API_URL = 'https://twende-system-new-production.up.railway.app';
let currentUser = null;
let allData = {
    bookings: [],
    fleet: [],
    inquiries: []
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('twende_user'));
    
    if (!currentUser || (currentUser.role !== 'staff' && currentUser.role !== 'admin')) {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('staffName').textContent = currentUser.name || 'Staff';
    document.getElementById('dashStaffName').textContent = currentUser.name || 'Staff';
    await loadAllData();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// Load all data
async function loadAllData() {
    try {
        const [bookingsRes, fleetRes, inquiriesRes] = await Promise.all([
            fetch(`${API_URL}/api/bookings`),
            fetch(`${API_URL}/api/fleet`),
            fetch(`${API_URL}/api/inquiries`)
        ]);
        
        const bookingsData = await bookingsRes.json();
        const fleetData = await fleetRes.json();
        const inquiriesData = await inquiriesRes.json();
        
        allData = {
            bookings: Array.isArray(bookingsData.data) ? bookingsData.data : [],
            fleet: Array.isArray(fleetData.data) ? fleetData.data : [],
            inquiries: Array.isArray(inquiriesData.data) ? inquiriesData.data : []
        };
        
        updateDashboard();
        loadFleet();
        loadInquiries();
        loadBookings();
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        console.error('Error loading data:', err);
    }
}

// Update dashboard
function updateDashboard() {
    const { bookings } = allData;
    
    const active = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending').length;
    const total = bookings.length;
    const completed = bookings.filter(b => b.status === 'Completed').length;
    
    document.getElementById('activeTrips').textContent = active;
    document.getElementById('totalSafaris').textContent = total;
    document.getElementById('completedTrips').textContent = completed;
    
    // Load recent bookings
    const recentContainer = document.getElementById('recentBookings');
    const recent = bookings.slice(0, 3);
    
    if (recent.length === 0) {
        recentContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="map-pin" class="empty-icon"></i>
                <p>No safaris booked yet. Browse the fleet to get started!</p>
            </div>
        `;
    } else {
        recentContainer.innerHTML = recent.map(b => `
            <div class="booking-item">
                <div class="booking-info">
                    <div class="booking-client">${b.destination}</div>
                    <div class="booking-details">${b.start_date} - ${b.end_date}</div>
                </div>
                <span class="status-badge status-${b.status?.toLowerCase()}">${b.status}</span>
            </div>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Load fleet
function loadFleet() {
    const container = document.getElementById('fleetList');
    
    if (!allData.fleet || allData.fleet.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="truck"></i>
                <p>No vehicles in fleet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allData.fleet.map(v => `
        <div class="fleet-item">
            <div class="fleet-info">
                <div class="fleet-name">${v.name || 'Unknown Vehicle'}</div>
                <div class="fleet-details">${v.type || 'N/A'} · $${v.rate || 0}/day</div>
            </div>
            <div class="fleet-status">
                <span class="status-badge status-${(v.status || 'available').toLowerCase()}">${v.status || 'Available'}</span>
                <select class="status-select" onchange="updateFleetStatus(${v.id}, this.value)">
                    <option value="Available" ${(v.status === 'Available') ? 'selected' : ''}>Available</option>
                    <option value="Booked" ${(v.status === 'Booked') ? 'selected' : ''}>Booked</option>
                    <option value="Maintenance" ${(v.status === 'Maintenance') ? 'selected' : ''}>Maintenance</option>
                </select>
            </div>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Update fleet status
async function updateFleetStatus(vehicleId, status) {
    try {
        const response = await fetch(`${API_URL}/api/fleet/${vehicleId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        const result = await response.json();
        
        if (result.success) {
            const vehicle = allData.fleet.find(v => v.id === vehicleId);
            if (vehicle) {
                vehicle.status = status;
            }
            alert(`Vehicle status updated to ${status}`);
        } else {
            alert('Failed to update fleet status');
        }
    } catch (err) {
        console.error('Error updating fleet:', err);
        alert('Connection error');
    }
}

// Load inquiries
function loadInquiries() {
    const container = document.getElementById('inboxList');
    
    if (!allData.inquiries || allData.inquiries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="inbox"></i>
                <p>No inquiries yet.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allData.inquiries.map(i => `
        <div class="inquiry-item">
            <div class="inquiry-header">
                <div class="inquiry-client">${i.client_name || 'Unknown'}</div>
                <div class="inquiry-date">${i.created_at ? new Date(i.created_at).toLocaleDateString() : 'N/A'}</div>
            </div>
            <div class="inquiry-message">${i.notes || i.subject || 'No message'}</div>
            <div class="inquiry-contact">
                <strong>Email:</strong> ${i.client_email || 'N/A'} · 
                <strong>Phone:</strong> ${i.client_phone || 'N/A'}
            </div>
        </div>
    `).join('');
}

// Load bookings
function loadBookings() {
    const container = document.getElementById('bookingsList');
    const vehicleSelect = document.getElementById('bookingVehicle');
    
    if (!vehicleSelect) return;
    
    vehicleSelect.innerHTML = '<option value="">Select vehicle</option>' +
        (allData.fleet || []).filter(v => v.status === 'Available').map(v => 
            `<option value="${v.id}">${v.name} - $${v.rate}/day</option>`
        ).join('');
    
    if (!allData.bookings || allData.bookings.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="calendar"></i>
                <p>No bookings yet</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allData.bookings.map(b => `
        <div class="booking-item">
            <div class="booking-info">
                <div class="booking-client">${b.destination}</div>
                <div class="booking-details">${b.start_date} to ${b.end_date} · ${b.travelers} travelers</div>
            </div>
            <span class="status-badge status-${(b.status || 'pending').toLowerCase()}">${b.status || 'Pending'}</span>
        </div>
    `).join('');
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