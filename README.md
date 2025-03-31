# Chetak - Emergency Medical Assistance Navigator 🚑💨

Chetak is a web application designed to quickly identify the nearest *suitable* hospital based on a patient's emergency condition and current location. In critical moments, finding the right facility fast is crucial, and Chetak aims to streamline this process.

This project was developed as a college assignment, demonstrating core concepts in web development, geolocation, API integration, and conditional logic.

---

## ✨ Key Features

*   **Emergency Condition Input:**
    *   Select common emergencies (Cardiac Arrest, Accident, Stroke, etc.) via intuitive cards.
    *   Describe the condition using **Voice Input** (via Web Speech API).
*   **Needs Assessment:** Simplified analysis determines potential needs (ICU, specialist, equipment) based on the input.
*   **Geolocation:** Automatically detects the user's current location using the browser's Geolocation API.
*   **Hospital Matching:**
    *   Filters a static database of hospitals based on required capabilities (ICU, specialists, equipment).
    *   Calculates distances using the Haversine formula.
    *   Sorts suitable hospitals by proximity.
*   **Map Display (Leaflet.js):**
    *   Shows the user's location (blue marker).
    *   Highlights the **best match** hospital (closest suitable - red marker).
    *   Displays other suitable hospitals as alternatives (grey markers).
*   **Routing (OSRM API):** Automatically displays the driving route from the user to the best match hospital.
*   **Responsive Design:** Basic layout adjustments for different screen sizes.
*   **Contact Form:** Functional contact form using Formspree for email submission.
*   **Static Hosting Ready:** Built with HTML, CSS, and JavaScript, suitable for easy deployment on platforms like GitHub Pages, Netlify, or Vercel.

---

## 🚀 How It Works

1.  **Select/Speak Condition:** On the main page (`index.html`), the user either clicks one of the condition cards OR clicks the "Press and Speak Condition" button to describe the emergency using their voice.
2.  **Submit:** The user clicks "Find Nearest Hospital".
3.  **Data Saved:** The selected condition identifier (or 'other' for voice) and the recognized voice text (if applicable) are saved to the browser's `localStorage`.
4.  **Redirect to Map:** The user is redirected to the map display page (`map_display.html`).
5.  **Location & Analysis:**
    *   `map_display.html` requests permission to access the user's location.
    *   It retrieves the condition data from `localStorage`.
    *   A simple analysis function determines the *potential* medical needs based on the condition/description.
6.  **Hospital Search:**
    *   The script filters the predefined list of hospitals to find those matching the required needs (e.g., has ICU, has required specialist).
    *   Distances from the user's location to suitable hospitals are calculated.
    *   Suitable hospitals are sorted by distance.
7.  **Display Results:**
    *   The map is initialized, centered on the user.
    *   Markers are added for the user, the closest suitable hospital (best match), and other suitable hospitals.
    *   A route is fetched from the OSRM API and drawn on the map to the best match hospital.
    *   An information panel displays details about the patient's assessed needs and the recommended (best match) hospital's capabilities.

---

## 🛠️ Tech Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **Mapping:** Leaflet.js
*   **Routing:** Open Source Routing Machine (OSRM) API
*   **Voice Input:** Web Speech API (Browser-based)
*   **Icons:** Font Awesome
*   **Form Backend:** Formspree.io (for contact form)

---

## ⚙️ Setup and Running Locally

1.  **Clone the Repository:**
    ```bash
    git clone [Your Repository URL]
    cd [repository-folder-name]
    ```
2.  **Open `index.html`:** Simply open the `index.html` file in a modern web browser (like Chrome, Firefox, Edge, Safari) that supports the Geolocation and Web Speech APIs.
    *   Double-click the file in your file explorer.
    *   OR navigate using the `file:///` protocol in your browser's address bar.
3.  **Permissions:** The browser will ask for permission to:
    *   Access your location (required for finding nearby hospitals).
    *   Use your microphone (required for voice input).
    **You must allow these permissions for the core features to work.**
4.  **Internet Connection:** Required for:
    *   Loading map tiles (OpenStreetMap).
    *   Fetching routes (OSRM API).
    *   Loading icons (Font Awesome).
    *   Submitting the contact form (Formspree).
5.  **(Optional) Configure Contact Form:**
    *   Sign up at [Formspree.io](https://formspree.io/).
    *   Create a new form and get your unique endpoint URL.
    *   Replace `"https://formspree.io/f/YOUR_UNIQUE_FORM_ID"` in `contact.html` with your actual URL.
    *   Submit the form once from the browser to activate it (check your email for confirmation from Formspree).

---
## 🔮 Future Enhancements

*   **Backend Integration:** Migrate hospital data and matching logic to a proper backend (e.g., Python with Flask/FastAPI and MongoDB).
    *   Utilize MongoDB's geospatial queries for efficient searching.
*   **AI-Powered Analysis:** Integrate a more sophisticated AI model (like Google Gemini API) via the backend for improved natural language understanding of patient conditions.
*   **Real-time Data:** Integrate (hypothetically or via available APIs) real-time hospital data like bed availability, specialist on-call status, and ER wait times.
*   **User Accounts:** Allow users to save profiles or history (requires backend).
*   **Traffic Integration:** Use a routing service API that considers real-time traffic for more accurate ETAs.
*   **Error Handling:** More robust error handling for API calls, geolocation failures, etc.

---

## 🧑‍💻 Contributors

*   **Aditya Chouhan:**  <!-- Replace # -->
    <a href="(https://github.com/Chouhan705)" target="_blank"><img src="https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a>
*   **Harsha Bhujbal:**  <!-- Replace # -->
    <a href="(https://github.com/harrryyyyyyy)" target="_blank"><img src="https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a>
*   **Srushi Gothankar:**  <!-- Replace # -->
    <a href="(https://github.com/Srushti2308)" target="_blank"><img src="https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/></a>

---

## 📄 License

This project is primarily for educational purposes.
