// --- Data Definitions ---

const hospitals = [
    // ... (Your full hospital data array remains the same) ...
    {
        id: 1,
        name: "City General Hospital",
        lat: 19.0880,
        lng: 72.8800,
        hasICU: true,
        specialists: ["cardiologist", "neurologist", "obstetrician", "allergist", "orthopedic"],
        equipment: ["defibrillator", "cardiac_monitor", "ct_scanner", "mri", "ventilator", "allergy_test_kits", "obstetric_ultrasound"]
    },
    {
        id: 2,
        name: "Community Medical Center",
        lat: 19.0650,
        lng: 72.8700,
        hasICU: false,
        specialists: ["general", "orthopedic", "allergist"],
        equipment: ["x_ray", "ultrasound", "allergy_test_kits"]
    },
    {
        id: 3,
        name: "St. Mary's Hospital",
        lat: 19.0800,
        lng: 72.8900,
        hasICU: true,
        specialists: ["cardiologist", "neurologist", "obstetrician"],
        equipment: ["defibrillator", "cardiac_monitor", "obstetric_ultrasound", "ventilator"]
    },
    {
        id: 4,
        name: "Memorial Hospital",
        lat: 19.0700,
        lng: 72.8850,
        hasICU: true,
        specialists: ["cardiologist", "neurologist", "orthopedic", "trauma_surgeon"],
        equipment: ["defibrillator", "ct_scanner", "x_ray", "orthopedic_tools", "trauma_equipment"]
    },
    {
        id: 5,
        name: "Children's Medical Center",
        lat: 19.0750,
        lng: 72.8600,
        hasICU: true, // Assuming pediatric ICU counts
        specialists: ["pediatrician", "allergist", "cardiologist"], // Example pediatric specialties
        equipment: ["pediatric_ventilator", "allergy_test_kits", "defibrillator", "pediatric_xray"] // Example pediatric equipment
    },
    {
        id: 6,
        name: "University Hospital",
        lat: 19.0900,
        lng: 72.8750,
        hasICU: true,
        specialists: ["cardiologist", "neurologist", "obstetrician", "orthopedic", "allergist", "general_surgeon"],
        equipment: ["defibrillator", "cardiac_monitor", "ct_scanner", "mri", "obstetric_ultrasound", "allergy_test_kits", "laparoscopy"]
    },
    {
        id: 7,
        name: "Metro Emergency Care",
        lat: 19.0680,
        lng: 72.8720,
        hasICU: true,
        specialists: ["emergency", "trauma_surgeon", "orthopedic", "general_surgeon"],
        equipment: ["defibrillator", "x_ray", "trauma_equipment", "orthopedic_tools", "ventilator", "ultrasound"]
    },
    {
        id: 8,
        name: "Coastal Care Hospital",
        lat: 19.0820,
        lng: 72.8650,
        hasICU: false,
        specialists: ["general", "allergist", "obstetrician", "dermatologist"],
        equipment: ["ultrasound", "allergy_test_kits", "obstetric_ultrasound", "ecg"]
    },
    {
        id: 9,
        name: "North Mumbai Medical",
        lat: 19.0950,
        lng: 72.8830,
        hasICU: true,
        specialists: ["cardiologist", "neurologist", "pulmonologist"],
        equipment: ["cardiac_monitor", "ct_scanner", "mri", "defibrillator", "ventilator", "bronchoscope"]
    },
    {
        id: 10,
        name: "South Central Hospital",
        lat: 19.0600,
        lng: 72.8780,
        hasICU: true,
        specialists: ["cardiologist", "obstetrician", "orthopedic", "general"],
        equipment: ["cardiac_monitor", "defibrillator", "obstetric_ultrasound", "orthopedic_tools", "x_ray", "ecg"]
    }
];

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

// --- Define Custom Icons ---
const bestHospitalIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', // Red for best
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const otherHospitalIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png', // Grey for others
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const userIcon = L.icon({ // Optional: Custom icon for user
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png', // Blue for user
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});


// --- Helper Functions ---

