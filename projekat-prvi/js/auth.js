// Authentication functionality using Firebase

// Check if user is already logged in with Firebase
function checkAuth() {
    return new Promise((resolve) => {
        firebase.auth().onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                // Get user profile from Firestore
                try {
                    const userDoc = await firebase.firestore()
                        .collection('users')
                        .doc(firebaseUser.uid)
                        .get();
                    
                    if (userDoc.exists) {
                        const userData = userDoc.data();
                        console.log('User logged in:', userData.name);
                        resolve(userData);
                    } else {
                        resolve({
                            id: firebaseUser.uid,
                            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                            email: firebaseUser.email,
                            loginTime: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error('Error loading user profile:', error);
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        });
    });
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
    registerForm.addEventListener('submit', async function(e) {
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
        
        // Disable submit button
        const submitBtn = registerForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Registracija...';
        
        try {
            // Create user with Firebase Authentication
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update display name
            await user.updateProfile({
                displayName: name
            });
            
            // Create user document in Firestore
            await firebase.firestore().collection('users').doc(user.uid).set({
                id: user.uid,
                name: name,
                email: email,
                loginTime: new Date().toISOString()
            });
            
            console.log('User registered successfully:', name);
            
            showSuccess('Uspješno ste se registrovali! Preusmjeravam...');
            
            setTimeout(() => {
                const baseUrl = window.location.origin;
                window.location.href = baseUrl + '/';
            }, 1500);
        } catch (error) {
            console.error('Registration error:', error);
            
            // Handle Firebase errors
            if (error.code === 'auth/email-already-in-use') {
                showError('Korisnik sa ovim emailom već postoji!');
            } else if (error.code === 'auth/invalid-email') {
                showError('Nevažeća email adresa!');
            } else if (error.code === 'auth/weak-password') {
                showError('Lozinka je previše slaba!');
            } else {
                showError('Greška prilikom registracije. Pokušajte ponovo.');
            }
            
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Registruj se';
        }
    });
}

// Login Form Handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value;
        
        // Validation
        if (!email || !password) {
            showError('Sva polja su obavezna!');
            return;
        }
        
        // Disable submit button
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Prijavljivanje...';
        
        try {
            // Sign in with Firebase Authentication
            const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Update login time in Firestore
            await firebase.firestore().collection('users').doc(user.uid).set({
                loginTime: new Date().toISOString()
            }, { merge: true });
            
            console.log('User logged in (projekat-prvi):', user.email);
            
            showSuccess('Uspješno ste se prijavili! Preusmjeravam...');
            
            setTimeout(() => {
                const baseUrl = window.location.origin;
                window.location.href = baseUrl + '/';
            }, 1200);
        } catch (error) {
            console.error('Login error:', error);
            
            // Handle Firebase errors
            if (error.code === 'auth/user-not-found') {
                showError('Korisnik sa ovim emailom ne postoji!');
            } else if (error.code === 'auth/wrong-password') {
                showError('Pogrešna lozinka!');
            } else if (error.code === 'auth/invalid-email') {
                showError('Nevažeća email adresa!');
            } else if (error.code === 'auth/too-many-requests') {
                showError('Previše neuspješnih pokušaja. Pokušajte kasnije.');
            } else {
                showError('Greška prilikom prijavljivanja. Pokušajte ponovo.');
            }
            
            // Re-enable submit button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Prijavi se';
        }
    });
}

// Logout function (can be used in other pages)
async function logout() {
    try {
        sessionStorage.clear();
        localStorage.clear();
        await firebase.auth().signOut();
        console.log('User logged out - all sessions cleared');
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Export functions for use in other scripts
if (typeof window !== 'undefined') {
    window.authUtils = {
        checkAuth,
        logout
    };
}
