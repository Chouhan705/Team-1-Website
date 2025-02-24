document.addEventListener('DOMContentLoaded', function() {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const dropdownMenu = document.getElementById('dropdown-menu');

    hamburgerMenu.addEventListener('click', function() {
        dropdownMenu.classList.toggle('hidden');
    });

    // Close the dropdown when clicking outside of it
    document.addEventListener('click', function(event) {
        if (!hamburgerMenu.contains(event.target) && !dropdownMenu.contains(event.target)) {
            dropdownMenu.classList.add('hidden');
        }
    });
});

function selectCondition(card, condition) {
    // Remove selected class from all cards
    document.querySelectorAll('.card').forEach(c => {
        c.classList.remove('selected');
    });

    // Add selected class to clicked card
    card.classList.add('selected');

    // Store the selected condition
    localStorage.setItem('selectedCondition', condition);
}

function submitDetails() {
    const details = document.getElementById('patient-details').value;
    const selectedCondition = localStorage.getItem('selectedCondition') || 'none';

    // Here you would typically send this data to a server
    console.log('Patient Condition:', selectedCondition);
    console.log('Additional Details:', details);

    // Clear the form
    document.getElementById('patient-details').value = '';
    document.querySelectorAll('.card').forEach(card => {
        card.classList.remove('selected');
    });
    localStorage.removeItem('selectedCondition');

    // Show confirmation
    alert('Patient details submitted successfully!');
}