function formatName(name) {
    // ... (formatName function remains the same) ...
    if (!name) return 'N/A';
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    // ... (calculateDistance function remains the same) ...
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// --- Core Logic Functions ---

function analyzePatientCondition(condition, details) {
    // ... (analyzePatientCondition function remains the same) ...
    const medicalNeeds = {
        needsICU: false,
        needsSpecialist: null,
        urgencyLevel: 1, // 1-5 scale
        requiredEquipment: [],
        conditionLabel: 'General Checkup' // Default label
    };

     // Set conditionLabel based on selected card
    if (condition && condition !== 'other') {
         medicalNeeds.conditionLabel = formatName(condition);
    } else if (details) {
         medicalNeeds.conditionLabel = "Described Condition"; // Label for 'other' or text-only
    }


    // Process based on condition cards (ensure 'condition' matches values from index.html)
    switch (condition) {
        case 'cardiac':
            medicalNeeds.needsICU = true;
            medicalNeeds.needsSpecialist = "cardiologist";
            medicalNeeds.urgencyLevel = 5;
            medicalNeeds.requiredEquipment = ["defibrillator", "cardiac_monitor", "ecg"];
            break;
        case 'stroke':
            medicalNeeds.needsICU = true;
            medicalNeeds.needsSpecialist = "neurologist";
            medicalNeeds.urgencyLevel = 5;
            medicalNeeds.requiredEquipment = ["ct_scanner", "mri"]; // Added MRI as common need
            break;
        case 'accident': // Covers trauma/injury
            medicalNeeds.needsICU = true; // Assume potentially serious
            medicalNeeds.needsSpecialist = "orthopedic"; // Common need, could also be trauma_surgeon
            medicalNeeds.urgencyLevel = 4;
            medicalNeeds.requiredEquipment = ["x_ray", "orthopedic_tools", "trauma_equipment", "ct_scanner"]; // Added CT
             medicalNeeds.conditionLabel = "Accident / Trauma";
            break;
        case 'allergy': // Severe allergic reaction potential
            medicalNeeds.needsICU = false; // Usually not, but could escalate
            medicalNeeds.needsSpecialist = "allergist"; // Or emergency physician
            medicalNeeds.urgencyLevel = 3;
            medicalNeeds.requiredEquipment = ["allergy_test_kits", "epinephrine"]; // Added Epinephrine (conceptual)
            medicalNeeds.conditionLabel = "Allergic Reaction";
             // Check details for severity
            if (details && (details.toLowerCase().includes("breathing difficulty") || details.toLowerCase().includes("anaphylaxis"))) {
                medicalNeeds.needsICU = true;
                medicalNeeds.urgencyLevel = 5;
                medicalNeeds.needsSpecialist = "emergency"; // Priority shift
            }
            break;
        case 'labor':
            medicalNeeds.needsICU = false; // Usually not unless complications
            medicalNeeds.needsSpecialist = "obstetrician";
            medicalNeeds.urgencyLevel = 4; // High urgency but planned
            medicalNeeds.requiredEquipment = ["obstetric_ultrasound", "fetal_monitor"]; // Added fetal monitor
             medicalNeeds.conditionLabel = "Labor / Pregnancy";
             // Check for complications
             if (details && (details.toLowerCase().includes("bleeding") || details.toLowerCase().includes("distress"))) {
                 medicalNeeds.needsICU = true; // Potential need
                 medicalNeeds.urgencyLevel = 5;
             }
            break;
        case 'other':
        default:
            // Process free text input with simple keyword matching if condition is 'other' or not specific
            medicalNeeds.urgencyLevel = 2; // Start moderate if details provided
            if (details) {
                details = details.toLowerCase(); // Case-insensitive matching
                if (details.includes("chest pain") || details.includes("heart attack") || details.includes("palpitations")) {
                    medicalNeeds.needsSpecialist = "cardiologist";
                    medicalNeeds.urgencyLevel = Math.max(medicalNeeds.urgencyLevel, 5);
                    medicalNeeds.requiredEquipment = ["cardiac_monitor", "ecg"];
                    medicalNeeds.needsICU = true;
                    medicalNeeds.conditionLabel = "Suspected Cardiac Event";
                }
                if (details.includes("stroke symptoms") || details.includes("numbness") || details.includes("slurred speech")) {
                    medicalNeeds.needsSpecialist = "neurologist";
                    medicalNeeds.urgencyLevel = Math.max(medicalNeeds.urgencyLevel, 5);
                    medicalNeeds.requiredEquipment = ["ct_scanner", "mri"];
                    medicalNeeds.needsICU = true;
                     medicalNeeds.conditionLabel = "Suspected Stroke";
                }
                if (details.includes("broken") || details.includes("fracture") || details.includes("injury") || details.includes("accident") || details.includes("trauma")) {
                    medicalNeeds.needsSpecialist = "orthopedic"; // Could also be trauma
                    medicalNeeds.urgencyLevel = Math.max(medicalNeeds.urgencyLevel, 4);
                    medicalNeeds.requiredEquipment = ["x_ray", "orthopedic_tools"];
                    medicalNeeds.needsICU = details.includes("severe") || details.includes("major"); // ICU if severe
                     medicalNeeds.conditionLabel = "Injury / Fracture";
                }
                 if (details.includes("breathing") || details.includes("breathe") || details.includes("asthma") || details.includes("respiratory")) {
                    medicalNeeds.needsICU = true;
                    medicalNeeds.urgencyLevel = Math.max(medicalNeeds.urgencyLevel, 5);
                    medicalNeeds.requiredEquipment = ["ventilator", "pulse_oximeter"]; // Added oximeter
                    medicalNeeds.needsSpecialist = "pulmonologist"; // Or emergency
                    medicalNeeds.conditionLabel = "Breathing Difficulty";
                }
                if (details.includes("pregnant") || details.includes("labor") || details.includes("contractions") || details.includes("water broke")) {
                    medicalNeeds.needsSpecialist = "obstetrician";
                    medicalNeeds.urgencyLevel = Math.max(medicalNeeds.urgencyLevel, 4);
                    medicalNeeds.requiredEquipment = ["obstetric_ultrasound", "fetal_monitor"];
                     medicalNeeds.needsICU = details.includes("bleeding") || details.includes("distress"); // ICU if complications mentioned
                     medicalNeeds.conditionLabel = "Pregnancy / Labor";
                }
                if (details.includes("allergic") || details.includes("allergy") || details.includes("rash") || details.includes("hives")) {
                    medicalNeeds.needsSpecialist = "allergist"; // Or emergency
                    medicalNeeds.urgencyLevel = Math.max(medicalNeeds.urgencyLevel, 3);
                    medicalNeeds.requiredEquipment = ["epinephrine"];
                    medicalNeeds.needsICU = details.includes("anaphylaxis") || details.includes("breathing difficulty"); // ICU if severe reaction
                    medicalNeeds.conditionLabel = "Allergic Reaction";
                }
                 if (details.includes("burn")) {
                     medicalNeeds.needsSpecialist = "general_surgeon"; // Or specialized burn unit
                     medicalNeeds.urgencyLevel = Math.max(medicalNeeds.urgencyLevel, 4);
                     medicalNeeds.requiredEquipment = ["burn_dressings"]; // Conceptual
                     medicalNeeds.needsICU = details.includes("severe") || details.includes("extensive");
                     medicalNeeds.conditionLabel = "Burn Injury";
                 }
            } else if (condition === 'other') {
                 // No details for 'other' case
                 medicalNeeds.conditionLabel = "Unspecified Condition";
                 medicalNeeds.urgencyLevel = 1; // Lowest urgency if no info
            }
    }
     // If no specific specialist found but needs are high, assign emergency
    if (!medicalNeeds.needsSpecialist && medicalNeeds.urgencyLevel >= 4) {
        medicalNeeds.needsSpecialist = "emergency";
    }
     // If no specialist found and low urgency, assign general
    if (!medicalNeeds.needsSpecialist && medicalNeeds.urgencyLevel < 3) {
        medicalNeeds.needsSpecialist = "general";
    }


    return medicalNeeds;
}

// *** MODIFIED: Now returns the full sorted list ***
function findSuitableHospitalsSorted(patientLocation, medicalNeeds) {
    const suitableHospitals = hospitals.filter(hospital => {
        // Check ICU requirement
        if (medicalNeeds.needsICU && !hospital.hasICU) return false;

        // Check Specialist requirement
        if (medicalNeeds.needsSpecialist &&
            !hospital.specialists.includes(medicalNeeds.needsSpecialist) &&
            !hospital.specialists.includes("emergency") &&
            !hospital.specialists.includes("general")) {
            return false;
         }

        // Check Equipment requirement (at least one required item must be present)
        if (medicalNeeds.requiredEquipment.length > 0) {
            const hasRequiredEquipment = medicalNeeds.requiredEquipment.some(
                equipment => hospital.equipment.includes(equipment)
            );
            if (!hasRequiredEquipment) return false;
        }

        return true; // Hospital meets the criteria
    });

    if (suitableHospitals.length === 0) {
        console.warn("No hospitals found matching criteria.");
        return []; // Return empty array if none found
    }

    // Calculate distance for each suitable hospital
    const hospitalsWithDistance = suitableHospitals.map(hospital => {
        const distance = calculateDistance(
            patientLocation.lat, patientLocation.lng,
            hospital.lat, hospital.lng
        );
        return { ...hospital, distance }; // Include distance property
    });

    // Sort by distance (closest first)
    hospitalsWithDistance.sort((a, b) => a.distance - b.distance);

    console.log("Suitable hospitals sorted by distance:", hospitalsWithDistance);
    return hospitalsWithDistance; // Return the entire sorted list
}


// --- Map and UI Functions ---

function initializeMap(centerLat, centerLng) {
    // ... (initializeMap remains the same) ...
     console.log(`Initializing map centered at: ${centerLat}, ${centerLng}`);
     // Check if map already exists, remove if so to prevent error
     if (map && map.remove) {
        map.off();
        map.remove();
    }
    map = L.map('map').setView([centerLat, centerLng], 13); // Start with a reasonable zoom level

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
}

function addUserMarker(lat, lng, label = "Your Location") {
    // ... (addUserMarker can now use the userIcon) ...
    if (userMarker && map.hasLayer(userMarker)) map.removeLayer(userMarker);
    userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map) // Use custom user icon
        .bindPopup(`<b>${label}</b>`)
        .openPopup();
     console.log(`User marker added at: ${lat}, ${lng}`);
}

