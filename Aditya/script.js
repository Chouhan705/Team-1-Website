document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const dropdownMenu = document.getElementById('dropdown-menu');
    const submitButton = document.getElementById('submit-conditions');

    // --- Hamburger Menu Logic ---
    // ... (hamburger logic remains the same) ...
    hamburgerMenu.addEventListener('click', function(event) {
        dropdownMenu.classList.toggle('hidden');
        event.stopPropagation(); // Prevent click from immediately closing menu
    });
    document.addEventListener('click', function(event) {
        if (!dropdownMenu.classList.contains('hidden') && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });
    dropdownMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
             dropdownMenu.classList.add('hidden');
        });
    });


    // --- Submit Button Logic ---
    // ... (submit button logic remains the same) ...
     if (submitButton) {
        submitButton.addEventListener('click', handleSubmit);
    } else {
        console.error("Submit button (#submit-conditions) not found!");
    }


    // --- Card Selection Logic ---
    // ... (card selection logic remains the same) ...
    document.querySelectorAll('.card').forEach(card => {
         card.addEventListener('click', () => selectCondition(card));
     });


    // --- HOSPITAL SLIDESHOW LOGIC ---
    const slideshowContainer = document.getElementById('hospital-slideshow');
    if (slideshowContainer) { // Check if the slideshow exists on the page
        const slides = slideshowContainer.querySelectorAll('.hospital-slide');
        const prevButton = document.getElementById('prev-slide');
        const nextButton = document.getElementById('next-slide');
        let currentSlideIndex = 0;
        let slideInterval = null; // To hold the interval timer

        function showSlide(index) {
            // Hide all slides
            slides.forEach(slide => {
                slide.classList.remove('active-slide');
                slide.style.display = 'none'; // Ensure it's hidden
            });

            // Calculate the correct index (handle wrapping)
            currentSlideIndex = (index + slides.length) % slides.length;

            // Show the target slide
             if (slides[currentSlideIndex]) {
                slides[currentSlideIndex].style.display = 'block'; // Set display before adding class
                 // Use a tiny timeout to allow the display property to apply before animation starts
                setTimeout(() => {
                     slides[currentSlideIndex].classList.add('active-slide');
                }, 10);
            }
        }

        function nextSlide() {
            showSlide(currentSlideIndex + 1);
        }

        function prevSlide() {
            showSlide(currentSlideIndex - 1);
        }

         function startSlideshow() {
             stopSlideshow(); // Clear existing interval if any
             slideInterval = setInterval(nextSlide, 5000); // Change slide every 5 seconds (5000ms)
         }

         function stopSlideshow() {
             clearInterval(slideInterval);
         }


        // Initial setup
        if (slides.length > 0) {
            showSlide(0); // Show the first slide initially
            startSlideshow(); // Start automatic sliding

            // Button listeners
            if (nextButton) nextButton.addEventListener('click', () => {
                 stopSlideshow(); // Stop auto slide on manual navigation
                 nextSlide();
            });
            if (prevButton) prevButton.addEventListener('click', () => {
                 stopSlideshow(); // Stop auto slide on manual navigation
                 prevSlide();
            });

             // Optional: Pause slideshow on hover
            slideshowContainer.addEventListener('mouseenter', stopSlideshow);
            slideshowContainer.addEventListener('mouseleave', startSlideshow);

        } else {
            console.log("No slides found for the hospital slideshow.");
             // Optionally hide buttons if no slides
             if(prevButton) prevButton.style.display = 'none';
             if(nextButton) nextButton.style.display = 'none';
        }
    } else {
         console.log("Slideshow container not found.");
    }
     // --- END OF HOSPITAL SLIDESHOW LOGIC ---

}); // End of DOMContentLoaded listener

// --- (Keep the selectCondition and handleSubmit functions as they were) ---
function selectCondition(selectedCardElement) {
    // ... (logic remains the same) ...
    document.querySelectorAll('.card').forEach(c => {
        c.classList.remove('selected');
    });
    if (selectedCardElement) {
        selectedCardElement.classList.add('selected');
    }
}

function handleSubmit() {
    // ... (logic remains the same) ...
    const detailsInput = document.getElementById('patient-details');
    const details = detailsInput.value.trim();
    const selectedConditionCard = document.querySelector('.card.selected');

    let finalCondition = 'other';

    if (selectedConditionCard) {
        finalCondition = selectedConditionCard.dataset.condition;
    } else if (details) {
        // Condition remains 'other'
    } else {
        alert('Please select an emergency condition or describe the situation.');
        return;
    }

    localStorage.setItem('selectedCondition', finalCondition);
    localStorage.setItem('patientDetails', details);

    console.log('Data saved to localStorage:', {
        selectedCondition: localStorage.getItem('selectedCondition'),
        patientDetails: localStorage.getItem('patientDetails')
    });

    window.location.href = 'map_display.html';
}