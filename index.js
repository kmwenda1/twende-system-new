// API Base URL (Railway backend)
const API_URL = 'https://twende-system-new-production.up.railway.app';

// Initialize icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// Handle login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Save user to session
            sessionStorage.setItem('twende_user', JSON.stringify(result.user));
            
            // Route based on role
            if (result.role === 'admin' || result.role === 'staff') {
                window.location.href = 'staff.html';
            } else {
                window.location.href = 'client.html';
            }
        } else {
            errorDiv.textContent = result.message || 'Login failed';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Check your internet.';
        errorDiv.style.display = 'block';
    }
});

// Check if already logged in
const user = sessionStorage.getItem('twende_user');
if (user) {
    const userData = JSON.parse(user);
    window.location.href = (userData.role === 'admin' || userData.role === 'staff') 
        ? 'staff.html' 
        : 'client.html';
}