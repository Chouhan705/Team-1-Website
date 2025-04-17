// Constants
const API_BASE_URL = 'http://127.0.0.1:8000/api'; // Make sure this matches your backend URL
const token = localStorage.getItem('hospitalToken');

// DOM Elements
const hospitalNameDisplay = document.getElementById('hospital-name-display');
const logoutButton = document.getElementById('logout-button');
const messageArea = document.getElementById('message-area');

// Forms
const profileForm = document.getElementById('profile-form');
const locationForm = document.getElementById('location-form');
const capabilitiesForm = document.getElementById('capabilities-form');

// Profile Form Inputs
const profileHospitalNameInput = document.getElementById('profile-hospitalName');
const profileEmailInput = document.getElementById('profile-email');
const profilePhoneInput = document.getElementById('profile-phone');
const profileAddressInput = document.getElementById('profile-address');
const profileLicenseInput = document.getElementById('profile-licenseNumber');

// Location Form Inputs
const locationLatInput = document.getElementById('location-lat');
const locationLonInput = document.getElementById('location-lon');
const getCurrentLocationBtn = document.getElementById('get-current-location-btn');

// Capabilities Form Inputs
const capabilitiesHasICUInput = document.getElementById('capabilities-hasICU');
const capabilitiesSpecialistsInput = document.getElementById('capabilities-specialists');
const capabilitiesEquipmentInput = document.getElementById('capabilities-equipment');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Check for token
    if (!token) {
        console.error("No token found, redirecting to login.");
        window.location.href = 'hospital-auth.html'; // Redirect if not logged in
        return;
    }

    // 2. Add event listeners
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    }
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    if (locationForm) {
        locationForm.addEventListener('submit', handleLocationUpdate);
    }
     if (getCurrentLocationBtn) {
         getCurrentLocationBtn.addEventListener('click', fetchAndFillCurrentLocation);
     }
    if (capabilitiesForm) {
        capabilitiesForm.addEventListener('submit', handleCapabilitiesUpdate);
    }

    // 3. Fetch initial data
    fetchHospitalProfile();
});

// --- API Fetch Helper ---
async function fetchWithAuth(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...(options.headers || {}),
    };

    try {
        const response = await fetch(url, { ...options, headers });

        if (response.status === 401) { // Unauthorized
            handleLogout(); // Token likely expired or invalid
            return null; // Indicate failure
        }
        if (!response.ok) {
            // Try to parse error detail
            let errorDetail = `API request failed with status ${response.status}`;
            try {
                const errorData = await response.json();
                errorDetail = errorData.detail || errorDetail;
            } catch (e) { /* Ignore if response is not JSON */ }
            throw new Error(errorDetail);
        }

         // If response has content, parse it, otherwise return true for success
         const contentType = response.headers.get("content-type");
         if (contentType && contentType.indexOf("application/json") !== -1) {
             return await response.json();
         } else {
             return true; // Indicate success for non-JSON responses (like some PATCH/DELETE)
         }

    } catch (error) {
        console.error('API Fetch Error:', error);
        displayMessage(`Error: ${error.message}`, 'error');
        return null; // Indicate failure
    }
}


// --- Data Fetching ---
async function fetchHospitalProfile() {
    displayMessage('Loading profile...', 'loading'); // Use a loading state if desired
    const data = await fetchWithAuth(`${API_BASE_URL}/hospital/profile`);

    if (data) {
        populateForms(data);
        if (hospitalNameDisplay) {
            hospitalNameDisplay.textContent = `Welcome, ${data.hospitalName}`;
        }
        clearMessage(); // Clear loading message
    } else {
        displayMessage('Failed to load hospital profile.', 'error');
         // Optionally disable forms if loading fails
    }
}

// --- Form Population ---
function populateForms(data) {
    if (!data) return;

    // Profile
    if (profileHospitalNameInput) profileHospitalNameInput.value = data.hospitalName || '';
    if (profileEmailInput) profileEmailInput.value = data.email || '';
    if (profilePhoneInput) profilePhoneInput.value = data.phone || '';
    if (profileAddressInput) profileAddressInput.value = data.address || '';
    if (profileLicenseInput) profileLicenseInput.value = data.licenseNumber || '';

    // Location (Check if location data exists and has coordinates)
     const coords = data.location?.coordinates;
     if (locationLatInput) locationLatInput.value = coords?.[1] || ''; // Latitude is index 1
     if (locationLonInput) locationLonInput.value = coords?.[0] || ''; // Longitude is index 0


    // Capabilities
    if (capabilitiesHasICUInput) capabilitiesHasICUInput.checked = data.hasICU || false;
    if (capabilitiesSpecialistsInput) capabilitiesSpecialistsInput.value = (data.specialists || []).join(', ');
    if (capabilitiesEquipmentInput) capabilitiesEquipmentInput.value = (data.equipment || []).join(', ');
}

