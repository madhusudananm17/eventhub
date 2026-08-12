document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    if (loginForm) {
        loginForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();
            const role = document.getElementById("role").value;

            if (!email || !password || !role) {
                if (loginMessage) {
                    loginMessage.textContent = "Please fill all fields.";
                    loginMessage.style.color = "red";
                } else {
                    alert("Please fill all fields.");
                }
                return;
            }

            try {
                if (loginMessage) {
                    loginMessage.textContent = "Logging in...";
                    loginMessage.style.color = "#635bff";
                }

                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password, role })
                });

                const data = await response.json();

                if (data.success) {
                    // Store Token and User Data
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                    localStorage.setItem("loggedIn", "true");
                    localStorage.setItem("userEmail", data.user.email);
                    localStorage.setItem("userRole", data.user.role);

                    if (loginMessage) {
                        loginMessage.textContent = "Login successful! Redirecting...";
                        loginMessage.style.color = "green";
                    }

                    setTimeout(() => {
                        const userRole = data.user.role;
                        if (userRole === "user") {
                            window.location.href = "user/dashboard.html";
                        } else if (userRole === "organizer") {
                            window.location.href = "organizer/dashboard.html";
                        } else if (userRole === "admin") {
                            window.location.href = "admin/dashboard.html";
                        } else {
                            window.location.href = "index.html";
                        }
                    }, 800);
                } else {
                    if (loginMessage) {
                        loginMessage.textContent = data.message || "Invalid email or password.";
                        loginMessage.style.color = "red";
                    } else {
                        alert(data.message || "Invalid email or password.");
                    }
                }
            } catch (error) {
                console.error("Login error:", error);
                if (loginMessage) {
                    loginMessage.textContent = "Connection error. Is the backend server running?";
                    loginMessage.style.color = "red";
                }
            }
        });
    }
});