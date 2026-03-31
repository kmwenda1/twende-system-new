const API_URL = 'https://twende-system-new-production.up.railway.app';
let currentUser = null;
let allData = {
    bookings: [],
    fleet: [],
    users: [],
    inquiries: [],
    pendingStaff: []
};

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
        console.log('Loading data from API...');
        
        const [bookingsRes, fleetRes, usersRes, inquiriesRes, pendingStaffRes] = await Promise.all([
            fetch(`${API_URL}/api/bookings`),
            fetch(`${API_URL}/api/fleet`),
            fetch(`${API_URL}/api/users`),
            fetch(`${API_URL}/api/inquiries`),
            fetch(`${API_URL}/api/staff/pending`)
        ]);
        
        console.log('Responses:', {
            bookings: bookingsRes.status,
            fleet: fleetRes.status,
            users: usersRes.status,
            inquiries: inquiriesRes.status,
            pendingStaff: pendingStaffRes.status
        });
        
        const bookingsData = await bookingsRes.json();
        const fleetData = await fleetRes.json();
        const usersData = await usersRes.json();
        const inquiriesData = await inquiriesRes.json();
        const pendingStaffData = await pendingStaffRes.json();
        
        console.log('Parsed data:', {
            bookings: bookingsData,
            fleet: fleetData,
            users: usersData,
            inquiries: inquiriesData,
            pendingStaff: pendingStaffData
        });
        
        // Ensure we always have arrays
        allData = {
            bookings: Array.isArray(bookingsData.data) ? bookingsData.data : (Array.isArray(bookingsData) ? bookingsData : []),
            fleet: Array.isArray(fleetData.data) ? fleetData.data : (Array.isArray(fleetData) ? fleetData : []),
            users: Array.isArray(usersData.data) ? usersData.data : (Array.isArray(usersData) ? usersData : []),
            inquiries: Array.isArray(inquiriesData.data) ? inquiriesData.data : (Array.isArray(inquiriesData) ? inquiriesData : []),
            pendingStaff: Array.isArray(pendingStaffData.data) ? pendingStaffData.data : (Array.isArray(pendingStaffData) ? pendingStaffData : [])
        };
        
        console.log('Final allData:', allData);
        
        updateDashboard();
        loadFleet();
        loadUsers();
        loadInquiries();
        loadBookings();
        loadStaffApprovals();
        
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        console.error('Error loading data:', err);
        alert('Error loading data. Please refresh the page.');
    }
}

