// Constants
const API_BASE_URL = 'http://127.0.0.1:8000'; // Backend running on port 8000

// DOM Elements
const loginSection = document.getElementById('login-section');
const signupSection = document.getElementById('signup-section');
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginErrorDiv = document.getElementById('login-error-message');
const signupErrorDiv = document.getElementById('signup-error-message');

const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const strengthIndicator = document.getElementById('password-strength');
const confirmPasswordError = document.getElementById('confirm-password-error');

// --- NEW: Hamburger Menu Elements ---
const hamburgerMenu = document.getElementById('hamburger-menu');
const dropdownMenu = document.getElementById('dropdown-menu');

// --- Hamburger Menu Logic ---
if (hamburgerMenu && dropdownMenu) {
    hamburgerMenu.addEventListener('click', function(event) {
        dropdownMenu.classList.toggle('hidden');
        event.stopPropagation(); // Prevent click from immediately closing menu
    });
    // Close dropdown if clicked outside
    document.addEventListener('click', function(event) {
        if (!dropdownMenu.classList.contains('hidden') && !dropdownMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });
    // Close dropdown when a link is clicked
    dropdownMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
             dropdownMenu.classList.add('hidden');
        });
    });
}

// --- Toggle Form Visibility --- 
if (showSignupLink && showLoginLink && loginSection && signupSection) {
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.style.display = 'none';
        signupSection.style.display = 'block';
        clearErrorMessages(); // Clear errors when switching
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupSection.style.display = 'none';
        loginSection.style.display = 'block';
        clearErrorMessages(); // Clear errors when switching
    });
}

// --- Event Listeners --- 
document.addEventListener('DOMContentLoaded', function() {
    // Login form handling
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Signup form handling
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);

        // Password strength indicator
        if (passwordInput) {
            passwordInput.addEventListener('input', function() {
                const strength = checkPasswordStrength(this.value);
                updatePasswordStrengthIndicator(strength);
                // Also check match if confirm password has value
                if (confirmPasswordInput && confirmPasswordInput.value) {
                    checkPasswordMatch();
                }
            });
        }

        // Password confirmation check
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', checkPasswordMatch);
        }
    }
    
    // Clear specific form group errors on input
    document.querySelectorAll('.auth-form input, .auth-form textarea').forEach(input => {
        input.addEventListener('input', clearInputError);
    });
});