// *** NEW function or modified logic to add hospital markers ***
function addHospitalMarkers(hospitalList) {
    // Clear previous hospital markers
    hospitalMarkers.forEach(marker => {
        if (map.hasLayer(marker)) {
            map.removeLayer(marker);
        }
    });
    hospitalMarkers = []; // Reset the array

    if (!hospitalList || hospitalList.length === 0) {
        return; // Nothing to add
    }

    // Add marker for the BEST hospital (index 0)
    const bestHospital = hospitalList[0];
    const bestMarker = L.marker([bestHospital.lat, bestHospital.lng], { icon: bestHospitalIcon })
        .addTo(map)
        .bindPopup(`<b>${bestHospital.name}</b><br><b>Best Match</b> (${bestHospital.distance.toFixed(1)} km)`);
    hospitalMarkers.push(bestMarker);
    console.log(`Best hospital marker added for ${bestHospital.name}`);

    // Add markers for OTHER suitable hospitals (index 1 onwards)
    for (let i = 1; i < hospitalList.length; i++) {
        const otherHospital = hospitalList[i];
        const otherMarker = L.marker([otherHospital.lat, otherHospital.lng], { icon: otherHospitalIcon })
            .addTo(map)
            .bindPopup(`<b>${otherHospital.name}</b><br>Alternative (${otherHospital.distance.toFixed(1)} km)`);
        hospitalMarkers.push(otherMarker);
         console.log(`Other hospital marker added for ${otherHospital.name}`);
    }
}


