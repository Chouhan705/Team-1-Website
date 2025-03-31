document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const submitButton = document.getElementById('submit-conditions');

    // --- Hamburger Menu Logic ---
    // ... (hamburger logic remains the same) ...
    if(hamburgerMenu && dropdownMenu){
         hamburgerMenu.addEventListener('click', function(event) {
            dropdownMenu.classList.toggle('hidden');
            event.stopPropagation(); // Prevent click from immediately closing menu
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

    // --- Card Selection Logic ---
    // ... (card selection logic remains the same) ...
    document.querySelectorAll('.card').forEach(card => {
         card.addEventListener('click', () => selectCondition(card));
     });

    // --- Voice Input Logic (Simplified Integration) ---
    const speakBtn = document.getElementById('speak-condition-btn');
    const voiceOutputDiv = document.getElementById('voice-output');
    const voiceStatusDiv = document.getElementById('voice-status');
    let recognition = null;
    let isRecording = false;
    let recognizedText = ""; // Variable to store the final transcript

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition && speakBtn && voiceOutputDiv && voiceStatusDiv) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            isRecording = true;
            voiceStatusDiv.textContent = 'Status: Recording... Speak now!';
            speakBtn.textContent = '🛑 Listening... Stop Speaking to Finish';
            speakBtn.classList.add('recording');
            voiceOutputDiv.textContent = 'Listening...'; // Clear previous text
            recognizedText = ""; // Clear previous result
            console.log('Speech recognition started.');
             // Deselect any card when starting voice input
             document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            recognizedText = transcript; // Store the final transcript
            voiceOutputDiv.textContent = transcript; // Display it
            console.log('Transcript:', transcript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            voiceStatusDiv.textContent = `Error: ${event.error}`;
            voiceOutputDiv.textContent = 'Error during recognition. Please try again.';
            recognizedText = ""; // Clear result on error
            // Reset button state is handled in onend
        };

        recognition.onend = () => {
            isRecording = false;
            voiceStatusDiv.textContent = 'Status: Finished / Ready';
            speakBtn.textContent = '🎤 Press and Speak Condition';
            speakBtn.classList.remove('recording');
             if (!recognizedText && voiceOutputDiv.textContent === 'Listening...') {
                 voiceOutputDiv.textContent = 'No speech detected or recognized. Try again.'; // Provide feedback if nothing was captured
             }
            console.log('Speech recognition ended.');
        };

        speakBtn.addEventListener('click', () => {
            if (isRecording) {
                 // Allow manual stop, though continuous=false often handles it
                recognition.stop();
                console.log('Stopping recording manually.');
            } else {
                 try {
                    recognition.start();
                 } catch (error) {
                     console.error("Error starting recognition:", error);
                     voiceStatusDiv.textContent = 'Error: Could not start. Check permissions?';
                 }
            }
        });

    } else {
        // Feature not supported or elements missing
        if(speakBtn) {
            speakBtn.disabled = true;
            speakBtn.textContent = 'Voice Not Supported';
        }
         if(voiceStatusDiv) voiceStatusDiv.textContent = 'Status: Speech Recognition not supported.';
        console.warn('Web Speech API not supported or required elements missing.');
    }
    // --- END OF VOICE INPUT LOGIC ---


     // --- HOSPITAL SLIDESHOW LOGIC ---
     // ... (Slideshow logic remains the same - Ensure it's inside DOMContentLoaded) ...
    const slideshowContainer = document.getElementById('hospital-slideshow');
    if (slideshowContainer) { // Check if the slideshow exists on the page
        const slides = slideshowContainer.querySelectorAll('.hospital-slide');
        const prevButton = document.getElementById('prev-slide');
        const nextButton = document.getElementById('next-slide');
        let currentSlideIndex = 0;
        let slideInterval = null; // To hold the interval timer

        function showSlide(index) {
            slides.forEach(slide => {
                slide.classList.remove('active-slide');
                slide.style.display = 'none';
            });
            currentSlideIndex = (index + slides.length) % slides.length;
             if (slides[currentSlideIndex]) {
                slides[currentSlideIndex].style.display = 'block';
                setTimeout(() => {
                     slides[currentSlideIndex].classList.add('active-slide');
                }, 10);
            }
        }
        function nextSlide() { showSlide(currentSlideIndex + 1); }
        function prevSlide() { showSlide(currentSlideIndex - 1); }
         function startSlideshow() { stopSlideshow(); slideInterval = setInterval(nextSlide, 5000); }
         function stopSlideshow() { clearInterval(slideInterval); }

        if (slides.length > 0) {
            showSlide(0); startSlideshow();
            if (nextButton) nextButton.addEventListener('click', () => { stopSlideshow(); nextSlide(); });
            if (prevButton) prevButton.addEventListener('click', () => { stopSlideshow(); prevSlide(); });
            slideshowContainer.addEventListener('mouseenter', stopSlideshow);
            slideshowContainer.addEventListener('mouseleave', startSlideshow);
        } else {
            console.log("No slides found for the hospital slideshow.");
             if(prevButton) prevButton.style.display = 'none';
             if(nextButton) nextButton.style.display = 'none';
        }
    } else {
         console.log("Slideshow container not found.");
    }
     // --- END OF HOSPITAL SLIDESHOW LOGIC ---

      // --- Submit Button Logic ---
      if (submitButton) {
          submitButton.addEventListener('click', handleSubmit); // Attach the handler
      } else {
          console.error("Submit button (#submit-conditions) not found!");
      }

}); // End of DOMContentLoaded listener


