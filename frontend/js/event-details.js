document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("id");

    if (!eventId) {
        alert("Invalid Event ID.");
        window.location.href = "events.html";
        return;
    }

    let currentEvent = null;
    let selectedPaymentMethod = 'UPI';

    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}`);
        const data = await response.json();

        if (data.success && data.event) {
            currentEvent = data.event;

            const bannerEl = document.getElementById("detailsBanner");
            if (bannerEl) bannerEl.textContent = currentEvent.icon || "🎫";

            const categoryEl = document.getElementById("detailsCategory");
            if (categoryEl) categoryEl.textContent = currentEvent.category || "";

            const titleEl = document.getElementById("detailsTitle");
            if (titleEl) titleEl.textContent = currentEvent.title || "";

            const dateEl = document.getElementById("detailsDate");
            if (dateEl) dateEl.textContent = currentEvent.date ? (String(currentEvent.date).includes('T') ? String(currentEvent.date).split('T')[0] : currentEvent.date) : "";

            const timeEl = document.getElementById("detailsTime");
            if (timeEl) timeEl.textContent = currentEvent.time || "";

            const locationEl = document.getElementById("detailsLocation");
            if (locationEl) locationEl.textContent = `${currentEvent.location} ${currentEvent.venue ? `(${currentEvent.venue})` : ''}`;

            const priceText = currentEvent.price === 0 ? "Free" : "₹" + currentEvent.price;

            const priceEl = document.getElementById("detailsPrice");
            if (priceEl) priceEl.textContent = priceText;

            const priceLargeEl = document.getElementById("detailsPriceLarge");
            if (priceLargeEl) priceLargeEl.textContent = priceText;

            const descEl = document.getElementById("detailsDescription");
            if (descEl) descEl.textContent = currentEvent.description || "";

            // Populate Modal Prices
            const modalPriceBadge = document.getElementById("modalPriceBadge");
            const summaryPrice = document.getElementById("summaryPrice");
            const summaryTotal = document.getElementById("summaryTotal");
            const paySubmitBtn = document.getElementById("paySubmitBtn");

            if (modalPriceBadge) modalPriceBadge.textContent = priceText;
            if (summaryPrice) summaryPrice.textContent = priceText;
            if (summaryTotal) summaryTotal.textContent = priceText;
            if (paySubmitBtn) {
                paySubmitBtn.innerHTML = currentEvent.price === 0
                    ? `✓ Register Free Ticket →`
                    : `🔒 Pay ₹${currentEvent.price} & Book Ticket →`;
            }

            // Clear default values on upiId for explicit payment reference input
            const upiIdInput = document.getElementById("upiId");
            if (upiIdInput && currentEvent.price > 0) {
                upiIdInput.value = "";
                upiIdInput.placeholder = "Enter 12-digit UTR / URN / Txn Ref No. after scanning QR";
            }

            // Populate user info if logged in
            const storedUserRaw = localStorage.getItem("user");
            if (storedUserRaw) {
                try {
                    const u = JSON.parse(storedUserRaw);
                    const nameInput = document.getElementById("guestName");
                    const emailInput = document.getElementById("guestEmail");
                    const phoneInput = document.getElementById("guestPhone");
                    if (nameInput && u.name) nameInput.value = u.name;
                    if (emailInput && u.email) emailInput.value = u.email;
                    if (phoneInput && u.phone) phoneInput.value = u.phone;
                } catch (e) {}
            }

            // Setup Payment Tab Switcher
            const payTabs = document.querySelectorAll(".pay-tab");
            payTabs.forEach(tab => {
                tab.addEventListener("click", () => {
                    payTabs.forEach(t => {
                        t.classList.remove("active");
                        t.style.background = "#fff";
                        t.style.color = "#555";
                        t.style.borderColor = "#ccc";
                    });
                    tab.classList.add("active");
                    tab.style.background = "#e8e7ff";
                    tab.style.color = "#635bff";
                    tab.style.borderColor = "#635bff";

                    selectedPaymentMethod = tab.dataset.method;

                    document.getElementById("upiPayBox").style.display = selectedPaymentMethod === 'UPI' ? 'block' : 'none';
                    document.getElementById("cardPayBox").style.display = selectedPaymentMethod === 'Card' ? 'block' : 'none';
                    document.getElementById("bankingPayBox").style.display = selectedPaymentMethod === 'NetBanking' ? 'block' : 'none';
                });
            });

            // Register/Book Button Handler
            const registerBtn = document.querySelector(".register-event-btn") || document.querySelector(".register-now-btn") || document.querySelector(".btn-primary");

            if (registerBtn) {
                registerBtn.textContent = currentEvent.price === 0 ? "🎟️ Register Free Ticket" : `💳 Pay ₹${currentEvent.price} & Book Ticket`;
                registerBtn.href = "#";

                registerBtn.addEventListener("click", function (e) {
                    e.preventDefault();
                    const modal = document.getElementById("bookingModal");
                    if (modal) modal.style.display = "flex";
                });
            }

            // Modal Close Handler
            const closeBtn = document.getElementById("closeBookingModal");
            if (closeBtn) {
                closeBtn.addEventListener("click", () => {
                    const modal = document.getElementById("bookingModal");
                    if (modal) modal.style.display = "none";
                });
            }

            // Submit Booking Form with Strict Payment Enforcement
            const bookingForm = document.getElementById("instantBookingForm");
            if (bookingForm) {
                bookingForm.addEventListener("submit", async function (e) {
                    e.preventDefault();

                    const name = document.getElementById("guestName").value.trim();
                    const email = document.getElementById("guestEmail").value.trim().toLowerCase();
                    const phone = document.getElementById("guestPhone").value.trim();

                    if (!name || !email || !phone) {
                        alert("Please fill in all attendee details (Name, Email, Phone).");
                        return;
                    }

                    // STRICT PAYMENT VALIDATION FOR PAID EVENTS
                    let transactionId = 'FREE';

                    if (currentEvent.price > 0) {
                        if (selectedPaymentMethod === 'UPI') {
                            const upiVal = document.getElementById("upiId").value.trim();
                            if (!upiVal || upiVal.length < 6) {
                                alert("⚠️ Payment Required!\n\nPlease scan the State Bank of India QR Code using PhonePe/GPay/Paytm and enter your 12-digit UTR / Transaction Reference Number to confirm payment before booking.");
                                return;
                            }
                            transactionId = `UPI_UTR_${upiVal}`;
                        } else if (selectedPaymentMethod === 'Card') {
                            const cardVal = document.getElementById("cardNumber").value.trim();
                            if (!cardVal || cardVal.length < 12) {
                                alert("⚠️ Payment Required!\n\nPlease enter a valid Card Number to complete your ticket purchase.");
                                return;
                            }
                            transactionId = `CARD_TXN_${Date.now()}`;
                        } else if (selectedPaymentMethod === 'NetBanking') {
                            const bankVal = document.getElementById("bankName").value;
                            if (!bankVal) {
                                alert("⚠️ Payment Required!\n\nPlease select your Bank for NetBanking payment.");
                                return;
                            }
                            transactionId = `NET_BANK_${bankVal}_${Date.now()}`;
                        }
                    }

                    if (paySubmitBtn) {
                        paySubmitBtn.disabled = true;
                        paySubmitBtn.innerHTML = `⏳ Verifying Payment & Booking...`;
                    }

                    try {
                        let token = localStorage.getItem("token");
                        let userObj = null;

                        if (!token) {
                            // Register or login guest user
                            const authRes = await fetch(`${API_BASE_URL}/auth/register`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    name,
                                    email,
                                    phone,
                                    password: 'GuestUser@123',
                                    role: 'user'
                                })
                            });
                            const authData = await authRes.json();

                            if (authData.success && authData.token) {
                                token = authData.token;
                                userObj = authData.user;
                            } else {
                                const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        email,
                                        password: 'GuestUser@123',
                                        role: 'user'
                                    })
                                });
                                const loginData = await loginRes.json();
                                if (loginData.success && loginData.token) {
                                    token = loginData.token;
                                    userObj = loginData.user;
                                }
                            }

                            if (token) {
                                localStorage.setItem("token", token);
                                if (userObj) localStorage.setItem("user", JSON.stringify(userObj));
                            }
                        }

                        if (!token) {
                            alert("Payment process error. Please try again.");
                            if (paySubmitBtn) {
                                paySubmitBtn.disabled = false;
                                paySubmitBtn.innerHTML = currentEvent.price === 0
                                    ? `✓ Register Free Ticket →`
                                    : `🔒 Pay ₹${currentEvent.price} & Book Ticket →`;
                            }
                            return;
                        }

                        // Process Registration with Payment Details
                        const regResponse = await fetch(`${API_BASE_URL}/registrations`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                eventId: currentEvent._id,
                                paymentMethod: currentEvent.price > 0 ? selectedPaymentMethod : 'Free',
                                transactionId,
                                amountPaid: currentEvent.price
                            })
                        });

                        const regData = await regResponse.json();

                        if (regData.success && regData.registration) {
                            window.location.href = `user/ticket.html?id=${regData.registration._id}`;
                        } else if (regData.message && regData.message.toLowerCase().includes('already registered')) {
                            const myRegsRes = await fetch(`${API_BASE_URL}/registrations/my`, {
                                headers: { "Authorization": `Bearer ${token}` }
                            });
                            const myRegsData = await myRegsRes.json();
                            if (myRegsData.success && myRegsData.registrations) {
                                const existingReg = myRegsData.registrations.find(r => {
                                    const evId = r.event._id || r.event;
                                    return String(evId) === String(currentEvent._id);
                                });
                                if (existingReg) {
                                    window.location.href = `user/ticket.html?id=${existingReg._id}`;
                                    return;
                                }
                            }
                            alert("⚠️ " + regData.message);
                        } else {
                            alert("⚠️ " + (regData.message || "Payment verification failed. Ticket not booked."));
                        }
                    } catch (err) {
                        console.error("Payment Submission Error:", err);
                        alert("Payment verification error. Please try again.");
                    } finally {
                        if (paySubmitBtn) {
                            paySubmitBtn.disabled = false;
                            paySubmitBtn.innerHTML = currentEvent.price === 0
                                ? `✓ Register Free Ticket →`
                                : `🔒 Pay ₹${currentEvent.price} & Book Ticket →`;
                        }
                    }
                });
            }

        } else {
            alert("Event not found.");
            window.location.href = "events.html";
        }
    } catch (error) {
        console.error("Error fetching event details:", error);
    }
});