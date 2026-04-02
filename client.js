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
                    <p><i data-lucide="calendar"></i> ${formatDate(b.start_date)} - ${formatDate(b.end_date)}</p>
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

// Curated Unsplash direct CDN photo IDs per vehicle category.
// These are permanent stable links — no API key required.
const VEHICLE_PHOTOS = {
    fourwd: [
        'photo-1519641471654-76ce0107ad1b', // safari Land Cruiser in grass
        'photo-1532236204992-f5e85c024202', // 4WD offroad
        'photo-1574375927938-d5a98e8ffe85', // safari jeep on dusty road
        'photo-1567473165935-bce4dd1b1c0b', // Land Rover Defender
        'photo-1516026672322-bc52d61a55d5', // safari truck at sunset
    ],
    van: [
        'photo-1544620347-c4fd4a3d5957', // white minibus/van
        'photo-1494976388531-d1058494cdd8', // VW-style van
        'photo-1558618047-3c8c4c4c4c4c', // HiAce-style minibus
    ],
    bus: [
        'photo-1570125909232-eb263c188f7e', // coach bus on road
        'photo-1464375117522-1311d19bc8a4', // touring bus
    ],
};

// Return a safari-appropriate image URL based on the vehicle type and name.
// If the vehicle has an image_url stored in the database, that takes priority.
// Otherwise a curated set of direct Unsplash CDN links is used so that the
// correct vehicle category is always shown. A seed derived from the vehicle ID
// or name ensures the same vehicle always shows the same picture.
function getVehicleImage(v) {
    if (v.image_url) return v.image_url;

    const type = (v.type || '').toLowerCase();
    const name = (v.name || '').toLowerCase();

    // Stable numeric seed so the same vehicle always gets the same photo
    const seed = v.id ? Number(v.id) : (v.name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);

    const isVan = type.includes('van') || type.includes('minibus') || type.includes('minivan') ||
                  type.includes('sprinter') || name.includes('hiace') || name.includes('van') ||
                  name.includes('minibus') || name.includes('sprinter');

    const isBus = type.includes('bus') || type.includes('coaster') ||
                  name.includes('bus') || name.includes('coaster');

    let photos;
    if (isVan) photos = VEHICLE_PHOTOS.van;
    else if (isBus) photos = VEHICLE_PHOTOS.bus;
    else photos = VEHICLE_PHOTOS.fourwd;

    const photoId = photos[seed % photos.length];
    return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=400&h=300&q=80`;
}

// Load fleet
async function loadFleet() {
    try {
        const response = await fetch(`${API_URL}/api/fleet`);
        const result = await response.json();
        allVehicles = result.data || [];
        
        const grid = document.getElementById('fleetGrid');
        grid.innerHTML = allVehicles.map(v => {
            const imageUrl = getVehicleImage(v);
            
            return `
                <div class="vehicle-card">
                    <img src="${imageUrl}" alt="${v.name}" class="vehicle-image" onerror="this.onerror=null;this.src='https://picsum.photos/seed/${v.id || 0}/400/300'">
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
                    <p><i data-lucide="calendar"></i> ${formatDate(b.start_date)} to ${formatDate(b.end_date)}</p>
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
                    <div class="inquiry-meta">
                        <span class="inquiry-source">${i.source || 'Website'}</span>
                        <span class="inquiry-status inquiry-${i.status?.toLowerCase().replace(' ', '-')}">${i.status}</span>
                    </div>
                    ${i.reply_notes ? `<p class="inquiry-reply"><strong>Reply:</strong> ${i.reply_notes}</p>` : ''}
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
        source: document.getElementById('inquirySource')?.value || 'Website',
        destination: document.getElementById('inquiryDestination')?.value || ''
    };
    
    console.log('📤 Submitting inquiry:', inquiry);
    
    try {
        const response = await fetch(`${API_URL}/api/inquiries`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inquiry)
        });
        
        console.log('📥 Response status:', response.status);
        const result = await response.json();
        console.log('📥 Response data:', result);
        
        if (result.success) {
            alert('✅ Inquiry submitted successfully! We\'ll get back to you soon.');
            closeInquiryModal();
            loadInquiries();
        } else {
            alert('❌ Failed to submit inquiry: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('❌ Inquiry error:', error);
        alert('Connection error. Please try again.');
    }
}

// Format date helper
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Logout
function logout() {
    sessionStorage.removeItem('twende_user');
    window.location.href = 'index.html';
}