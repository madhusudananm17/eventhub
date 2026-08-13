const API_BASE_URL = "http://localhost:5000/api";

// Immediate Theme Initialization (Prevents page flicker)
(function () {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (document.body) {
        document.body.setAttribute("data-theme", savedTheme);
    }
})();

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

// Initialize Dark Mode Toggle Button & State
function initDarkModeToggle() {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    if (document.body) {
        document.body.setAttribute("data-theme", savedTheme);
    }

    const navContainer = document.querySelector(".nav-menu") || document.querySelector(".nav-links");
    if (navContainer && !document.getElementById("themeToggleBtn")) {
        const toggleBtn = document.createElement("button");
        toggleBtn.id = "themeToggleBtn";
        toggleBtn.className = "theme-toggle-btn";
        toggleBtn.type = "button";
        toggleBtn.setAttribute("title", "Toggle Dark/Light Mode");

        updateToggleBtnUI(toggleBtn, savedTheme);

        toggleBtn.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme") || "light";
            const newTheme = currentTheme === "dark" ? "light" : "dark";

            document.documentElement.setAttribute("data-theme", newTheme);
            if (document.body) {
                document.body.setAttribute("data-theme", newTheme);
            }
            localStorage.setItem("theme", newTheme);

            updateToggleBtnUI(toggleBtn, newTheme);
        });

        navContainer.appendChild(toggleBtn);
    }
}

function updateToggleBtnUI(btn, theme) {
    if (!btn) return;
    if (theme === "dark") {
        btn.innerHTML = `☀️ Light Mode`;
    } else {
        btn.innerHTML = `🌙 Dark Mode`;
    }
}

// Global DOM Content Loaded Handler
document.addEventListener("DOMContentLoaded", () => {
    // Initialize Theme Toggle
    initDarkModeToggle();

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