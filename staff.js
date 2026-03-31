const API_URL = 'https://twende-system-new-production.up.railway.app';
let currentUser = null;
let allData = {
    bookings: [],
    fleet: [],
    inquiries: []
};
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();
let selectedBookingId = null;

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
    renderCalendar();
    
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
        loadPendingBookings();
        populateVehicleSelect();
        renderCalendar();
        
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
}

// Load pending bookings for approval
function loadPendingBookings() {
    const container = document.getElementById('pendingBookings');
    const pending = allData.bookings.filter(b => b.status === 'Pending');
    
    if (pending.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="check-circle" class="empty-icon"></i>
                <p>No pending bookings to approve</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = pending.map(booking => `
        <div class="pending-booking-card">
            <div class="pending-booking-header">
                <div>
                    <div class="pending-booking-client">${booking.client_name || 'Unknown Client'}</div>
                    <div class="pending-booking-dates">
                        ${booking.destination} · ${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}
                    </div>
                    <div class="pending-booking-dates">
                        Vehicle: ${booking.vehicle_name || `#${booking.vehicle_id}`} · ${booking.travelers} travelers
                    </div>
                </div>
                <span class="status-badge status-pending">Pending</span>
            </div>
            ${booking.notes ? `<p style="color: var(--gray); margin: 12px 0;">${booking.notes}</p>` : ''}
            <div class="pending-booking-actions">
                <button onclick="viewBooking(${booking.id})" class="btn-primary btn-small">
                    <i data-lucide="eye"></i> View Details
                </button>
                <button onclick="quickApprove(${booking.id}, 'Confirmed')" class="btn-approve btn-small">
                    <i data-lucide="check"></i> Approve
                </button>
                <button onclick="quickApprove(${booking.id}, 'Cancelled')" class="btn-reject btn-small">
                    <i data-lucide="x"></i> Reject
                </button>
            </div>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// View booking details
function viewBooking(bookingId) {
    const booking = allData.bookings.find(b => b.id === bookingId);
    if (!booking) return;
    
    selectedBookingId = bookingId;
    
    const details = document.getElementById('bookingDetails');
    details.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Client</span>
            <span class="detail-value">${booking.client_name || 'Unknown'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Destination</span>
            <span class="detail-value">${booking.destination}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Vehicle</span>
            <span class="detail-value">${booking.vehicle_name || `#${booking.vehicle_id}`}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Dates</span>
            <span class="detail-value">${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Travelers</span>
            <span class="detail-value">${booking.travelers}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Amount</span>
            <span class="detail-value">$${booking.amount}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="detail-value"><span class="status-badge status-${booking.status.toLowerCase()}">${booking.status}</span></span>
        </div>
        ${booking.notes ? `
        <div class="detail-row" style="flex-direction: column; align-items: flex-start;">
            <span class="detail-label" style="margin-bottom: 8px;">Notes</span>
            <span class="detail-value">${booking.notes}</span>
        </div>
        ` : ''}
    `;
    
    document.getElementById('bookingModal').classList.remove('hidden');
}

// Close booking modal
function closeBookingModal() {
    document.getElementById('bookingModal').classList.add('hidden');
    selectedBookingId = null;
}

// Approve booking
async function approveBooking(status) {
    if (!selectedBookingId) return;
    
    try {
        const response = await fetch(`${API_URL}/api/bookings/${selectedBookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Booking ${status === 'Confirmed' ? 'approved' : 'rejected'} successfully!`);
            closeBookingModal();
            await loadAllData();
        } else {
            alert('Failed to update booking');
        }
    } catch (err) {
        console.error('Error approving booking:', err);
        alert('Connection error');
    }
}

// Quick approve from dashboard
async function quickApprove(bookingId, status) {
    if (!confirm(`Are you sure you want to ${status === 'Confirmed' ? 'approve' : 'reject'} this booking?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Booking ${status === 'Confirmed' ? 'approved' : 'rejected'} successfully!`);
            await loadAllData();
        } else {
            alert('Failed to update booking');
        }
    } catch (err) {
        console.error('Error approving booking:', err);
        alert('Connection error');
    }
}

// Check availability before creating booking
async function checkAvailability() {
    const vehicleId = document.getElementById('bookingVehicle').value;
    const startDate = document.getElementById('bookingStart').value;
    const endDate = document.getElementById('bookingEnd').value;
    const messageEl = document.getElementById('availabilityMessage');
    
    if (!vehicleId || !startDate || !endDate) {
        messageEl.textContent = '';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/api/bookings/check-availability`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vehicle_id: vehicleId,
                start_date: startDate,
                end_date: endDate
            })
        });
        
        const result = await response.json();
        
        if (result.available) {
            messageEl.textContent = '✓ Vehicle is available for selected dates';
            messageEl.className = 'form-message success';
        } else {
            messageEl.textContent = '✗ Vehicle is not available for selected dates';
            messageEl.className = 'form-message error';
        }
    } catch (err) {
        console.error('Error checking availability:', err);
    }
}

// Render calendar
function renderCalendar() {
    const calendarDays = document.getElementById('calendarDays');
    const calendarMonth = document.getElementById('calendarMonth');
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    
    calendarMonth.textContent = `${monthNames[currentMonth - 1]} ${currentYear}`;
    
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    let html = '';
    
    // Empty days
    for (let i = 0; i < firstDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Days with bookings
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayBookings = allData.bookings.filter(b => {
            const start = new Date(b.start_date);
            const end = new Date(b.end_date);
            const current = new Date(dateStr);
            return current >= start && current <= end && b.status !== 'Cancelled';
        });
        
        const isToday = new Date().toDateString() === new Date(currentYear, currentMonth - 1, day).toDateString();
        
        html += `
            <div class="calendar-day ${isToday ? 'today' : ''}">
                <div class="calendar-day-number">${day}</div>
                ${dayBookings.map(b => `
                    <div class="calendar-booking ${b.status.toLowerCase()}">
                        ${b.client_name || 'Booking'}
                    </div>
                `).join('')}
            </div>
        `;
    }
    
    calendarDays.innerHTML = html;
}

// Change month in calendar
function changeMonth(delta) {
    currentMonth += delta;
    if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
    } else if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
    }
    renderCalendar();
}

