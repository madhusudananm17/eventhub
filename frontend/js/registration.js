document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("registerForm");
    const formMessage = document.getElementById("formMessage");

    if (registerForm) {
        registerForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const name = document.getElementById("name").value.trim();
            const email = document.getElementById("email").value.trim();
            const phone = document.getElementById("phone").value.trim();
            const password = document.getElementById("password").value;
            const role = document.getElementById("role").value;

            if (!name || !email || !phone || !password || !role) {
                if (formMessage) {
                    formMessage.textContent = "Please fill all fields.";
                    formMessage.style.color = "red";
                }
                return;
            }

            if (password.length < 6) {
                if (formMessage) {
                    formMessage.textContent = "Password must contain at least 6 characters.";
                    formMessage.style.color = "red";
                }
                return;
            }

            try {
                if (formMessage) {
                    formMessage.textContent = "Creating account...";
                    formMessage.style.color = "#635bff";
                }

                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ name, email, phone, password, role })
                });

                const data = await response.json();

                if (data.success) {
                    if (formMessage) {
                        formMessage.textContent = "Registration successful! Redirecting to login...";
                        formMessage.style.color = "green";
                    }

                    registerForm.reset();

                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1500);
                } else {
                    if (formMessage) {
                        formMessage.textContent = data.message || "Registration failed.";
                        formMessage.style.color = "red";
                    }
                }
            } catch (error) {
                console.error("Registration error:", error);
                if (formMessage) {
                    formMessage.textContent = "Connection error. Is the backend server running?";
                    formMessage.style.color = "red";
                }
            }
        });
    }
});