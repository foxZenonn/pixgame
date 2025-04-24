// menu.js

let userData = {
    username: "Guest",
    points: 0,
    tickets: 0,
    stars: 0
};

// Initialize Menu
function initMenu() {
    // Load Telegram user data
    const tg = window.Telegram.WebApp;
    if(tg.initDataUnsafe.user) {
        userData.username = tg.initDataUnsafe.user.first_name || "Player";
        userData.points = tg.CloudStorage.getItem('points') || 0;
    }
    
    updateUserDisplay();
    setupNavigation();
    setupEventListeners();
}

// Update user display
function updateUserDisplay() {
    document.getElementById('username').textContent = userData.username;
    document.getElementById('userPoints').textContent = userData.points;
    document.getElementById('userTickets').textContent = userData.tickets;
    document.getElementById('userStars').textContent = userData.stars;
}

// Navigation Setup
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Show target section
            const targetId = this.dataset.target;
            document.querySelectorAll('.main-section').forEach(section => {
                section.style.display = section.id === targetId ? 'block' : 'none';
            });
        });
    });
}

// Popup Controls
function showAccountPopup() {
    document.getElementById('popupUsername').textContent = userData.username;
    document.getElementById('popupPoints').textContent = userData.points;
    document.getElementById('popupTickets').textContent = userData.tickets;
    document.getElementById('popupStars').textContent = userData.stars;
    document.getElementById('accountPopup').style.display = 'block';
}

function closePopup() {
    document.getElementById('accountPopup').style.display = 'none';
}

// Settings Controls
function showSettings() {
    // Implement settings logic
    alert('Settings menu coming soon!');
}

// Event Listeners
function setupEventListeners() {
    // Close popup when clicking outside
    window.onclick = function(event) {
        const popup = document.getElementById('accountPopup');
        if(event.target === popup) {
            closePopup();
        }
    }
}

// Initialize when loaded
document.addEventListener('DOMContentLoaded', initMenu);