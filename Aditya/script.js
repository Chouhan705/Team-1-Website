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

function selectImage(selectedImg) {
    document.querySelectorAll('.image-button').forEach(img => {
        img.classList.remove('selected');
    });

    selectedImg.classList.add('selected');
}


