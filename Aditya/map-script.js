// map_script.js

// --- Configuration ---
// Set this to your backend URL.
// For local testing (running main.py with uvicorn):
const API_BASE_URL = 'http://127.0.0.1:8080';
// For deployed backend (replace with your actual deployed URL):
// const API_BASE_URL = 'https://your-deployed-chetak-backend.com';

// --- Global Variables ---
let map;
let routeLayer = null;
let userMarker = null;
let hospitalMarkers = []; // Array to hold all hospital markers
const loadingScreen = document.getElementById('loading-screen');
const infoContainer = document.getElementById('info-container');
const infoTitle = document.getElementById('info-title');
const urgencyDisplay = document.getElementById('urgency-display');
const detailsContainer = document.getElementById('info-details');
const backButton = document.getElementById('back-button');

// --- Leaflet Icons ---
const bestHospitalIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const otherHospitalIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});
const userIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// --- Helper Functions ---
function formatName(name) {
    if (!name) return 'N/A';
    return name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

// --- Core Logic Functions ---

// Analyze patient condition (remains client-side for now)
// In a more advanced setup, this could also call a backend AI endpoint
function analyzePatientCondition(condition, details) {
    // --- This function remains EXACTLY the same as before ---
    // It takes the localStorage values and determines needs (needsICU, specialist, etc.)
    // ... (Keep the full switch statement and keyword logic here) ...
     const medicalNeeds = {
        needsICU: false, needsSpecialist: null, urgencyLevel: 1,
        requiredEquipment: [], conditionLabel: 'General Checkup'
    };
    if (condition && condition !== 'other') { medicalNeeds.conditionLabel = formatName(condition); }
    else if (details) { medicalNeeds.conditionLabel = "Described Condition"; }

    switch (condition) { /* ... cases for cardiac, stroke, accident, etc. ... */
         case 'cardiac': medicalNeeds.needsICU = true; medicalNeeds.needsSpecialist = "cardiologist"; medicalNeeds.urgencyLevel = 5; medicalNeeds.requiredEquipment = ["defibrillator", "cardiac_monitor", "ecg"]; break;
         case 'stroke': medicalNeeds.needsICU = true; medicalNeeds.needsSpecialist = "neurologist"; medicalNeeds.urgencyLevel = 5; medicalNeeds.requiredEquipment = ["ct_scanner", "mri"]; break;
         case 'accident': medicalNeeds.needsICU = true; medicalNeeds.needsSpecialist = "orthopedic"; medicalNeeds.urgencyLevel = 4; medicalNeeds.requiredEquipment = ["x_ray", "orthopedic_tools", "trauma_equipment", "ct_scanner"]; medicalNeeds.conditionLabel = "Accident / Trauma"; break;
         case 'allergy': medicalNeeds.needsICU = false; medicalNeeds.needsSpecialist = "allergist"; medicalNeeds.urgencyLevel = 3; medicalNeeds.requiredEquipment = ["allergy_test_kits", "epinephrine"]; medicalNeeds.conditionLabel = "Allergic Reaction"; if (details && (details.toLowerCase().includes("breathing difficulty") || details.toLowerCase().includes("anaphylaxis"))) { medicalNeeds.needsICU = true; medicalNeeds.urgencyLevel = 5; medicalNeeds.needsSpecialist = "emergency"; } break;
         case 'labor': medicalNeeds.needsICU = false; medicalNeeds.needsSpecialist = "obstetrician"; medicalNeeds.urgencyLevel = 4; medicalNeeds.requiredEquipment = ["obstetric_ultrasound", "fetal_monitor"]; medicalNeeds.conditionLabel = "Labor / Pregnancy"; if (details && (details.toLowerCase().includes("bleeding") || details.toLowerCase().includes("distress"))) { medicalNeeds.needsICU = true; medicalNeeds.urgencyLevel = 5; } break;
        case 'other':
        default:
            medicalNeeds.urgencyLevel = 2;
            if (details) {
                details = details.toLowerCase();
                /* ... keyword matching logic for details text ... */
                 if (details.includes("chest pain") || details.includes("heart attack")) { medicalNeeds.needsSpecialist = "cardiologist"; medicalNeeds.urgencyLevel = 5; medicalNeeds.requiredEquipment = ["cardiac_monitor", "ecg"]; medicalNeeds.needsICU = true; medicalNeeds.conditionLabel = "Suspected Cardiac Event";}
                 if (details.includes("stroke symptoms") || details.includes("numbness")) { medicalNeeds.needsSpecialist = "neurologist"; medicalNeeds.urgencyLevel = 5; medicalNeeds.requiredEquipment = ["ct_scanner", "mri"]; medicalNeeds.needsICU = true; medicalNeeds.conditionLabel = "Suspected Stroke";}
                 if (details.includes("broken") || details.includes("fracture")) { medicalNeeds.needsSpecialist = "orthopedic"; medicalNeeds.urgencyLevel = 4; medicalNeeds.requiredEquipment = ["x_ray", "orthopedic_tools"]; medicalNeeds.needsICU = details.includes("severe"); medicalNeeds.conditionLabel = "Injury / Fracture";}
                 if (details.includes("breathing") || details.includes("breathe")) { medicalNeeds.needsICU = true; medicalNeeds.urgencyLevel = 5; medicalNeeds.requiredEquipment = ["ventilator", "pulse_oximeter"]; medicalNeeds.needsSpecialist = "pulmonologist"; medicalNeeds.conditionLabel = "Breathing Difficulty";}
                 if (details.includes("pregnant") || details.includes("labor") || details.includes("contractions")) { medicalNeeds.needsSpecialist = "obstetrician"; medicalNeeds.urgencyLevel = 4; medicalNeeds.requiredEquipment = ["obstetric_ultrasound", "fetal_monitor"]; medicalNeeds.needsICU = details.includes("bleeding"); medicalNeeds.conditionLabel = "Pregnancy / Labor";}
                 if (details.includes("allergic") || details.includes("allergy")) { medicalNeeds.needsSpecialist = "allergist"; medicalNeeds.urgencyLevel = 3; medicalNeeds.requiredEquipment = ["epinephrine"]; medicalNeeds.needsICU = details.includes("anaphylaxis"); medicalNeeds.conditionLabel = "Allergic Reaction";}
                 if (details.includes("burn")) { medicalNeeds.needsSpecialist = "general_surgeon"; medicalNeeds.urgencyLevel = 4; medicalNeeds.requiredEquipment = ["burn_dressings"]; medicalNeeds.needsICU = details.includes("severe"); medicalNeeds.conditionLabel = "Burn Injury";}
            } else if (condition === 'other') { medicalNeeds.conditionLabel = "Unspecified Condition"; medicalNeeds.urgencyLevel = 1; }
    }
    if (!medicalNeeds.needsSpecialist && medicalNeeds.urgencyLevel >= 4) { medicalNeeds.needsSpecialist = "emergency"; }
    if (!medicalNeeds.needsSpecialist && medicalNeeds.urgencyLevel < 3) { medicalNeeds.needsSpecialist = "general"; }
    return medicalNeeds;
}

// --- Map and UI Functions ---

function initializeMap(centerLat, centerLng) {
    console.log(`Initializing map centered at: ${centerLat}, ${centerLng}`);
    if (map && map.remove) { map.off(); map.remove(); }
    map = L.map('map').setView([centerLat, centerLng], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

function addUserMarker(lat, lng, label = "Your Location") {
    if (userMarker && map.hasLayer(userMarker)) map.removeLayer(userMarker);
    userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map)
        .bindPopup(`<b>${label}</b>`).openPopup();
    console.log(`User marker added at: ${lat}, ${lng}`);
}

// Modified to use API response structure
function addHospitalMarkers(hospitalList) {
    hospitalMarkers.forEach(marker => { if (map.hasLayer(marker)) map.removeLayer(marker); });
    hospitalMarkers = [];
    if (!hospitalList || hospitalList.length === 0) return;

    hospitalList.forEach((hospital, index) => {
        const lat = hospital.location.coordinates[1]; // Latitude from API
        const lon = hospital.location.coordinates[0]; // Longitude from API
        const distance = hospital.distance_km; // Distance from API
        const isBest = index === 0;
        const icon = isBest ? bestHospitalIcon : otherHospitalIcon;
        const popupText = `<b>${hospital.name}</b><br>${isBest ? '<b>Best Match</b>' : 'Alternative'} (${distance !== null && distance !== undefined ? distance.toFixed(1) : 'N/A'} km)`;

        const marker = L.marker([lat, lon], { icon: icon })
            .addTo(map)
            .bindPopup(popupText);
        hospitalMarkers.push(marker);
    });
    console.log(`Added ${hospitalList.length} hospital markers.`);
}

// Modified to use API response structure for destination
async function getOSRMRoute(userLat, userLng, hospitalLat, hospitalLon) {
    const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${hospitalLon},${hospitalLat}?overview=full&geometries=geojson`;
    console.log("Fetching route from OSRM:", url);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`OSRM request failed: ${response.statusText}`);
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
            const routeGeometry = data.routes[0].geometry;
            const routeDistance = (data.routes[0].distance / 1000).toFixed(2);
            const routeDuration = (data.routes[0].duration / 60).toFixed(0);
            console.log(`Route found: ${routeDistance} km, ${routeDuration} min`);
            if (routeLayer && map.hasLayer(routeLayer)) map.removeLayer(routeLayer);
            routeLayer = L.geoJSON(routeGeometry, { style: { color: '#FF0000', weight: 5, opacity: 0.8 } }).addTo(map);
            // Fit map to route bounds
            map.fitBounds(routeLayer.getBounds().pad(0.1));
            return { distance: routeDistance, duration: routeDuration };
        } else {
            console.warn("No route found by OSRM.");
            if (routeLayer && map.hasLayer(routeLayer)) map.removeLayer(routeLayer);
            routeLayer = L.polyline([[userLat, userLng], [hospitalLat, hospitalLon]], { color: 'grey', dashArray: '5, 10' }).addTo(map);
            if (userMarker) map.fitBounds(L.latLngBounds([userMarker.getLatLng(), routeLayer.getLatLngs()[1]]).pad(0.1));
             else map.fitBounds(routeLayer.getBounds().pad(0.1));
            return null;
        }
    } catch (error) {
        console.error("Error fetching OSRM route:", error);
        if (routeLayer && map.hasLayer(routeLayer)) map.removeLayer(routeLayer);
        routeLayer = L.polyline([[userLat, userLng], [hospitalLat, hospitalLon]], { color: 'grey', dashArray: '5, 10' }).addTo(map);
         if (userMarker) map.fitBounds(L.latLngBounds([userMarker.getLatLng(), routeLayer.getLatLngs()[1]]).pad(0.1));
         else map.fitBounds(routeLayer.getBounds().pad(0.1));
        return null;
    }
}

// Modified to use API response structure
function displayInfo(bestHospital, medicalNeeds, routeInfo) {
    detailsContainer.innerHTML = '';
    urgencyDisplay.innerHTML = '';

    if (!bestHospital) {
        infoContainer.style.display = 'block';
        infoTitle.textContent = "No Suitable Hospital Found";
        detailsContainer.innerHTML = `<div class="detail-box"><h3>Unable to Find Match</h3><p>We could not find a hospital matching the specific needs based on available data and your location.</p><p><strong>Please call the emergency helpline immediately: 8329227255</strong></p></div>`;
        return;
    }

    // Display Urgency (remains the same as it depends on medicalNeeds)
    const urgencyLabels = ['Low', 'Moderate', 'High', 'Very High', 'Critical'];
    urgencyDisplay.innerHTML = `<span class="urgency-indicator urgency-${medicalNeeds.urgencyLevel}">Assessed Urgency: ${urgencyLabels[medicalNeeds.urgencyLevel - 1]} (${medicalNeeds.urgencyLevel}/5)</span>`;

    // Populate Details for the best hospital using API response fields
    const distanceText = bestHospital.distance_km !== null && bestHospital.distance_km !== undefined
                       ? `${bestHospital.distance_km.toFixed(1)} km (approx.)`
                       : 'Distance N/A';
    let hospitalHTML = `
        <div class="detail-box">
            <h3><img src="https://img.icons8.com/ios-filled/20/1a4f93/hospital-3.png" alt="Hospital Icon"> Recommended Hospital</h3>
            <p><strong>${bestHospital.name}</strong></p>
            <p>Distance: ${distanceText}</p>`;
    if (routeInfo) {
        hospitalHTML += `<p>Est. Driving Time: ${routeInfo.duration} min</p>`;
    }
    hospitalHTML += `<p>ICU Available: ${bestHospital.hasICU ? 'Yes' : 'No'}</p></div>`;

    let needsHTML = `
        <div class="detail-box">
             <h3><img src="https://img.icons8.com/ios-glyphs/20/1a4f93/heart-with-pulse.png" alt="Needs Icon"> Patient Needs Assessment</h3>
             <p>Condition: ${medicalNeeds.conditionLabel}</p>
            <p>Requires ICU: ${medicalNeeds.needsICU ? 'Yes' : 'No'}</p>
             <p>Likely Specialist: ${formatName(medicalNeeds.needsSpecialist || 'General Care')}</p>
             ${medicalNeeds.requiredEquipment.length > 0 ? `<p>Potential Equipment: ${medicalNeeds.requiredEquipment.map(formatName).join(', ')}</p>` : '<p>Specific Equipment Needs: Not identified</p>'}
        </div>`;

    let capabilitiesHTML = `
        <div class="detail-box">
            <h3><img src="https://img.icons8.com/ios-filled/20/1a4f93/medical-doctor.png" alt="Capabilities Icon"> Hospital Capabilities</h3>
            <p><strong>Available Specialists:</strong></p>
            <ul>${bestHospital.specialists.map(spec => `<li><span class="tag">${formatName(spec)}</span></li>`).join('')}</ul>
             <p><strong>Available Equipment:</strong></p>
             <ul>${bestHospital.equipment.map(equip => `<li><span class="tag">${formatName(equip)}</span></li>`).join('')}</ul>
        </div>`;

    detailsContainer.innerHTML = hospitalHTML + needsHTML + capabilitiesHTML;
    infoContainer.style.display = 'block';
    infoTitle.textContent = "Emergency Assessment & Best Hospital";
}

function goBack() {
    window.location.href = 'index.html';
}

function hideLoadingScreen() {
    if (loadingScreen) loadingScreen.classList.add('hidden');
}

// --- Main Initialization Logic ---
async function initializeApp() {
    if (backButton) backButton.addEventListener('click', goBack);

    const selectedCondition = localStorage.getItem('selectedCondition') || 'other';
    const detailsText = localStorage.getItem('patientDetails') || '';
    console.log("Retrieved from localStorage:", { selectedCondition, detailsText });

    const medicalNeeds = analyzePatientCondition(selectedCondition, detailsText);
    console.log("Analyzed Medical Needs:", medicalNeeds);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => { // Async callback for await
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log("Geolocation success:", userLocation);

                initializeMap(userLocation.lat, userLocation.lng);
                addUserMarker(userLocation.lat, userLocation.lng);

                // --- FETCH Hospitals from Backend API ---
                const apiUrl = `${API_BASE_URL}/api/find-suitable`;
                const params = new URLSearchParams({
                    lat: userLocation.lat.toString(),
                    lon: userLocation.lng.toString(),
                });
                // Append optional params based on medicalNeeds
                if (medicalNeeds.needsICU) params.append('needsICU', 'true');
                if (medicalNeeds.needsSpecialist) params.append('specialist', medicalNeeds.needsSpecialist);
                if (medicalNeeds.requiredEquipment?.length > 0) {
                    medicalNeeds.requiredEquipment.forEach(eq => params.append('equipment', eq));
                }

                let suitableHospitalsList = [];
                try {
                    console.log(`Fetching: ${apiUrl}?${params.toString()}`);
                    const response = await fetch(`${apiUrl}?${params.toString()}`);

                    if (!response.ok) {
                        const errorData = await response.text(); // Get error details from server if possible
                        console.error(`API Error Response: ${errorData}`);
                        throw new Error(`API request failed! Status: ${response.status}`);
                    }
                    suitableHospitalsList = await response.json();
                    console.log("Received Hospitals from API:", suitableHospitalsList);

                } catch (error) {
                    console.error("Error fetching hospitals from API:", error);
                    alert(`Could not fetch hospital data: ${error.message}. Please ensure the backend server is running and accessible.`);
                    displayInfo(null, medicalNeeds, null); // Show error in info panel
                    hideLoadingScreen();
                    return; // Stop processing
                }
                // --- END FETCH ---

                if (suitableHospitalsList.length > 0) {
                    const bestHospital = suitableHospitalsList[0]; // API returns sorted list
                    addHospitalMarkers(suitableHospitalsList); // Display all markers

                    // Get route to the best hospital using coordinates from API response
                    const routeInfo = await getOSRMRoute(
                         userLocation.lat, userLocation.lng,
                         bestHospital.location.coordinates[1], // Latitude
                         bestHospital.location.coordinates[0]  // Longitude
                     );

                    displayInfo(bestHospital, medicalNeeds, routeInfo); // Display info for best
                } else {
                    addHospitalMarkers([]); // Clear any old markers
                    displayInfo(null, medicalNeeds, null); // Show "not found" message
                }
                hideLoadingScreen();
            },
            (error) => { // Geolocation Error Callback
                console.error("Geolocation error:", error);
                alert(`Geolocation Error: ${error.message}. Cannot determine nearby hospitals.`);
                const defaultLocation = { lat: 19.0760, lng: 72.8777 }; // Fallback location
                initializeMap(defaultLocation.lat, defaultLocation.lng);
                displayInfo(null, medicalNeeds, null); // Show error panel
                hideLoadingScreen();
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 } // Geolocation options
        );
    } else { // Geolocation not supported
        console.error("Geolocation is not supported by this browser.");
        alert("Geolocation is not supported. Cannot find hospitals.");
        const defaultLocation = { lat: 19.0760, lng: 72.8777 };
        initializeMap(defaultLocation.lat, defaultLocation.lng);
        displayInfo(null, medicalNeeds, null); // Show error panel
        hideLoadingScreen();
    }
}

// --- Run Initialization ---
document.addEventListener('DOMContentLoaded', initializeApp);