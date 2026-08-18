document.addEventListener("DOMContentLoaded", function () {
    // ---------------------------------------------------
    // 1. LOGIN FORM HANDLER
    // ---------------------------------------------------
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
                    loginMessage.style.color = "#34d399";
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
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("user", JSON.stringify(data.user));
                    localStorage.setItem("loggedIn", "true");
                    localStorage.setItem("userEmail", data.user.email);
                    localStorage.setItem("userRole", data.user.role);

                    if (loginMessage) {
                        loginMessage.textContent = "Login successful! Redirecting...";
                        loginMessage.style.color = "#34d399";
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
                        loginMessage.style.color = "#fca5a5";
                    } else {
                        alert(data.message || "Invalid email or password.");
                    }
                }
            } catch (error) {
                console.error("Login error:", error);
                if (loginMessage) {
                    loginMessage.textContent = "Connection error. Is the backend server running?";
                    loginMessage.style.color = "#fca5a5";
                }
            }
        });
    }

    // ---------------------------------------------------
    // 2. FORGOT PASSWORD FORM HANDLER
    // ---------------------------------------------------
    const forgotPasswordForm = document.getElementById("forgotPasswordForm");
    const forgotMessage = document.getElementById("forgotMessage");
    const sendResetBtn = document.getElementById("sendResetBtn");

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const email = document.getElementById("email").value.trim();

            if (!email) {
                showMessage(forgotMessage, "Please enter a valid email address.", "error");
                return;
            }

            try {
                sendResetBtn.disabled = true;
                sendResetBtn.textContent = "Sending Request...";
                showMessage(forgotMessage, "Sending password reset request...", "success");

                const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                });

                const data = await res.json();
                sendResetBtn.disabled = false;
                sendResetBtn.textContent = "Send Password Reset Link →";

                if (data.success) {
                    let msgHtml = `<div>${data.message || "Password reset link sent to your registered email."}</div>`;
                    if (data.resetUrl) {
                        msgHtml += `<div style="margin-top:14px;"><a href="${data.resetUrl}" class="submit-btn" style="display:inline-block; text-decoration:none; text-align:center; padding:12px 20px; font-weight:800; background:linear-gradient(135deg,#10b981,#059669); color:#fff; border-radius:10px;">🔑 Click Here to Reset Password Now →</a></div>`;
                    }
                    if (forgotMessage) {
                        forgotMessage.className = "message-box success";
                        forgotMessage.innerHTML = msgHtml;
                        forgotMessage.style.display = "block";
                    }
                    forgotPasswordForm.reset();
                } else {
                    showMessage(forgotMessage, data.message || "No account found with this email address.", "error");
                }
            } catch (err) {
                console.error("Forgot Password Error:", err);
                sendResetBtn.disabled = false;
                sendResetBtn.textContent = "Send Password Reset Link →";
                showMessage(forgotMessage, "Error connecting to backend server.", "error");
            }
        });
    }

    // ---------------------------------------------------
    // 3. RESET PASSWORD FORM HANDLER
    // ---------------------------------------------------
    const resetPasswordForm = document.getElementById("resetPasswordForm");
    const resetMessage = document.getElementById("resetMessage");
    const resetSubmitBtn = document.getElementById("resetSubmitBtn");

    if (resetPasswordForm) {
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get("token");
        const hiddenTokenInput = document.getElementById("resetToken");
        const manualTokenGroup = document.getElementById("manualTokenGroup");
        const manualTokenInput = document.getElementById("manualTokenInput");

        if (tokenFromUrl) {
            if (hiddenTokenInput) hiddenTokenInput.value = tokenFromUrl;
        } else {
            if (manualTokenGroup) manualTokenGroup.style.display = "block";
            showMessage(resetMessage, "No reset token detected in URL. Please enter your reset token below or request a new reset link.", "error");
        }

        resetPasswordForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            let token = hiddenTokenInput ? hiddenTokenInput.value : "";
            if (!token && manualTokenInput) {
                token = manualTokenInput.value.trim();
            }

            const newPassword = document.getElementById("newPassword").value.trim();
            const confirmPassword = document.getElementById("confirmPassword").value.trim();

            if (!token) {
                showMessage(resetMessage, "Please enter a valid reset token.", "error");
                return;
            }

            if (newPassword.length < 8) {
                showMessage(resetMessage, "Password must contain at least 8 characters.", "error");
                return;
            }

            if (newPassword !== confirmPassword) {
                showMessage(resetMessage, "Passwords do not match.", "error");
                return;
            }

            try {
                resetSubmitBtn.disabled = true;
                resetSubmitBtn.textContent = "Updating Password...";

                const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token, newPassword, confirmPassword })
                });

                const data = await res.json();
                resetSubmitBtn.disabled = false;
                resetSubmitBtn.textContent = "Update Password →";

                if (data.success) {
                    showMessage(resetMessage, "Password changed successfully! Redirecting to login...", "success");
                    resetPasswordForm.reset();
                    setTimeout(() => {
                        window.location.href = "login.html";
                    }, 1800);
                } else {
                    showMessage(resetMessage, data.message || "Reset link has expired. Please request a new one.", "error");
                }
            } catch (err) {
                console.error("Reset Password Error:", err);
                resetSubmitBtn.disabled = false;
                resetSubmitBtn.textContent = "Update Password →";
                showMessage(resetMessage, "Error connecting to backend server.", "error");
            }
        });
    }

    // ---------------------------------------------------
    // 4. FORGOT EMAIL ID & OTP VERIFICATION HANDLER
    // ---------------------------------------------------
    const requestOtpForm = document.getElementById("requestOtpForm");
    const verifyOtpForm = document.getElementById("verifyOtpForm");
    const phoneMessage = document.getElementById("phoneMessage");
    const otpMessage = document.getElementById("otpMessage");
    const sendOtpBtn = document.getElementById("sendOtpBtn");
    const verifyOtpBtn = document.getElementById("verifyOtpBtn");

    let activePhone = "";

    if (requestOtpForm) {
        requestOtpForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const phone = document.getElementById("phone").value.trim();

            if (!phone) {
                showMessage(phoneMessage, "Please enter your registered mobile number.", "error");
                return;
            }

            try {
                sendOtpBtn.disabled = true;
                sendOtpBtn.textContent = "Sending OTP...";
                showMessage(phoneMessage, "Sending OTP...", "success");

                const res = await fetch(`${API_BASE_URL}/auth/forgot-email`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone })
                });

                const data = await res.json();
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = "Send Verification OTP →";

                if (data.success) {
                    activePhone = phone;
                    document.getElementById("step1Phone").style.display = "none";
                    document.getElementById("step2Otp").style.display = "block";
                    const displayPhoneEl = document.getElementById("displayPhone");
                    if (displayPhoneEl) displayPhoneEl.textContent = activePhone;

                    let msg = data.message || "OTP sent successfully.";
                    if (data.devOtp) {
                        msg += ` (Verification OTP: ${data.devOtp})`;
                    }
                    showMessage(otpMessage, msg, "success");
                } else {
                    showMessage(phoneMessage, data.message || "No account found with this registered mobile number.", "error");
                }
            } catch (err) {
                console.error("Request OTP Error:", err);
                sendOtpBtn.disabled = false;
                sendOtpBtn.textContent = "Send Verification OTP →";
                showMessage(phoneMessage, "Error connecting to backend server.", "error");
            }
        });
    }

    if (verifyOtpForm) {
        verifyOtpForm.addEventListener("submit", async function (e) {
            e.preventDefault();

            const otp = document.getElementById("otp").value.trim();

            if (!otp || otp.length !== 6) {
                showMessage(otpMessage, "Please enter a valid 6-digit OTP.", "error");
                return;
            }

            try {
                verifyOtpBtn.disabled = true;
                verifyOtpBtn.textContent = "Verifying OTP...";

                const res = await fetch(`${API_BASE_URL}/auth/verify-recovery-otp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone: activePhone, otp })
                });

                const data = await res.json();
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.textContent = "Verify OTP & Show Email →";

                if (data.success && data.maskedEmail) {
                    document.getElementById("step2Otp").style.display = "none";
                    document.getElementById("step3Result").style.display = "block";
                    document.getElementById("maskedEmailResult").textContent = data.maskedEmail;
                } else {
                    showMessage(otpMessage, data.message || "Invalid or expired OTP.", "error");
                }
            } catch (err) {
                console.error("Verify OTP Error:", err);
                verifyOtpBtn.disabled = false;
                verifyOtpBtn.textContent = "Verify OTP & Show Email →";
                showMessage(otpMessage, "Error connecting to backend server.", "error");
            }
        });
    }

    // Helper to display clean messages
    function showMessage(element, text, type) {
        if (!element) return;
        element.textContent = text;
        element.className = `message-box ${type}`;
    }
});