// Format date
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Populate vehicle select
function populateVehicleSelect() {
    const select = document.getElementById('bookingVehicle');
    select.innerHTML = '<option value="">Select vehicle</option>' +
        allData.fleet.filter(v => v.status === 'Available').map(v => 
            `<option value="${v.id}">${v.name} - $${v.rate}/day</option>`
        ).join('');
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
                <div class="booking-client">${b.client_name || 'Unknown Client'}</div>
                <div class="booking-details">
                    ${b.destination} · ${formatDate(b.start_date)} - ${formatDate(b.end_date)}
                </div>
                <div class="booking-details">
                    Vehicle: ${b.vehicle_name || `#${b.vehicle_id}`} · ${b.travelers} travelers
                </div>
            </div>
            <div style="text-align: right;">
                <span class="status-badge status-${(b.status || 'pending').toLowerCase()}">${b.status || 'Pending'}</span>
                ${b.status === 'Pending' ? `
                    <div style="margin-top: 8px;">
                        <button onclick="quickApprove(${b.id}, 'Confirmed')" class="btn-approve btn-small" style="margin-right: 8px;">
                            <i data-lucide="check" width="14"></i>
                        </button>
                        <button onclick="quickApprove(${b.id}, 'Cancelled')" class="btn-reject btn-small">
                            <i data-lucide="x" width="14"></i>
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Create booking
async function createBooking(e) {
    e.preventDefault();
    
    // Check availability first
    const vehicleId = document.getElementById('bookingVehicle').value;
    const startDate = document.getElementById('bookingStart').value;
    const endDate = document.getElementById('bookingEnd').value;
    
    const availabilityResponse = await fetch(`${API_URL}/api/bookings/check-availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            vehicle_id: vehicleId,
            start_date: startDate,
            end_date: endDate
        })
    });
    
    const availability = await availabilityResponse.json();
    
    if (!availability.available) {
        alert('Vehicle is not available for selected dates. Please choose different dates or vehicle.');
        return;
    }
    
    const booking = {
        user_id: currentUser.id,
        vehicle_id: vehicleId,
        destination: document.getElementById('bookingDestination').value,
        start_date: startDate,
        end_date: endDate,
        travelers: document.getElementById('bookingTravelers').value,
        amount: allData.fleet.find(v => v.id == vehicleId)?.rate || 0,
        notes: document.getElementById('bookingNotes').value,
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
            alert('Booking created successfully! Awaiting approval.');
            document.getElementById('bookingForm').reset();
            await loadAllData();
        } else {
            alert(result.message || 'Failed to create booking');
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
    
    if (sectionId === 'calendar') {
        renderCalendar();
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}



// Load old inquiries that need attention (no reply after 24 hours)
async function loadOldInquiries() {
    try {
        const response = await fetch(`${API_URL}/api/inquiries/old`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            // Show visual notification in UI
            const inboxSection = document.getElementById('inbox');
            const oldBadge = document.createElement('span');
            oldBadge.className = 'badge urgent';
            oldBadge.textContent = `⚠️ ${result.data.length} old`;
            oldBadge.style.cssText = 'background: #ef4444; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; margin-left: 12px;';
            
            // Add badge to nav link if not already present
            const inboxNav = document.querySelector('.nav-link[onclick*="inbox"]');
            if (inboxNav && !document.querySelector('.badge.urgent')) {
                inboxNav.appendChild(oldBadge);
            }
            
            // Also show alert on first load
            if (!sessionStorage.getItem('oldInquiriesShown')) {
                alert(`⚠️ You have ${result.data.length} inquiry(ies) older than 24 hours that need attention!`);
                sessionStorage.setItem('oldInquiriesShown', 'true');
            }
        }
    } catch (err) {
        console.error('Error loading old inquiries:', err);
    }
}

// Update loadInquiries to show reply status and old inquiry warning
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
    
    container.innerHTML = allData.inquiries.map(i => {
        // Check if inquiry is old (more than 24 hours without reply)
        const createdDate = new Date(i.created_at);
        const now = new Date();
        const hoursOld = (now - createdDate) / (1000 * 60 * 60);
        const isOld = hoursOld > 24 && i.status === 'NO ACTION';
        
        return `
            <div class="inquiry-item ${isOld ? 'urgent' : ''}">
                <div class="inquiry-header">
                    <div>
                        <div class="inquiry-client">${i.client_name || 'Unknown'}</div>
                        <div class="inquiry-date">
                            ${i.created_at ? new Date(i.created_at).toLocaleDateString() : 'N/A'}
                            ${isOld ? '<span class="urgent-badge">⚠️ Old</span>' : ''}
                        </div>
                    </div>
                    <span class="status-badge status-${(i.source || 'website').toLowerCase()}">${i.source || 'Website'}</span>
                </div>
                <div class="inquiry-message">${i.notes || i.subject || 'No message'}</div>
                <div class="inquiry-contact">
                    <strong>Email:</strong> ${i.client_email || 'N/A'} · 
                    <strong>Phone:</strong> ${i.client_phone || 'N/A'}
                    ${i.destination ? ` · <strong>Destination:</strong> ${i.destination}` : ''}
                </div>
                ${i.reply_notes ? `
                    <div class="inquiry-reply">
                        <strong>Reply:</strong> ${i.reply_notes}
                        <small style="color: var(--gray);">(${new Date(i.replied_at).toLocaleString()})</small>
                    </div>
                ` : `
                    ${isOld ? '<div class="inquiry-reminder">⏰ No reply yet - please respond!</div>' : ''}
                `}
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Initialize - add old inquiries check
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('twende_user'));
    
    if (!currentUser || (currentUser.role !== 'staff' && currentUser.role !== 'admin')) {
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('staffName').textContent = currentUser.name || 'Staff';
    document.getElementById('dashStaffName').textContent = currentUser.name || 'Staff';
    await loadAllData();
    renderCalendar();
    loadOldInquiries(); // Check for old inquiries that need attention
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
});



// Logout
function logout() {
    sessionStorage.removeItem('twende_user');
    window.location.href = 'index.html';
}