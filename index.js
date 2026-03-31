// API Base URL
const API_URL = 'https://twende-system-new-production.up.railway.app';

// Initialize icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// Show/hide forms
function showRegister() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showLogin() {
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const result = await response.json();
        
        if (result.success) {
            sessionStorage.setItem('twende_user', JSON.stringify(result.user));
            
            if (result.role === 'admin' || result.role === 'staff') {
                window.location.href = 'staff.html';
            } else {
                window.location.href = 'client.html';
            }
        } else {
            alert(result.message || 'Login failed');
        }
    } catch (error) {
        alert('Connection error. Please try again.');
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const phone = document.getElementById('regPhone').value;
    const accountType = document.querySelector('input[name="accountType"]:checked').value;
    
    try {
        const response = await fetch(`${API_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                email,
                password,
                phone: phone || '',
                interest: '',
                role: accountType === 'staff' ? 'staff' : 'client'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Account created successfully! Please login.');
            showLogin();
            // Clear form
            document.getElementById('regName').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regPhone').value = '';
        } else {
            alert(result.message || 'Registration failed');
        }
    } catch (error) {
        alert('Connection error. Please try again.');
    }
}

// Account type selection
function selectAccountType(type) {
    document.querySelectorAll('.account-type-card').forEach(card => {
        card.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
}

// Check if already logged in
const user = sessionStorage.getItem('twende_user');
if (user) {
    const userData = JSON.parse(user);
    window.location.href = (userData.role === 'admin' || userData.role === 'staff') 
        ? 'staff.html' 
        : 'client.html';
}