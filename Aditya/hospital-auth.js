// Form validation and submission handling
document.addEventListener('DOMContentLoaded', function() {
    // Login form handling
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Signup form handling
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
        
        // Password strength indicator
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', function() {
                const strength = checkPasswordStrength(this.value);
                updatePasswordStrengthIndicator(strength);
            });
        }

        // Password confirmation check
        const confirmPasswordInput = document.getElementById('confirmPassword');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', function() {
                checkPasswordMatch();
            });
        }
    }
});

async function handleLogin(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        email: formData.get('email'),
        password: formData.get('password')
    };

    try {
        // TODO: Implement actual login API call
        console.log('Login attempt:', data);
        // For now, just redirect to dashboard
        window.location.href = 'hospital-dashboard.html';
    } catch (error) {
        showError('Login failed. Please check your credentials.');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    // Validate license number format
    const licenseNumber = formData.get('licenseNumber');
    if (!validateLicenseNumber(licenseNumber)) {
        showError('Invalid license number format. Please use one of the following formats:\n' +
                 'State format: XX/12345/YYYY (e.g., MH/12345/2023)\n' +
                 'CEA format: CEA-XX-12345 (e.g., CEA-MH-12345)\n' +
                 'NABH format: NABH-H-12345');
        return;
    }

    const data = {
        hospitalName: formData.get('hospitalName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        password: formData.get('password'),
        licenseNumber: licenseNumber
    };

    try {
        // TODO: Implement actual signup API call
        console.log('Signup attempt:', data);
        // For now, just redirect to dashboard
        window.location.href = 'hospital-dashboard.html';
    } catch (error) {
        showError('Signup failed. Please try again.');
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

function checkPasswordStrength(password) {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[^a-zA-Z0-9]+/)) strength++;
    
    return strength;
}

function updatePasswordStrengthIndicator(strength) {
    const indicator = document.getElementById('password-strength');
    if (!indicator) return;

    indicator.className = 'password-strength';
    if (strength <= 2) {
        indicator.classList.add('weak');
        indicator.textContent = 'Weak';
    } else if (strength <= 4) {
        indicator.classList.add('medium');
        indicator.textContent = 'Medium';
    } else {
        indicator.classList.add('strong');
        indicator.textContent = 'Strong';
    }
}

function checkPasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorElement = document.getElementById('confirm-password-error');

    if (password !== confirmPassword) {
        errorElement.textContent = 'Passwords do not match';
        errorElement.style.display = 'block';
    } else {
        errorElement.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const container = document.querySelector('.auth-container');
    container.insertBefore(errorDiv, container.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
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
    // State format: XX/12345/YYYY
    const stateFormat = /^[A-Z]{2}\/\d{5}\/\d{4}$/;
    // CEA format: CEA-XX-12345
    const ceaFormat = /^CEA-[A-Z]{2}-\d{5}$/;
    // NABH format: NABH-H-12345
    const nabhFormat = /^NABH-H-\d{5}$/;

    return stateFormat.test(license) || ceaFormat.test(license) || nabhFormat.test(license);
} 