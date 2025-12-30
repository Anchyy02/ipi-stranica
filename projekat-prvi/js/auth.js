// Authentication functionality using Local Storage

// Check if user is already logged in
function checkAuth() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        const user = JSON.parse(currentUser);
        console.log('User logged in:', user.name);
        return user;
    }
    return null;
}

// Get all users from localStorage
function getUsers() {
    const users = localStorage.getItem('users');
    return users ? JSON.parse(users) : [];
}

// Save users to localStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Show error message
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
        setTimeout(() => {
            errorDiv.classList.remove('show');
        }, 5000);
    }
}

// Show success message
function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.add('show');
        setTimeout(() => {
            successDiv.classList.remove('show');
        }, 3000);
    }
}

// Register Form Handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validation
        if (!name || !email || !password) {
            showError('Sva polja su obavezna!');
            return;
        }
        
        if (password.length < 6) {
            showError('Lozinka mora imati najmanje 6 karaktera!');
            return;
        }
        
        if (password !== confirmPassword) {
            showError('Lozinke se ne poklapaju!');
            return;
        }
        
        // Check if user already exists
        const users = getUsers();
        const userExists = users.find(u => u.email === email);
        
        if (userExists) {
            showError('Korisnik sa ovim emailom već postoji!');
            return;
        }
        
        // Create new user
        const newUser = {
            id: Date.now(),
            name: name,
            email: email,
            password: password, // In production, this should be hashed!
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        saveUsers(users);
        
        showSuccess('Uspješno ste se registrovali! Preusmjeravam na login...');
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    });
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        
        // Validation
        if (!email || !password) {
            showError('Sva polja su obavezna!');
            return;
        }
        
        // Check credentials
        const users = getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            showError('Pogrešan email ili lozinka!');
            return;
        }
        
        // Save current user (without password)
        const currentUser = {
            id: user.id,
            name: user.name,
            email: user.email,
            loginTime: new Date().toISOString()
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        console.log('User logged in (projekat-prvi):', currentUser);
        console.log('localStorage after login:', localStorage.getItem('currentUser'));
        
        // Also set a flag to indicate fresh login
        sessionStorage.setItem('justLoggedIn', 'true');
        
        showSuccess('Uspješno ste se prijavili! Preusmjeravam...');
        
        // Redirect to Angular app home page after successful login
        setTimeout(() => {
            // Use window.location.origin to ensure we stay on the same domain
            const baseUrl = window.location.origin;
            window.location.href = baseUrl + '/';
            console.log('Redirecting to:', baseUrl + '/');
        }, 1000);
    });
}

// Logout function (can be used in other pages)
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
    window.authUtils = {
        checkAuth,
        logout,
        getUsers
    };
}