async function getOSRMRoute(userLat, userLng, hospitalLat, hospitalLng) {
    // ... (getOSRMRoute function remains the same, calculates route to BEST hospital) ...
    const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${hospitalLng},${hospitalLat}?overview=full&geometries=geojson`;
     console.log("Fetching route from OSRM:", url);

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OSRM request failed: ${response.statusText}`);
        }
        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            const routeGeometry = data.routes[0].geometry;
            const routeDistance = (data.routes[0].distance / 1000).toFixed(2); // in km
            const routeDuration = (data.routes[0].duration / 60).toFixed(0); // in minutes

            console.log(`Route found: ${routeDistance} km, ${routeDuration} min`);

            if (routeLayer && map.hasLayer(routeLayer)) {
                map.removeLayer(routeLayer); // Remove previous route
            }

            routeLayer = L.geoJSON(routeGeometry, {
                style: {
                    color: '#FF0000', // Bright red route line
                    weight: 5,
                    opacity: 0.8
                }
            }).addTo(map);

            // Adjust map view to fit the route *and markers* if possible
            // Consider fitting bounds to the route layer for primary focus
             map.fitBounds(routeLayer.getBounds().pad(0.1)); // Add slight padding

            return { distance: routeDistance, duration: routeDuration }; // Return route details
        } else {
            console.warn("No route found by OSRM.");
            // Fallback: Draw a straight line
            if (routeLayer && map.hasLayer(routeLayer)) map.removeLayer(routeLayer);
            routeLayer = L.polyline([[userLat, userLng], [hospitalLat, hospitalLng]], { color: 'grey', dashArray: '5, 10' }).addTo(map);
             // Fit bounds to the straight line
             if (userMarker) { // Check if user marker exists
                map.fitBounds(L.latLngBounds([userMarker.getLatLng(), routeLayer.getLatLngs()[1]]).pad(0.1));
            } else {
                 map.fitBounds(routeLayer.getBounds().pad(0.1));
            }
            return null; // Indicate no driving route found
        }
    } catch (error) {
        console.error("Error fetching OSRM route:", error);
         // Fallback: Draw a straight line on error
         if (routeLayer && map.hasLayer(routeLayer)) map.removeLayer(routeLayer);
         routeLayer = L.polyline([[userLat, userLng], [hospitalLat, hospitalLng]], { color: 'grey', dashArray: '5, 10' }).addTo(map);
          // Fit bounds to the straight line
          if (userMarker) { // Check if user marker exists
             map.fitBounds(L.latLngBounds([userMarker.getLatLng(), routeLayer.getLatLngs()[1]]).pad(0.1));
         } else {
              map.fitBounds(routeLayer.getBounds().pad(0.1));
         }
        return null;
    }
}

