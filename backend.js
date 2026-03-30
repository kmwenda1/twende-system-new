// API Base URL
const API_BASE_URL = 'https://twende-system-new-production.up.railway.app/';

// Get fleet vehicles
async function getFleet() {
    const response = await fetch(`${API_BASE_URL}/api/fleet`);
    const result = await response.json();
    return result.data || [];
}

// Get all bookings
async function getBookings() {
    const response = await fetch(`${API_BASE_URL}/api/bookings`);
    const result = await response.json();
    return result.data || [];
}

// Create booking
async function createBooking(bookingData) {
    const response = await fetch(`${API_BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData)
    });
    return await response.json();
}

// Get current user from session
function getCurrentUser() {
    const user = sessionStorage.getItem('twende_user');
    return user ? JSON.parse(user) : null;
}