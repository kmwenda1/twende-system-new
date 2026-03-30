const API_URL = 'https://twende-tours-production.up.railway.app';
let currentUser = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = JSON.parse(sessionStorage.getItem('twende_user'));
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'staff')) {
        window.location.href = 'index.html';
        return;
    }
    
    await loadDashboard();
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// Load dashboard
async function loadDashboard() {
    const bookings = await fetch(`${API_URL}/api/bookings`).then(r => r.json());
    const inquiries = await fetch(`${API_URL}/api/inquiries`).then(r => r.json());
    
    const allBookings = bookings.data || [];
    const allInquiries = inquiries.data || [];
    
    document.getElementById('totalBookings').textContent = allBookings.length;
    document.getElementById('pendingBookings').textContent = allBookings.filter(b => b.status === 'Pending').length;
    document.getElementById('newInquiries').textContent = allInquiries.filter(i => i.status === 'NO ACTION').length;
    
    loadBookingsTable(allBookings);
    loadInquiries(allInquiries);
}

// Load bookings table
function loadBookingsTable(bookings) {
    const container = document.getElementById('bookingsTable');
    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>ID</th><th>Client</th><th>Destination</th><th>Date</th><th>Status</th><th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${bookings.map(b => `
                    <tr>
                        <td>#${b.id}</td>
                        <td>${b.user_id}</td>
                        <td>${b.destination}</td>
                        <td>${b.start_date}</td>
                        <td>${b.status}</td>
                        <td>
                            ${b.status === 'Pending' ? `
                                <button class="btn-sm btn-approve" onclick="updateBookingStatus(${b.id}, 'Confirmed')">Approve</button>
                                <button class="btn-sm btn-reject" onclick="updateBookingStatus(${b.id}, 'Cancelled')">Reject</button>
                            ` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Load inquiries
function loadInquiries(inquiries) {
    const container = document.getElementById('inquiriesList');
    container.innerHTML = inquiries.map(i => `
        <div class="inquiry-card">
            <h3>${i.client_name}</h3>
            <p>Email: ${i.client_email}</p>
            <p>Destination: ${i.destination}</p>
            <p>Status: ${i.status}</p>
            ${i.status === 'NO ACTION' ? `
                <button class="btn-sm btn-approve" onclick="updateInquiryStatus(${i.id}, 'Replied')">Mark Replied</button>
            ` : ''}
        </div>
    `).join('');
}

// Update booking status
async function updateBookingStatus(bookingId, status) {
    await fetch(`${API_URL}/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    alert(`Booking ${status}`);
    loadDashboard();
}

// Update inquiry status
async function updateInquiryStatus(inquiryId, status) {
    await fetch(`${API_URL}/api/inquiries/${inquiryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
    alert('Inquiry updated');
    loadDashboard();
}

// Show/hide sections
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.target.classList.add('active');
}

// Logout
function handleLogout() {
    sessionStorage.removeItem('twende_user');
    window.location.href = 'index.html';
}