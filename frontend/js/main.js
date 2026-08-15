const currentHostname = window.location.hostname || "localhost";
const currentProtocol = window.location.protocol || "http:";
const API_BASE_URL = `${currentProtocol}//${currentHostname}:5000/api`;

// Reset any saved dark mode theme
try {
    localStorage.removeItem("theme");
    document.documentElement.removeAttribute("data-theme");
    if (document.body) {
        document.body.removeAttribute("data-theme");
    }
} catch (e) {}

// Helper function to get authorization header
function getAuthHeaders() {
    const token = localStorage.getItem("token");
    return token ? {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    } : {
        "Content-Type": "application/json"
    };
}

// Global Logout Handler
function logoutUser() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    
    // Redirect to login page
    const isInSubfolder = window.location.pathname.includes("/user/") ||
                         window.location.pathname.includes("/organizer/") ||
                         window.location.pathname.includes("/admin/");
    window.location.href = isInSubfolder ? "../login.html" : "login.html";
}

// Global DOM Content Loaded Handler
document.addEventListener("DOMContentLoaded", () => {
    // Ensure any injected dark mode button is removed
    const toggleBtn = document.getElementById("themeToggleBtn");
    if (toggleBtn) {
        toggleBtn.remove();
    }

    // Navigation mobile menu toggle
    const menuBtn = document.getElementById("menuBtn");
    const navMenu = document.getElementById("navMenu");

    if (menuBtn && navMenu) {
        menuBtn.addEventListener("click", () => {
            navMenu.classList.toggle("show");
        });
    }

    // Attach logout event to any logout buttons/links
    const logoutLinks = document.querySelectorAll('a[href$="login.html"], #logoutBtn');
    logoutLinks.forEach(link => {
        if (link.id === 'logoutBtn' || link.textContent.trim().toLowerCase().includes("logout")) {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                logoutUser();
            });
        }
    });

    // Event search from header input
    const eventSearch = document.getElementById("eventSearch");
    const searchBtn = document.querySelector(".search-btn");

    if (eventSearch && searchBtn) {
        searchBtn.addEventListener("click", () => {
            const searchValue = eventSearch.value.trim();
            const isInSubfolder = window.location.pathname.includes("/user/") ||
                                 window.location.pathname.includes("/organizer/") ||
                                 window.location.pathname.includes("/admin/");
            const prefix = isInSubfolder ? "../" : "";
            if (searchValue !== "") {
                window.location.href = `${prefix}events.html?search=${encodeURIComponent(searchValue)}`;
            } else {
                window.location.href = `${prefix}events.html`;
            }
        });
    }
});