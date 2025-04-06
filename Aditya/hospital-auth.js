document.addEventListener('DOMContentLoaded', function() {
    // Hamburger menu logic
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const dropdownMenu = document.getElementById('dropdown-menu');

    if(hamburgerMenu && dropdownMenu){
        hamburgerMenu.addEventListener('click', function(event) {
            dropdownMenu.classList.toggle('hidden');
            event.stopPropagation();
        });

        document.addEventListener('click', function(event) {
            if (!dropdownMenu.classList.contains('hidden') && !dropdownMenu.contains(event.target) && !hamburgerMenu.contains(event.target)) {
                dropdownMenu.classList.add('hidden');
            }
        });

        dropdownMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                dropdownMenu.classList.add('hidden');
            });
        });
    }

    // Login form handling
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Signup form handling
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        
        // Password strength checker
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', checkPasswordStrength);
        }

        // Password confirmation checker
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                validatePasswordMatch(passwordInput.value, confirmPasswordInput.value);
            });
        }
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;

    if (!validateEmail(email)) {
        showError('email', 'Please enter a valid email address');
        return;
    }

    if (!validatePassword(password)) {
        showError('password', 'Password must be at least 6 characters long');
        return;
    }

    try {
        const response = await fetch('YOUR_BACKEND_URL/api/hospital/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                remember
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();
        
        if (data.token) {
            localStorage.setItem('hospitalToken', data.token);
            window.location.href = 'hospital-dashboard.html';
        }
    } catch (error) {
        showError('email', error.message || 'Login failed. Please try again.');
    }
}

async function handleSignup(e) {
    e.preventDefault();

    const hospitalName = document.getElementById('hospitalName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const address = document.getElementById('address').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const licenseNumber = document.getElementById('licenseNumber').value;
    const terms = document.getElementById('terms').checked;

    // Validation
    if (!hospitalName.trim()) {
        showError('hospitalName', 'Hospital name is required');
        return;
    }

    if (!validateEmail(email)) {
        showError('email', 'Please enter a valid email address');
        return;
    }

    if (!validatePhone(phone)) {
        showError('phone', 'Please enter a valid 10-digit phone number');
        return;
    }

    if (!address.trim()) {
        showError('address', 'Address is required');
        return;
    }

    if (!validatePassword(password)) {
        showError('password', 'Password must be at least 6 characters long');
        return;
    }

    if (password !== confirmPassword) {
        showError('confirmPassword', 'Passwords do not match');
        return;
    }

    if (!validateLicenseNumber(licenseNumber)) {
        showError('licenseNumber', 'Please enter a valid license number. Format examples: MH/12345/2023, CEA-MH-12345, or NABH-H-12345');
        return;
    }

    if (!terms) {
        showError('terms', 'You must agree to the Terms and Conditions');
        return;
    }

    try {
        const response = await fetch('YOUR_BACKEND_URL/api/hospital/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                hospitalName,
                email,
                phone,
                address,
                password,
                licenseNumber
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Registration failed');
        }

        const data = await response.json();
        
        if (data.success) {
            // Show success message and redirect to login
            alert('Registration successful! Please login to continue.');
            window.location.href = 'hospital-login.html';
        }
    } catch (error) {
        showError('email', error.message || 'Registration failed. Please try again.');
    }
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function validatePhone(phone) {
    const re = /^[0-9]{10}$/;
    return re.test(phone);
}

function validatePasswordMatch(password, confirmPassword) {
    if (password !== confirmPassword) {
        showError('confirmPassword', 'Passwords do not match');
        return false;
    }
    return true;
}

function checkPasswordStrength(e) {
    const password = e.target.value;
    const formGroup = e.target.closest('.form-group');
    
    // Remove old strength indicator if it exists
    const oldIndicator = formGroup.querySelector('.password-strength');
    if (oldIndicator) {
        oldIndicator.remove();
    }

    // Create new strength indicator
    const strengthIndicator = document.createElement('div');
    strengthIndicator.className = 'password-strength';

    // Check password strength
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.match(/[A-Z]/)) strength++;
    if (password.match(/[0-9]/)) strength++;
    if (password.match(/[^A-Za-z0-9]/)) strength++;

    // Add appropriate class based on strength
    if (strength <= 2) {
        strengthIndicator.classList.add('strength-weak');
    } else if (strength === 3) {
        strengthIndicator.classList.add('strength-medium');
    } else {
        strengthIndicator.classList.add('strength-strong');
    }

    formGroup.appendChild(strengthIndicator);
}

function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const formGroup = field.closest('.form-group');
    
    formGroup.classList.add('error');
    
    let errorDiv = formGroup.querySelector('.error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        formGroup.appendChild(errorDiv);
    }
    errorDiv.textContent = message;
    
    setTimeout(() => {
        formGroup.classList.remove('error');
        errorDiv.remove();
    }, 3000);
}

// Clear error when user starts typing
document.querySelectorAll('.auth-form input, .auth-form textarea').forEach(input => {
    input.addEventListener('input', function() {
        const formGroup = this.closest('.form-group');
        if (formGroup.classList.contains('error')) {
            formGroup.classList.remove('error');
            const errorDiv = formGroup.querySelector('.error-message');
            if (errorDiv) errorDiv.remove();
        }
    });
});

function validateLicenseNumber(license) {
    // Common formats for Indian hospital licenses:
    // 1. State Medical Council format: XX/12345/YYYY (state code/number/year)
    // 2. Clinical Establishments format: CEA-XX-12345
    // 3. NABH format: NABH-H-XXXXX
    const formats = [
        /^[A-Z]{2}\/\d{5}\/\d{4}$/, // State format: MH/12345/2023
        /^CEA-[A-Z]{2}-\d{5}$/, // CEA format: CEA-MH-12345
        /^NABH-H-\d{5}$/ // NABH format: NABH-H-12345
    ];

    return formats.some(format => format.test(license));
} 