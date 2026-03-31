// API Base URL (Railway backend)
const API_URL = 'https://twende-system-new-production.up.railway.app';

// Initialize icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// Handle login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    
    // Clear previous error
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    
    // Simple validation
    if (!email || !password) {
        errorDiv.textContent = 'Please enter both email and password';
        errorDiv.style.display = 'block';
        return;
    }
    
    // Show loading state
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(10000)
        });

        console.log("Response status:", response.status);
        const result = await response.json();
        console.log("Response data:", result);
        
        if (response.ok && result.success) {
            // Save user to session
            sessionStorage.setItem('twende_user', JSON.stringify(result.user));
            
            // Route based on role
            if (result.role === 'admin' || result.role === 'staff') {
                window.location.href = 'staff.html';
            } else {
                window.location.href = 'client.html';
            }
        } else {
            errorDiv.textContent = result.message || result.error || 'Invalid credentials';
            errorDiv.style.display = 'block';
        }

    } catch (error) {
        console.error("Fetch error:", error);
        
        if (error.name === 'TimeoutError') {
            errorDiv.textContent = 'Request timed out. Check your connection.';
        } else {
            errorDiv.textContent = 'Server error. Please try again later.';
        }
        errorDiv.style.display = 'block';
        
    } finally {
        // Restore button state
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
    }
});

// Check if already logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    const user = sessionStorage.getItem('twende_user');
    
    if (user) {
        try {
            const userData = JSON.parse(user);
            
            // Only redirect if we have valid role data
            if (userData.role) {
                const targetPage = (userData.role === 'admin' || userData.role === 'staff') 
                    ? 'staff.html' 
                    : 'client.html';
                window.location.href = targetPage;
            }
        } catch (err) {
            // If session is corrupted, clear it
            console.error('Session parse error:', err);
            sessionStorage.removeItem('twende_user');
        }
    }
});