// *** MODIFIED: Now only displays info for the BEST hospital ***
function displayInfo(bestHospital, medicalNeeds, routeInfo) {
    detailsContainer.innerHTML = ''; // Clear previous details
    urgencyDisplay.innerHTML = ''; // Clear previous urgency

    if (!bestHospital) {
         // This case handles when findSuitableHospitalsSorted returns an empty list
         infoContainer.style.display = 'block';
         infoTitle.textContent = "No Suitable Hospital Found";
         detailsContainer.innerHTML = `
            <div class="detail-box">
                <h3>Unable to Find Match</h3>
                <p>We could not find a hospital matching the specific needs based on available data and your location.</p>
                <p><strong>Please call the emergency helpline immediately: 8329227255</strong></p>
            </div>`;
        return;
    }

    // Display Urgency (based on medicalNeeds analysis)
    const urgencyLabels = ['Low', 'Moderate', 'High', 'Very High', 'Critical'];
     urgencyDisplay.innerHTML = `
         <span class="urgency-indicator urgency-${medicalNeeds.urgencyLevel}">
            Assessed Urgency: ${urgencyLabels[medicalNeeds.urgencyLevel - 1]} (${medicalNeeds.urgencyLevel}/5)
         </span>`;

    // Populate Details only for the best hospital
    let hospitalHTML = `
        <div class="detail-box">
            <h3><img src="https://img.icons8.com/ios-filled/20/1a4f93/hospital-3.png" alt="Hospital Icon" style="vertical-align: middle; margin-right: 5px;"> Recommended Hospital</h3>
            <p><strong>${bestHospital.name}</strong></p>
            <p>Distance: ${bestHospital.distance.toFixed(1)} km (approx.)</p>`; // Use distance from the hospital object
    if (routeInfo) {
         hospitalHTML += `<p>Est. Driving Time: ${routeInfo.duration} min</p>`;
    }
     hospitalHTML += `<p>ICU Available: ${bestHospital.hasICU ? 'Yes' : 'No'}</p>
        </div>`;

     let needsHTML = `
        <div class="detail-box">
             <h3><img src="https://img.icons8.com/ios-glyphs/20/1a4f93/heart-with-pulse.png" alt="Needs Icon" style="vertical-align: middle; margin-right: 5px;"> Patient Needs Assessment</h3>
             <p>Condition: ${medicalNeeds.conditionLabel}</p>
            <p>Requires ICU: ${medicalNeeds.needsICU ? 'Yes' : 'No'}</p>
             <p>Likely Specialist: ${formatName(medicalNeeds.needsSpecialist || 'General Care')}</p>
             ${medicalNeeds.requiredEquipment.length > 0 ?
                 `<p>Potential Equipment: ${medicalNeeds.requiredEquipment.map(formatName).join(', ')}</p>` :
                 '<p>Specific Equipment Needs: Not identified</p>'}
        </div>`;

    let capabilitiesHTML = `
        <div class="detail-box">
            <h3><img src="https://img.icons8.com/ios-filled/20/1a4f93/medical-doctor.png" alt="Capabilities Icon" style="vertical-align: middle; margin-right: 5px;"> Hospital Capabilities</h3>
            <p><strong>Available Specialists:</strong></p>
            <ul>${bestHospital.specialists.map(spec => `<li><span class="tag">${formatName(spec)}</span></li>`).join('')}</ul>
             <p><strong>Available Equipment:</strong></p>
             <ul>${bestHospital.equipment.map(equip => `<li><span class="tag">${formatName(equip)}</span></li>`).join('')}</ul>
        </div>`;

     detailsContainer.innerHTML = hospitalHTML + needsHTML + capabilitiesHTML;
     infoContainer.style.display = 'block'; // Show the info container
     infoTitle.textContent = "Emergency Assessment & Best Hospital"; // Reset title
}