// Update dashboard stats
function updateDashboard() {
    const { bookings, fleet, users } = allData;
    
    console.log('Updating dashboard with:', { bookings, fleet, users });
    
    // Ensure bookings is an array before filtering
    const bookingsArray = Array.isArray(bookings) ? bookings : [];
    const fleetArray = Array.isArray(fleet) ? fleet : [];
    const usersArray = Array.isArray(users) ? users : [];
    
    const revenue = bookingsArray
        .filter(b => b.status === 'Confirmed' || b.status === 'Completed')
        .reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
    
    const activeFleet = fleetArray.filter(v => v.status === 'Booked').length;
    const availableFleet = fleetArray.filter(v => v.status === 'Available').length;
    const clients = usersArray.filter(u => u.role === 'client').length;
    
    document.getElementById('dashRevenue').textContent = `$${revenue.toLocaleString()}`;
    document.getElementById('dashActiveFleet').textContent = activeFleet;
    document.getElementById('dashAvailableFleet').textContent = availableFleet;
    document.getElementById('dashClients').textContent = clients;
    
    document.getElementById('intelRevenue').textContent = `$${revenue.toLocaleString()}`;
    document.getElementById('intelActiveFleet').textContent = activeFleet;
    document.getElementById('intelAvailableFleet').textContent = availableFleet;
    document.getElementById('intelClients').textContent = clients;
    
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
    
    if (!allData.fleet || allData.fleet.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="truck"></i>
                <p>No vehicles in fleet. Add some vehicles first!</p>
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
                    <option value="Repair" ${(v.status === 'Repair') ? 'selected' : ''}>Repair</option>
                </select>
            </div>
        </div>
    `).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Update fleet status
async function updateFleetStatus(vehicleId, status) {
    try {
        console.log(`Updating vehicle ${vehicleId} to ${status}`);
        
        const response = await fetch(`${API_URL}/api/fleet/${vehicleId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        const result = await response.json();
        console.log('Update result:', result);
        
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
        alert('Connection error. Please try again.');
    }
}

// Load users
function loadUsers() {
    const container = document.getElementById('usersList');
    
    if (!allData.users || allData.users.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="users"></i>
                <p>No users found</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = allData.users.map(u => `
        <div class="user-item">
            <div class="user-item-info">
                <div class="user-item-name">${u.name || 'Unknown User'}</div>
                <div class="user-item-role">${u.role || 'client'} ${u.is_approved ? '✓' : '⏳'}</div>
            </div>
            <div class="user-item-date">${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</div>
        </div>
    `).join('');
}

// Load staff approvals
function loadStaffApprovals() {
    const pendingContainer = document.getElementById('pendingStaffList');
    const approvedContainer = document.getElementById('approvedStaffList');
    const badge = document.getElementById('pendingBadge');
    
    const pendingCount = allData.pendingStaff?.length || 0;
    if (pendingCount > 0) {
        badge.textContent = pendingCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
    
    if (!allData.pendingStaff || allData.pendingStaff.length === 0) {
        pendingContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="check-circle"></i>
                <p>No pending staff requests</p>
            </div>
        `;
    } else {
        pendingContainer.innerHTML = allData.pendingStaff.map(staff => `
            <div class="staff-request-card">
                <div class="staff-request-header">
                    <div class="staff-request-info">
                        <div class="staff-name">${staff.name}</div>
                        <div class="staff-email">${staff.email}</div>
                    </div>
                    <span class="status-badge status-pending">Pending</span>
                </div>
                <div class="staff-details">
                    <div class="staff-detail">
                        <i data-lucide="mail" width="16"></i>
                        <span>${staff.email}</span>
                    </div>
                    ${staff.phone ? `
                        <div class="staff-detail">
                            <i data-lucide="phone" width="16"></i>
                            <span>${staff.phone}</span>
                        </div>
                    ` : ''}
                    <div class="staff-detail">
                        <i data-lucide="calendar" width="16"></i>
                        <span>Requested ${new Date(staff.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="staff-actions">
                    <button class="btn-approve" onclick="approveStaff(${staff.id}, true)">
                        <i data-lucide="check" width="16"></i> Approve
                    </button>
                    <button class="btn-reject" onclick="approveStaff(${staff.id}, false)">
                        <i data-lucide="x" width="16"></i> Reject
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    const approvedStaff = allData.users?.filter(u => u.role === 'staff' && u.is_approved) || [];
    
    if (!approvedStaff || approvedStaff.length === 0) {
        approvedContainer.innerHTML = `
            <div class="empty-state">
                <i data-lucide="users"></i>
                <p>No approved staff yet</p>
            </div>
        `;
    } else {
        approvedContainer.innerHTML = approvedStaff.map(staff => `
            <div class="approved-staff-card">
                <div class="approved-staff-info">
                    <div class="user-avatar" style="width: 40px; height: 40px;">
                        <i data-lucide="user" style="width: 20px; height: 20px;"></i>
                    </div>
                    <div>
                        <div class="user-item-name">${staff.name}</div>
                        <div class="user-item-role">${staff.email}</div>
                    </div>
                </div>
                <span class="approved-badge">Approved</span>
            </div>
        `).join('');
    }
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Approve or reject staff
async function approveStaff(staffId, approved) {
    try {
        const action = approved ? 'approve' : 'reject';
        const confirmMsg = approved ? 
            'Approve this staff member? They will be able to login.' : 
            'Reject this staff request?';
        
        if (!confirm(confirmMsg)) return;
        
        const response = await fetch(`${API_URL}/api/staff/${staffId}/approve`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ approved })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert(`Staff ${approved ? 'approved' : 'rejected'} successfully!`);
            await loadAllData();
        } else {
            alert(`Failed to ${action} staff`);
        }
    } catch (err) {
        console.error('Staff approval error:', err);
        alert('Connection error. Please try again.');
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
                        <td style="padding: 12px;">${b.destination || 'N/A'}</td>
                        <td style="padding: 12px;">${b.start_date || 'N/A'}</td>
                        <td style="padding: 12px;">
                            <span class="status-badge status-${(b.status || 'pending').toLowerCase()}">${b.status || 'Pending'}</span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
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