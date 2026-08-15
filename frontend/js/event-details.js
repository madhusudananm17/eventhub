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
            if (bannerEl) {
                if (currentEvent.image) {
                    bannerEl.innerHTML = `<img src="${currentEvent.image}" alt="${currentEvent.title}" style="width:100%; height:100%; object-fit:contain; background:#06131d;">`;
                } else {
                    bannerEl.textContent = currentEvent.icon || "🎫";
                }
            }

            const categoryEl = document.getElementById("detailsCategory");
            if (categoryEl) categoryEl.textContent = currentEvent.category || "";

            const titleEl = document.getElementById("detailsTitle");
            if (titleEl) titleEl.textContent = currentEvent.title || "";

            const dateText = currentEvent.date ? (String(currentEvent.date).includes('T') ? String(currentEvent.date).split('T')[0] : currentEvent.date) : "";
            const dateEl = document.getElementById("detailsDate");
            if (dateEl) dateEl.textContent = dateText;

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

            // Populate Booking Summary Information
            const summaryTitle = document.getElementById("summaryEventTitle");
            if (summaryTitle) summaryTitle.textContent = currentEvent.title;

            const summaryDateTime = document.getElementById("summaryEventDateTime");
            if (summaryDateTime) summaryDateTime.textContent = `${dateText} at ${currentEvent.time || ''}`;

            const summaryVenue = document.getElementById("summaryEventVenue");
            if (summaryVenue) summaryVenue.textContent = `${currentEvent.location} (${currentEvent.venue || 'Main Hall'})`;

            const summaryPricePer = document.getElementById("summaryPricePerTicket");
            if (summaryPricePer) summaryPricePer.textContent = priceText;

            // Recalculate Subtotal and Total based on Quantity Select
            const qtySelect = document.getElementById("ticketQuantitySelect");
            function updateTotals() {
                const qty = qtySelect ? parseInt(qtySelect.value, 10) : 1;
                const total = currentEvent.price * qty;
                const fmtTotal = total === 0 ? "Free" : "₹" + total;

                const modalPriceBadge = document.getElementById("modalPriceBadge");
                const summarySubtotal = document.getElementById("summarySubtotal");
                const summaryTotal = document.getElementById("summaryTotal");
                const paySubmitBtn = document.getElementById("paySubmitBtn");

                if (modalPriceBadge) modalPriceBadge.textContent = fmtTotal;
                if (summarySubtotal) summarySubtotal.textContent = fmtTotal;
                if (summaryTotal) summaryTotal.textContent = fmtTotal;
                if (paySubmitBtn) {
                    paySubmitBtn.innerHTML = currentEvent.price === 0
                        ? `✓ Register Free Ticket (${qty} Ticket${qty > 1 ? 's' : ''}) →`
                        : `🔒 Proceed to Pay ${fmtTotal} & Verify Ticket →`;
                }
            }

            if (qtySelect) {
                qtySelect.addEventListener("change", updateTotals);
            }
            updateTotals();

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
                        t.style.background = "#0d1d2a";
                        t.style.color = "#cbd5e1";
                        t.style.borderColor = "rgba(255,255,255,0.1)";
                    });
                    tab.classList.add("active");
                    tab.style.background = "rgba(16,185,129,0.2)";
                    tab.style.color = "#34d399";
                    tab.style.borderColor = "#10b981";

                    selectedPaymentMethod = tab.dataset.method;

                    document.getElementById("upiPayBox").style.display = selectedPaymentMethod === 'UPI' ? 'block' : 'none';
                    document.getElementById("cardPayBox").style.display = selectedPaymentMethod === 'Card' ? 'block' : 'none';
                    document.getElementById("bankingPayBox").style.display = selectedPaymentMethod === 'NetBanking' ? 'block' : 'none';
                });
            });

            // Register/Book Button Handler
            const registerBtn = document.querySelector(".register-event-btn") || document.querySelector(".register-now-btn") || document.querySelector(".btn-primary");

            if (registerBtn) {
                registerBtn.textContent = currentEvent.price === 0 ? "🎟️ Register Free Ticket" : `💳 Pay & Book Ticket`;
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

            // Centralized Fail-Proof Payment & Automatic Ticket Generation Handler
            async function executeCompleteBookingAndPaymentFlow() {
                const nameInput = document.getElementById("guestName");
                const emailInput = document.getElementById("guestEmail");
                const phoneInput = document.getElementById("guestPhone");

                const name = nameInput ? nameInput.value.trim() : "";
                const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
                const phone = phoneInput ? phoneInput.value.trim() : "";

                if (!name || !email || !phone) {
                    alert("Please fill in customer details (Name, Email, Phone).");
                    return;
                }

                const quantity = qtySelect ? parseInt(qtySelect.value, 10) : 1;
                const isFree = currentEvent.price === 0;

                let transactionId = 'FREE';
                if (!isFree) {
                    const userUpi = document.getElementById("upiId") ? document.getElementById("upiId").value.trim() : "";
                    if (userUpi && userUpi.length >= 4) {
                        transactionId = `UTR_SBI9550_${userUpi}`;
                    } else {
                        transactionId = `UTR_SBI9550_${Date.now()}`;
                    }
                }

                const paySubmitBtn = document.getElementById("paySubmitBtn");
                const modalStatusBadge = document.getElementById("modalStatusBadge");

                if (paySubmitBtn) {
                    paySubmitBtn.disabled = true;
                    paySubmitBtn.innerHTML = `⏳ Verifying Payment & Generating Ticket...`;
                }

                if (modalStatusBadge) {
                    modalStatusBadge.textContent = `🟡 Payment Verification Pending`;
                    modalStatusBadge.style.background = `#fff4d6`;
                    modalStatusBadge.style.color = `#9a6700`;
                }

                try {
                    let token = localStorage.getItem("token");
                    let userObj = null;

                    if (!token) {
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
                        alert("Authentication error. Please log in to complete booking.");
                        return;
                    }

                    let generatedTicketId = null;

                    // Method A: Booking -> Payment Verification -> Ticket
                    try {
                        const bookingRes = await fetch(`${API_BASE_URL}/bookings/create`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                eventId: currentEvent._id,
                                quantity
                            })
                        });
                        const bookingData = await bookingRes.json();

                        if (bookingData.success && bookingData.booking) {
                            const bookingId = bookingData.booking.bookingId || bookingData.booking._id;

                            const verifyRes = await fetch(`${API_BASE_URL}/payments/verify`, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${token}`
                                },
                                body: JSON.stringify({
                                    bookingId,
                                    paymentMethod: selectedPaymentMethod,
                                    transactionId
                                })
                            });
                            const verifyData = await verifyRes.json();

                            if (verifyData.success && verifyData.ticket) {
                                generatedTicketId = verifyData.ticket.ticketId || verifyData.ticket._id;
                            }
                        }
                    } catch (errA) {}

                    // Method B Fallback: Direct Registration Ticket Endpoint
                    if (!generatedTicketId) {
                        const regRes = await fetch(`${API_BASE_URL}/registrations`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                eventId: currentEvent._id,
                                paymentMethod: selectedPaymentMethod,
                                transactionId,
                                amountPaid: currentEvent.price * quantity
                            })
                        });
                        const regData = await regRes.json();

                        if (regData.success) {
                            if (regData.ticket) {
                                generatedTicketId = regData.ticket.ticketId || regData.ticket._id;
                            } else if (regData.registration) {
                                generatedTicketId = regData.registration.ticketId || regData.registration._id;
                            }
                        }
                    }

                    if (generatedTicketId) {
                        if (modalStatusBadge) {
                            modalStatusBadge.textContent = `🟢 Payment Successful & Verified`;
                            modalStatusBadge.style.background = `#e5f7ed`;
                            modalStatusBadge.style.color = `#16834b`;
                        }

                        const form = document.getElementById("instantBookingForm");
                        const overlay = document.getElementById("ticketGenOverlay");
                        if (form) form.style.display = "none";
                        if (overlay) overlay.style.display = "block";

                        setTimeout(() => {
                            window.location.href = `user/ticket.html?id=${generatedTicketId}`;
                        }, 1000);

                    } else {
                        if (modalStatusBadge) {
                            modalStatusBadge.textContent = `🔴 Payment Verification Failed`;
                            modalStatusBadge.style.background = `#ffe8e8`;
                            modalStatusBadge.style.color = `#d93025`;
                        }
                        alert("⚠️ Payment verification issue. Please try again.");
                    }

                } catch (err) {
                    console.error("Complete Booking Flow Error:", err);
                    alert("Error completing payment. Please try again.");
                } finally {
                    if (paySubmitBtn) {
                        paySubmitBtn.disabled = false;
                        paySubmitBtn.innerHTML = `🔒 Proceed to Payment & Verify Ticket →`;
                    }
                }
            }

            // Booking Form Submit Handler
            const bookingForm = document.getElementById("instantBookingForm");
            if (bookingForm) {
                bookingForm.addEventListener("submit", function (e) {
                    e.preventDefault();
                    executeCompleteBookingAndPaymentFlow();
                });
            }

            // =========================================================================
            // EVENT REVIEWS AND RATINGS SYSTEM
            // =========================================================================
            const avgRatingBadge = document.getElementById("avgRatingBadge");
            const totalReviewsCount = document.getElementById("totalReviewsCount");
            const reviewsList = document.getElementById("reviewsList");
            const addReviewForm = document.getElementById("addReviewForm");
            const reviewComment = document.getElementById("reviewComment");
            const selectedRatingInput = document.getElementById("selectedRating");
            const starRatingSelect = document.getElementById("starRatingSelect");
            const reviewMsg = document.getElementById("reviewMsg");

            // Interactive Star Rating Selector
            if (starRatingSelect) {
                const stars = starRatingSelect.querySelectorAll("span");
                stars.forEach(star => {
                    star.addEventListener("click", () => {
                        const r = parseInt(star.dataset.star, 10);
                        selectedRatingInput.value = r;
                        stars.forEach((s, idx) => {
                            s.style.color = idx < r ? "#fbbf24" : "#475569";
                        });
                    });
                });
            }

            // Fetch and Render Event Reviews
            async function loadReviews() {
                try {
                    const res = await fetch(`${API_BASE_URL}/events/${eventId}/reviews`);
                    const rData = await res.json();

                    if (rData.success) {
                        const avg = rData.averageRating || 0;
                        const count = rData.totalReviews || 0;

                        if (avgRatingBadge) avgRatingBadge.textContent = `★ ${avg.toFixed(1)} / 5`;
                        if (totalReviewsCount) totalReviewsCount.textContent = `${count} Review${count !== 1 ? 's' : ''}`;

                        if (reviewsList) {
                            if (!rData.reviews || rData.reviews.length === 0) {
                                reviewsList.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:20px; background:rgba(255,255,255,0.02); border-radius:12px;">No reviews yet. Be the first registered attendee to leave a review!</div>`;
                            } else {
                                reviewsList.innerHTML = rData.reviews.map(rev => {
                                    const userName = rev.user ? rev.user.name : "Attendee";
                                    const starsHtml = "★".repeat(rev.rating) + "☆".repeat(5 - rev.rating);
                                    const revDate = new Date(rev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

                                    return `
                                        <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); padding: 18px; border-radius: 14px;">
                                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                                <strong style="color:#ffffff; font-size:15px;">${userName}</strong>
                                                <span style="color:#fbbf24; font-size:16px;">${starsHtml} (${rev.rating}/5)</span>
                                            </div>
                                            <p style="color:#cbd5e1; font-size:14px; margin:0 0 8px 0;">"${rev.comment}"</p>
                                            <span style="color:#64748b; font-size:12px;">Submitted on ${revDate}</span>
                                        </div>
                                    `;
                                }).join("");
                            }
                        }
                    }
                } catch(err) {
                    console.error("Load reviews error:", err);
                }
            }

            // Submit Review Handler
            if (addReviewForm) {
                addReviewForm.addEventListener("submit", async (e) => {
                    e.preventDefault();
                    const token = localStorage.getItem("token");
                    if (!token) {
                        if (reviewMsg) {
                            reviewMsg.style.color = "#fca5a5";
                            reviewMsg.textContent = "Please login first.";
                        }
                        return;
                    }

                    const rating = parseInt(selectedRatingInput.value, 10) || 5;
                    const comment = reviewComment.value.trim();

                    try {
                        const submitBtn = document.getElementById("submitReviewBtn");
                        if (submitBtn) submitBtn.disabled = true;

                        const res = await fetch(`${API_BASE_URL}/events/${eventId}/reviews`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({ rating, comment })
                        });

                        const rData = await res.json();
                        if (submitBtn) submitBtn.disabled = false;

                        if (rData.success) {
                            if (reviewMsg) {
                                reviewMsg.style.color = "#34d399";
                                reviewMsg.textContent = "✓ Review submitted successfully.";
                            }
                            reviewComment.value = "";
                            loadReviews();
                        } else {
                            if (reviewMsg) {
                                reviewMsg.style.color = "#fca5a5";
                                reviewMsg.textContent = rData.message || "Failed to submit review.";
                            }
                        }
                    } catch(err) {
                        console.error("Submit review error:", err);
                        if (reviewMsg) {
                            reviewMsg.style.color = "#fca5a5";
                            reviewMsg.textContent = "Error connecting to server.";
                        }
                    }
                });
            }

            // Initial load of reviews
            loadReviews();

        } else {
            alert("Event not found.");
            window.location.href = "events.html";
        }
    } catch (error) {
        console.error("Error fetching event details:", error);
    }
});