function goBack() {
    // ... (goBack remains the same) ...
     window.location.href = 'index.html';
}

function hideLoadingScreen() {
    // ... (hideLoadingScreen remains the same) ...
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
    }
}

// --- Initialization ---

function main() {
     // Add event listener for the back button
    if (backButton) {
        backButton.addEventListener('click', goBack);
    } else {
        console.error("Back button element not found!");
    }

    const selectedCondition = localStorage.getItem('selectedCondition') || 'other';
    const detailsText = localStorage.getItem('patientDetails') || '';
    console.log("Retrieved from localStorage:", { selectedCondition, detailsText });

    const medicalNeeds = analyzePatientCondition(selectedCondition, detailsText);
    console.log("Analyzed Medical Needs:", medicalNeeds);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                console.log("Geolocation success:", userLocation);

                initializeMap(userLocation.lat, userLocation.lng);
                addUserMarker(userLocation.lat, userLocation.lng);

                // Find ALL suitable hospitals, sorted by distance
                const suitableHospitalsList = findSuitableHospitalsSorted(userLocation, medicalNeeds);

                if (suitableHospitalsList.length > 0) {
                    const bestHospital = suitableHospitalsList[0]; // The closest suitable one

                    // Add markers for ALL suitable hospitals (best is red, others grey)
                    addHospitalMarkers(suitableHospitalsList);

                    // Get and Draw Route ONLY to the best hospital
                    const routeInfo = await getOSRMRoute(userLocation.lat, userLocation.lng, bestHospital.lat, bestHospital.lng);

                    // Display Information Panel ONLY for the best hospital
                     displayInfo(bestHospital, medicalNeeds, routeInfo);

                } else {
                    // No suitable hospital found
                    addHospitalMarkers([]); // Ensure no hospital markers are shown
                    displayInfo(null, medicalNeeds, null); // Display the "not found" message
                     // Keep map centered on user or default view
                }

                hideLoadingScreen();

            },
            (error) => {
                // ... (Error handling remains the same, find hospitals based on default location) ...
                console.error("Geolocation error:", error);
                alert(`Geolocation Error: ${error.message}. Using a default location (Mumbai) for demonstration.`);
                const defaultLocation = { lat: 19.0760, lng: 72.8777 };
                initializeMap(defaultLocation.lat, defaultLocation.lng);
                addUserMarker(defaultLocation.lat, defaultLocation.lng, "Default Location (Mumbai)");

                const suitableHospitalsList = findSuitableHospitalsSorted(defaultLocation, medicalNeeds);

                if (suitableHospitalsList.length > 0) {
                    const bestHospital = suitableHospitalsList[0];
                    addHospitalMarkers(suitableHospitalsList);
                    getOSRMRoute(defaultLocation.lat, defaultLocation.lng, bestHospital.lat, bestHospital.lng)
                       .then(routeInfo => displayInfo(bestHospital, medicalNeeds, routeInfo));
                } else {
                     addHospitalMarkers([]);
                     displayInfo(null, medicalNeeds, null);
                }
                hideLoadingScreen();
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    } else {
        // ... (Geolocation not supported handling remains the same) ...
        console.error("Geolocation is not supported by this browser.");
        alert("Geolocation is not supported by your browser. Cannot find the nearest hospital.");
        hideLoadingScreen();
         // Attempt to initialize map at a default location even without geolocation? Or just show error.
         const defaultLocation = { lat: 19.0760, lng: 72.8777 }; // Mumbai default
         initializeMap(defaultLocation.lat, defaultLocation.lng);
         // Since we can't find hospitals relative to user, maybe just show the error panel.
        displayInfo(null, medicalNeeds, null); // Show error in info panel
    }
}

// --- Run Initialization when DOM is ready ---
document.addEventListener('DOMContentLoaded', main);