// --- Event Handlers ---
function handleLogout() {
    localStorage.removeItem('hospitalToken');
    window.location.href = 'hospital-auth.html';
}

async function handleProfileUpdate(event) {
    event.preventDefault();
    const submitButton = event.target.querySelector('button[type="submit"]');
    disableButton(submitButton, 'Updating...');

    const updates = {
        // Only include fields that should be updatable
        phone: profilePhoneInput.value.trim(),
        address: profileAddressInput.value.trim(),
        // hospitalName, email, licenseNumber are read-only in this setup
    };

    const result = await fetchWithAuth(`${API_BASE_URL}/hospital/profile`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });

    if (result) {
        displayMessage('Profile updated successfully!', 'success');
        populateForms(result); // Re-populate with potentially updated data from response
    } else {
        displayMessage('Profile update failed.', 'error');
         // Optionally re-fetch profile on failure to reset fields
         // fetchHospitalProfile();
    }
     enableButton(submitButton, 'Update Profile');
}

async function handleLocationUpdate(event) {
    event.preventDefault();
     const submitButton = event.target.querySelector('button[type="submit"]');
    disableButton(submitButton, 'Updating...');

    const lat = locationLatInput.value;
    const lon = locationLonInput.value;

    if (lat === '' || lon === '') {
        displayMessage('Latitude and Longitude cannot be empty.', 'error');
         enableButton(submitButton, 'Update Location');
        return;
    }

    // Construct URL with query parameters
    const url = new URL(`${API_BASE_URL}/hospital/location`);
    url.searchParams.append('lat', lat);
    url.searchParams.append('lon', lon);

    const result = await fetchWithAuth(url.toString(), {
        method: 'PATCH',
        // No body needed as data is in query params for this endpoint
    });

    if (result) {
        displayMessage('Location updated successfully!', 'success');
    } else {
        displayMessage('Location update failed.', 'error');
    }
     enableButton(submitButton, 'Update Location');
}

async function handleCapabilitiesUpdate(event) {
    event.preventDefault();
     const submitButton = event.target.querySelector('button[type="submit"]');
    disableButton(submitButton, 'Updating...');

    // Process comma-separated strings into arrays, trimming whitespace and filtering empty strings
    const specialists = capabilitiesSpecialistsInput.value
        .split(',')
        .map(s => s.trim().toLowerCase()) // Convert to lowercase for consistency
        .filter(s => s); // Remove empty strings

    const equipment = capabilitiesEquipmentInput.value
        .split(',')
        .map(e => e.trim().toLowerCase()) // Convert to lowercase
        .filter(e => e); // Remove empty strings

    const updates = {
        hasICU: capabilitiesHasICUInput.checked,
        specialists: specialists,
        equipment: equipment,
    };

    const result = await fetchWithAuth(`${API_BASE_URL}/hospital/capabilities`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });

    if (result) {
        displayMessage('Capabilities updated successfully!', 'success');
    } else {
        displayMessage('Capabilities update failed.', 'error');
    }
     enableButton(submitButton, 'Update Capabilities');
}


function fetchAndFillCurrentLocation() {
     if (!navigator.geolocation) {
         displayMessage('Geolocation is not supported by your browser.', 'error');
         return;
     }

     const locationButton = getCurrentLocationBtn; // Reference the button
     disableButton(locationButton, 'Getting Location...');


     navigator.geolocation.getCurrentPosition(
         (position) => {
             const lat = position.coords.latitude;
             const lon = position.coords.longitude;
             if (locationLatInput) locationLatInput.value = lat.toFixed(6); // Set precision
             if (locationLonInput) locationLonInput.value = lon.toFixed(6);
             clearMessage(); // Clear any previous messages
             enableButton(locationButton, 'Use My Current Location');
         },
         (error) => {
             console.error("Geolocation error:", error);
             displayMessage(`Error getting location: ${error.message}`, 'error');
             enableButton(locationButton, 'Use My Current Location');
         },
         { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 } // Options
     );
 }

// --- UI Helpers ---
function displayMessage(message, type = 'info') { // types: info, success, error, loading
    if (!messageArea) return;
    messageArea.textContent = message;
    messageArea.className = `message ${type}`; // Reset classes and add type
    messageArea.style.display = 'block';

    // Auto-hide non-loading messages after a delay
    if (type !== 'loading') {
        setTimeout(clearMessage, 5000); // Hide after 5 seconds
    }
}

function clearMessage() {
    if (messageArea) {
        messageArea.style.display = 'none';
        messageArea.textContent = '';
        messageArea.className = 'message';
    }
}

function disableButton(button, text = 'Processing...') {
     if (button) {
         button.disabled = true;
         button.dataset.originalText = button.textContent; // Store original text
         button.textContent = text;
     }
 }

 function enableButton(button, defaultText = null) {
     if (button) {
         button.disabled = false;
         // Restore original text if stored, otherwise use provided default or keep current
         button.textContent = defaultText || button.dataset.originalText || button.textContent;
     }
 }