// --- Form Handlers --- 
async function handleLogin(e) {
    e.preventDefault();
    clearErrorMessages(); 
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    
    // Use FormData for OAuth2PasswordRequestForm
    const formData = new FormData(e.target);
    // OAuth2PasswordRequestForm expects 'username' and 'password' fields
    const formBody = new URLSearchParams();
    formBody.append('username', formData.get('email')); // Map email to username
    formBody.append('password', formData.get('password'));

    // Basic frontend validation (already done, but double check)
    if (!formData.get('email') || !formData.get('password')) {
        showError('login', 'Email and Password are required.');
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/hospital/token`, {
            method: 'POST',
            headers: { 
                // Important: Use 'application/x-www-form-urlencoded' for OAuth2 form data
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formBody.toString() // Send URL-encoded form data
        });

        if (!response.ok) {
            let errorDetail = 'Login failed. Please check your credentials.';
            try {
                 // Try to parse error detail from backend response
                const errorData = await response.json();
                errorDetail = errorData.detail || errorDetail;
            } catch (jsonError) {
                // If response is not JSON, use default error
                 console.error("Could not parse error response JSON:", jsonError);
            }
             throw new Error(errorDetail);
        }
        
        const result = await response.json(); // Should contain access_token
        
        if (result.access_token) {
            localStorage.setItem('hospitalToken', result.access_token); // Store the token
            // Redirect to dashboard (assuming it exists or will be created)
            window.location.href = 'hospital-dashboard.html'; 
        } else {
             throw new Error('Login successful, but no token received.');
        }

    } catch (error) {
        showError('login', error.message);
        submitButton.disabled = false;
        submitButton.textContent = 'Login';
    }
}

async function handleSignup(e) {
    e.preventDefault();
    clearErrorMessages();

    // Get form data using FormData
    const formData = new FormData(e.target);
    const hospitalName = formData.get('hospitalName')?.trim() || '';
    const email = formData.get('email')?.trim() || '';
    const phone = formData.get('phone')?.trim() || '';
    const address = formData.get('address')?.trim() || '';
    const licenseNumber = formData.get('licenseNumber')?.trim() || '';
    const password = formData.get('password') || '';
    const confirmPassword = formData.get('confirmPassword') || '';

    // --- Frontend Validation ---
    if (!hospitalName || !email || !phone || !address || !licenseNumber || !password || !confirmPassword) {
        showError('signup', 'All fields are required');
        return;
    }

    if (!validateEmail(email)) {
        showError('signup', 'Please enter a valid email address');
        return;
    }

    if (!validatePhone(phone)) {
        showError('signup', 'Please enter a valid 10-digit phone number');
        return;
    }

    if (!validateLicenseNumber(licenseNumber)) {
        showError('signup', 'Please enter a valid license number (e.g., MH/12345/2023, CEA-MH-12345, or NABH-H-12345)');
        return;
    }

    const passwordStrength = checkPasswordStrength(password);
    if (passwordStrength < 3) {
        showError('signup', 'Password is too weak. Please use a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and symbols');
        return;
    }

    if (password !== confirmPassword) {
        showError('signup', 'Passwords do not match');
        return;
    }

    const data = {
        hospitalName,
        email,
        phone,
        address,
        licenseNumber,
        password
    };

    try {
        const response = await fetch(`${API_BASE_URL}/api/hospital/register`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            let errorDetail = 'Signup failed. Please try again.';
            try {
                const errorData = await response.json();
                // Handle validation errors
                if (response.status === 422) {
                    if (errorData.detail) {
                        // If it's a list of validation errors
                        if (Array.isArray(errorData.detail)) {
                            errorDetail = errorData.detail.map(err => err.msg).join(', ');
                        } else {
                            errorDetail = errorData.detail;
                        }
                    }
                } else {
                    errorDetail = errorData.detail || errorDetail;
                }
            } catch (jsonError) {
                console.error("Could not parse error response JSON:", jsonError);
            }
            showError('signup', errorDetail);
            return;
        }

        const result = await response.json();
        console.log('Registration successful:', result);
        // Redirect to login page or show success message
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Registration error:', error);
        showError('signup', error.message || 'An error occurred during registration');
    }
}

// --- Validation Functions --- 
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

function validatePhone(phone) {
    // Basic 10-digit check
    const re = /^[0-9]{10}$/;
    return re.test(String(phone));
}

function checkPasswordStrength(password) {
    let strength = 0;
    if (!password) return 0;
    
    if (password.length >= 8) strength++;         // Length 8+
    if (password.match(/[a-z]+/)) strength++;      // Lowercase
    if (password.match(/[A-Z]+/)) strength++;      // Uppercase
    if (password.match(/[0-9]+/)) strength++;      // Numbers
    if (password.match(/[^a-zA-Z0-9\s]+/)) strength++; // Symbols
    
    // Strength scale: 0=Very Weak, 1-2=Weak, 3=Medium, 4=Strong, 5=Very Strong
    return strength;
}

function validateLicenseNumber(license) {
    if (!license) return false;
    // State format: XX/12345/YYYY
    const stateFormat = /^[A-Z]{2}\/\d{5}\/\d{4}$/i; // Case-insensitive state code
    // CEA format: CEA-XX-12345
    const ceaFormat = /^CEA-[A-Z]{2}-\d{5}$/i; // Case-insensitive state code
    // NABH format: NABH-H-12345
    const nabhFormat = /^NABH-H-\d{5}$/i;

    return stateFormat.test(license) || ceaFormat.test(license) || nabhFormat.test(license);
}

// --- UI Update Functions --- 
function updatePasswordStrengthIndicator(strength) {
    if (!strengthIndicator) return;

    strengthIndicator.className = 'password-strength'; // Reset classes
    let strengthText = 'Very Weak';

    if (strength === 0) {
         strengthIndicator.classList.add('very-weak');
         strengthText = 'Very Weak';
    } else if (strength <= 2) {
        strengthIndicator.classList.add('weak');
        strengthText = 'Weak';
    } else if (strength === 3) {
        strengthIndicator.classList.add('medium');
        strengthText = 'Medium';
    } else if (strength === 4) {
        strengthIndicator.classList.add('strong');
        strengthText = 'Strong';
    } else { // strength >= 5
        strengthIndicator.classList.add('very-strong');
        strengthText = 'Very Strong';
    }
    strengthIndicator.textContent = `Strength: ${strengthText}`;
    strengthIndicator.style.display = passwordInput.value ? 'block' : 'none'; // Show only if password has input
}

function checkPasswordMatch() {
    if (!passwordInput || !confirmPasswordInput || !confirmPasswordError) return;
    
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (confirmPassword && password !== confirmPassword) {
        confirmPasswordError.textContent = 'Passwords do not match';
        confirmPasswordError.style.display = 'block';
        // Optional: Add error class to input
        confirmPasswordInput.classList.add('input-error'); 
    } else {
        confirmPasswordError.textContent = '';
        confirmPasswordError.style.display = 'none';
         // Optional: Remove error class
        confirmPasswordInput.classList.remove('input-error');
    }
}

// --- Error Handling Functions --- 
function showError(formType, message) {
    const errorDiv = (formType === 'login') ? loginErrorDiv : signupErrorDiv;
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function clearErrorMessages() {
    if (loginErrorDiv) loginErrorDiv.style.display = 'none';
    if (signupErrorDiv) signupErrorDiv.style.display = 'none';
     // Clear individual input errors too
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    if (confirmPasswordError) confirmPasswordError.style.display = 'none';
}

function clearInputError(event) {
     // General error message clearing
     clearErrorMessages();
    
    // Specific input field visual error clearing
    const inputElement = event.target;
    if (inputElement.classList.contains('input-error')) {
        inputElement.classList.remove('input-error');
    }
    // Clear password match error if related field changes
    if (inputElement.id === 'password' || inputElement.id === 'confirmPassword') {
        if (confirmPasswordError) confirmPasswordError.style.display = 'none';
        if (confirmPasswordInput) confirmPasswordInput.classList.remove('input-error');
    }
} 