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
        if (e.key === 'Escape') {
            closeBookingModal();
            closeInquiryModal();
        }
    });
});

// Update user info
function updateUserInfo() {
    const name = currentUser.name || 'Client';
    document.getElementById('userName').textContent = name;
    document.getElementById('dashUserName').textContent = name;
    document.getElementById('profileName').textContent = name;
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
    if (sectionId === 'inquiries') loadInquiries();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Load dashboard
async function loadDashboard() {
    try {
        const bookings = await fetch(`${API_URL}/api/bookings`).then(r => r.json());
        const userBookings = bookings.data?.filter(b => b.user_id === currentUser.id) || [];
        
        const active = userBookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending').length;
        const total = userBookings.length;
        const completed = userBookings.filter(b => b.status === 'Completed').length;
        
        document.getElementById('activeTrips').textContent = active;
        document.getElementById('totalTrips').textContent = total;
        document.getElementById('completedTrips').textContent = completed;
        
        // Show recent bookings
        const recentContainer = document.getElementById('recentBookings');
        const recent = userBookings.slice(0, 3);
        
        if (recent.length === 0) {
            recentContainer.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="map-pin" class="empty-icon"></i>
                    <p>No safaris booked yet. Browse the fleet to get started!</p>
                </div>
            `;
        } else {
            recentContainer.innerHTML = recent.map(b => `
                <div class="booking-card">
                    <h3>${b.destination}</h3>
                    <p><i data-lucide="calendar"></i> ${b.start_date} - ${b.end_date}</p>
                    <p><i data-lucide="users"></i> ${b.travelers} travelers</p>
                    <span class="booking-status status-${b.status.toLowerCase()}">${b.status}</span>
                </div>
            `).join('');
        }
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
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
        grid.innerHTML = allVehicles.map(v => {
            // Use placeholder images if no image_url
            const imageUrl = v.image_url || `https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop`;
            
            return `
                <div class="vehicle-card">
                    <img src="${imageUrl}" alt="${v.name}" class="vehicle-image" onerror="this.src='https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&h=300&fit=crop'">
                    <div class="vehicle-info">
                        <h3>${v.name}</h3>
                        <p class="vehicle-type"><i data-lucide="truck"></i> ${v.type}</p>
                        <div class="vehicle-price">$${v.rate} <span>/ day</span></div>
                        <span class="status-badge status-${v.status?.toLowerCase()}">${v.status}</span>
                    </div>
                </div>
            `;
        }).join('');
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
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
        
        if (userBookings.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="calendar" class="empty-icon"></i>
                    <p>No bookings yet. Request your first safari!</p>
                </div>
            `;
        } else {
            list.innerHTML = userBookings.map(b => `
                <div class="booking-card">
                    <h3>${b.destination}</h3>
                    <p><i data-lucide="calendar"></i> ${b.start_date} to ${b.end_date}</p>
                    <p><i data-lucide="users"></i> ${b.travelers} travelers</p>
                    <p><i data-lucide="dollar-sign"></i> $${b.amount}</p>
                    <span class="booking-status status-${b.status.toLowerCase()}">${b.status}</span>
                </div>
            `).join('');
        }
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        console.error('Error loading bookings:', err);
    }
}

// Load inquiries
async function loadInquiries() {
    try {
        const response = await fetch(`${API_URL}/api/inquiries`);
        const result = await response.json();
        const userInquiries = result.data?.filter(i => i.client_email === currentUser.email) || [];
        
        const list = document.getElementById('inquiriesList');
        
        if (userInquiries.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <i data-lucide="message-square" class="empty-icon"></i>
                    <p>No inquiries yet. Have a question? Submit one!</p>
                </div>
            `;
        } else {
            list.innerHTML = userInquiries.map(i => `
                <div class="inquiry-card">
                    <div class="inquiry-header">
                        <div class="inquiry-subject">${i.subject || 'Inquiry'}</div>
                        <div class="inquiry-date">${new Date(i.created_at).toLocaleDateString()}</div>
                    </div>
                    <p class="inquiry-message">${i.notes || i.message}</p>
                    <span class="inquiry-status inquiry-${i.status?.toLowerCase().replace(' ', '-')}">${i.status}</span>
                </div>
            `).join('');
        }
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        console.error('Error loading inquiries:', err);
    }
}

// Booking modal
function openBookingModal() {
    const select = document.getElementById('vehicleSelect');
    select.innerHTML = '<option value="">Choose a vehicle...</option>' +
        allVehicles.filter(v => v.status === 'Available').map(v => 
            `<option value="${v.id}">${v.name} - $${v.rate}/day</option>`
        ).join('');
    
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').min = today;
    document.getElementById('endDate').min = today;
    
    document.getElementById('bookingModal').classList.remove('hidden');
}

function closeBookingModal() {
    document.getElementById('bookingModal').classList.add('hidden');
    document.getElementById('bookingForm').reset();
}

// Inquiry modal
function openInquiryModal() {
    document.getElementById('inquiryModal').classList.remove('hidden');
}

function closeInquiryModal() {
    document.getElementById('inquiryModal').classList.add('hidden');
    document.getElementById('inquiryForm').reset();
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const bookingModal = document.getElementById('bookingModal');
    const inquiryModal = document.getElementById('inquiryModal');
    if (e.target === bookingModal) closeBookingModal();
    if (e.target === inquiryModal) closeInquiryModal();
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
        end_date: document.getElementById('endDate').value,
        travelers: document.getElementById('travelers').value,
        notes: document.getElementById('notes').value,
        amount: vehicle ? vehicle.rate : 0,
        status: 'Pending'
    };
    
    try {
        const response = await fetch(`${API_URL}/api/bookings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(booking)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Booking request submitted! Staff will review and confirm soon.');
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

// Submit inquiry
async function submitInquiry(e) {
    e.preventDefault();
    
    const inquiry = {
        client_name: currentUser.name,
        client_email: currentUser.email,
        client_phone: currentUser.phone || '',
        subject: document.getElementById('inquirySubject').value,
        notes: document.getElementById('inquiryMessage').value,
        source: 'Client Portal',
        status: 'NO ACTION'
    };
    
    try {
        const response = await fetch(`${API_URL}/api/inquiries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inquiry)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Inquiry submitted! We\'ll get back to you soon.');
            closeInquiryModal();
            loadInquiries();
        } else {
            alert('Failed to submit inquiry');
        }
    } catch (error) {
        console.error('Inquiry error:', error);
        alert('Connection error. Please try again.');
    }
}

// Logout
function logout() {
    sessionStorage.removeItem('twende_user');
    window.location.href = 'index.html';
}