// --- Global Functions ---

// Function to handle card selection visuals
function selectCondition(selectedCardElement) {
    // Remove 'selected' class from all cards
    document.querySelectorAll('.card').forEach(c => {
        c.classList.remove('selected');
    });

    // Add 'selected' class to the clicked card
    if (selectedCardElement) {
        selectedCardElement.classList.add('selected');
        // Clear voice input result when a card is selected
        const voiceOutputDiv = document.getElementById('voice-output');
        const voiceStatusDiv = document.getElementById('voice-status');
        if(voiceOutputDiv) voiceOutputDiv.textContent = 'Card selected. Voice input cleared.';
        if(voiceStatusDiv) voiceStatusDiv.textContent = 'Status: Ready';
        // Access the global or pass it if needed
        // recognizedText = ""; // Clear the stored text too
    }
     // Clear the recognized text variable when a card is selected
     // Access the variable directly (since it's in the outer scope of DOMContentLoaded)
     // Or better, make recognizedText a global variable if needed outside DOMContentLoaded
     // For simplicity here, we assume handleSubmit can access it.
      window.recognizedText = ""; // Make it global or handle scope appropriately


}

// Modified handleSubmit to use recognizedText instead of textarea
function handleSubmit() {
    const selectedConditionCard = document.querySelector('.card.selected'); // Find the selected card
    // Access the recognized text (make sure it's accessible, e.g., via window scope or pass it)
    const voiceDetails = window.recognizedText || ""; // Use the globally stored text

    let finalCondition = 'other'; // Default to 'other'
    let detailsToSave = voiceDetails.trim(); // Use voice input as details by default

    // 1. Check if a card is selected - Card takes precedence
    if (selectedConditionCard) {
        finalCondition = selectedConditionCard.dataset.condition;
        detailsToSave = ""; // Don't save voice details if a card is explicitly chosen
        console.log('Using Selected Card Condition:', finalCondition);
    } else if (detailsToSave) {
        // 2. If no card selected, but voice details ARE available, condition is 'other'
        finalCondition = 'other';
        console.log('Using Voice Input Details. Condition set to:', finalCondition);
    } else {
        // 3. If NO card is selected AND NO voice details are available, show error and stop
        alert('Please select an emergency condition OR press the microphone button and describe the situation.');
        return; // Stop the submission
    }

    // --- Save data to localStorage for map_display.html ---
    localStorage.setItem('selectedCondition', finalCondition);
    localStorage.setItem('patientDetails', detailsToSave); // Save voice text or empty string

    console.log('Data saved to localStorage:');
    console.log('  selectedCondition:', localStorage.getItem('selectedCondition'));
    console.log('  patientDetails:', localStorage.getItem('patientDetails'));

     // Reset UI elements before navigating (optional)
     document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
     const voiceOutputDiv = document.getElementById('voice-output');
     if(voiceOutputDiv) voiceOutputDiv.textContent = 'Recognized text will appear here...';
     window.recognizedText = ""; // Clear stored text

    // --- Redirect to the map display page ---
    window.location.href = 'map-index.html'; // Make sure filename matches
}

// Make recognizedText accessible to handleSubmit - simple global approach for demo
window.recognizedText = "";