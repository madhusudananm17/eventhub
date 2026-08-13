document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");
    const userJson = localStorage.getItem("user");
    const user = userJson ? JSON.parse(userJson) : null;

    // Route Protection Helper
    function checkAuth(requiredRole = null) {
        if (!token || !user) {
            alert("Please login to access your dashboard.");
            window.location.href = "../login.html";
            return false;
        }

        if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
            alert(`Unauthorized access. Required role: ${requiredRole}`);
            window.location.href = "../login.html";
            return false;
        }
        return true;
    }

    const currentPath = window.location.pathname;

    // ==========================================
    // USER PORTAL
    // ==========================================
    if (currentPath.includes("/user/")) {
        if (!checkAuth("user")) return;

        // User Dashboard
        if (currentPath.includes("dashboard.html")) {
            loadUserDashboard();
        }
        // My Events
        else if (currentPath.includes("my-events.html")) {
            loadUserMyEvents();
        }
        // User Profile
        else if (currentPath.includes("profile.html")) {
            loadUserProfile();
        }
        // Ticket View
        else if (currentPath.includes("ticket.html")) {
            loadUserTicket();
        }
    }

    // ==========================================
    // ORGANIZER PORTAL
    // ==========================================
    else if (currentPath.includes("/organizer/")) {
        if (!checkAuth("organizer")) return;

        // Organizer Dashboard
        if (currentPath.includes("dashboard.html")) {
            loadOrganizerDashboard();
        }
        // Create Event Form
        else if (currentPath.includes("create-event.html")) {
            initCreateEventForm();
        }
        // Manage Events List
        else if (currentPath.includes("manage-events.html")) {
            loadOrganizerManageEvents();
        }
        // View Attendees
        else if (currentPath.includes("attendees.html")) {
            loadOrganizerAttendees();
        }
    }

    // ==========================================
    // ADMIN PORTAL
    // ==========================================
    else if (currentPath.includes("/admin/")) {
        if (!checkAuth("admin")) return;

        // Admin Dashboard
        if (currentPath.includes("dashboard.html")) {
            loadAdminDashboard();
        }
        // Manage Users
        else if (currentPath.includes("users.html")) {
            loadAdminUsers();
        }
        // Manage Organizers
        else if (currentPath.includes("organizers.html")) {
            loadAdminOrganizers();
        }
        // Manage Events
        else if (currentPath.includes("events.html")) {
            loadAdminEvents();
        }
        // Manage Registrations
        else if (currentPath.includes("registrations.html")) {
            loadAdminRegistrations();
        }
    }

    // =========================================================================
    // USER FUNCTIONS
    // =========================================================================
    async function loadUserDashboard() {
        // Welcome text
        const welcomeH1 = document.querySelector(".welcome-box h1");
        if (welcomeH1 && user) {
            welcomeH1.textContent = `Welcome back, ${user.name}! 👋`;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/registrations/my`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();

            if (data.success) {
                const regs = data.registrations || [];
                const activeRegs = regs.filter(r => r.status === 'registered');

                // Update Stats Cards
                const statH2s = document.querySelectorAll(".stat-card h2");
                if (statH2s.length >= 4) {
                    statH2s[0].textContent = regs.length;       // Total Registered Events
                    statH2s[1].textContent = activeRegs.length; // Upcoming Events
                    statH2s[2].textContent = activeRegs.length; // Active Tickets
                    statH2s[3].textContent = regs.length - activeRegs.length; // Completed/Cancelled
                }

                // Render Upcoming Registered Events list
                const dashboardGridCard = document.querySelector(".dashboard-grid .dashboard-card");
                if (dashboardGridCard) {
                    let html = `<h2>Upcoming Registered Events</h2>`;

                    if (activeRegs.length === 0) {
                        html += `<p style="color: #667085; padding: 15px 0;">No active event registrations found. <a href="../events.html" style="color: #635bff; font-weight: 600;">Browse Events →</a></p>`;
                    } else {
                        activeRegs.forEach(reg => {
                            const ev = reg.event;
                            if (ev) {
                                html += `
                                    <div class="event-item">
                                        <div class="event-icon">${ev.icon || '🎫'}</div>
                                        <div class="event-info">
                                            <h3>${ev.title}</h3>
                                            <p>📅 ${ev.date}</p>
                                            <p>📍 ${ev.location}</p>
                                        </div>
                                        <span class="event-status">Confirmed</span>
                                    </div>
                                `;
                            }
                        });
                    }
                    dashboardGridCard.innerHTML = html;
                }
            }
        } catch (err) {
            console.error("User Dashboard Load Error:", err);
        }
    }

    async function loadUserMyEvents() {
        const containerCard = document.querySelector(".events-card") || document.querySelector(".my-events-container") || document.querySelector(".dashboard-card");

        try {
            const res = await fetch(`${API_BASE_URL}/registrations/my`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();

            if (data.success && containerCard) {
                const regs = data.registrations || [];

                let html = `<h2 style="margin-bottom: 20px;">My Registered Events</h2>`;

                if (regs.length === 0) {
                    html += `<p style="color: #667085;">You haven't registered for any events yet. <a href="../events.html" style="color:#635bff;">Explore events</a></p>`;
                } else {
                    regs.forEach(reg => {
                        const ev = reg.event || {};
                        const isCancelled = reg.status === 'cancelled';
                        const statusBadge = isCancelled
                            ? `<span style="background:#fee2e2; color:#dc2626; padding:4px 10px; border-radius:20px; font-weight:700; font-size:12px;">Cancelled</span>`
                            : `<span style="background:#e5f7ed; color:#16834b; padding:4px 10px; border-radius:20px; font-weight:700; font-size:12px;">Confirmed</span>`;

                        const actionBtn = isCancelled ? '' : `
                            <button onclick="cancelRegistration('${reg._id}')" style="background:#fee2e2; color:#dc2626; border:none; padding:8px 16px; border-radius:6px; cursor:pointer; font-weight:600;">
                                Cancel Registration
                            </button>
                        `;

                        html += `
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:18px; border:1px solid #eee; border-radius:12px; margin-bottom:15px; background:white;">
                                <div style="display:flex; align-items:center; gap:15px;">
                                    <div style="font-size:32px;">${ev.icon || '🎫'}</div>
                                    <div>
                                        <h3 style="font-size:18px; margin-bottom:5px;">${ev.title || 'Event'}</h3>
                                        <p style="color:#667085; font-size:13px;">📅 ${ev.date || ''} | ⏰ ${ev.time || ''} | 📍 ${ev.location || ''}</p>
                                        <p style="color:#667085; font-size:13px; margin-top:3px;">Organizer: ${ev.organizer?.name || 'EventHub'}</p>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:15px;">
                                    ${statusBadge}
                                    <a href="ticket.html?id=${reg._id}" style="background:#635bff; color:white; padding:8px 16px; border-radius:6px; text-decoration:none; font-weight:600; font-size:13px;">View Ticket</a>
                                    ${actionBtn}
                                </div>
                            </div>
                        `;
                    });
                }
                containerCard.innerHTML = html;
            }
        } catch (err) {
            console.error("My Events Load Error:", err);
        }
    }

    // Global helper for cancel registration
    window.cancelRegistration = async function (regId) {
        if (!confirm("Are you sure you want to cancel your registration for this event?")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/registrations/${regId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                alert("Registration cancelled successfully.");
                window.location.reload();
            } else {
                alert(data.message || "Failed to cancel registration.");
            }
        } catch (err) {
            console.error("Cancel Registration Error:", err);
        }
    };

    function loadUserProfile() {
        if (!user) return;
        const nameInput = document.getElementById("profileName") || document.getElementById("name");
        const emailInput = document.getElementById("profileEmail") || document.getElementById("email");
        const phoneInput = document.getElementById("profilePhone") || document.getElementById("phone");
        const roleInput = document.getElementById("profileRole") || document.getElementById("role");

        if (nameInput) nameInput.value = user.name || "";
        if (emailInput) emailInput.value = user.email || "";
        if (phoneInput) phoneInput.value = user.phone || "";
        if (roleInput) roleInput.value = user.role || "";
    }

    async function loadUserTicket() {
        const params = new URLSearchParams(window.location.search);
        const queryId = params.get("id");

        try {
            let ev = {}, u = {}, targetTicket = null, targetBooking = null, targetPayment = null;

            // Step 1: Try fetching directly from Ticket endpoint
            if (queryId) {
                try {
                    const ticketRes = await fetch(`${API_BASE_URL}/tickets/${queryId}`, {
                        headers: getAuthHeaders()
                    });
                    const ticketData = await ticketRes.json();
                    if (ticketData.success && ticketData.ticket) {
                        targetTicket = ticketData.ticket;
                        targetBooking = ticketData.booking;
                        targetPayment = ticketData.payment;
                        ev = targetTicket.event || {};
                        u = targetTicket.user || {};
                    }
                } catch(e) {}
            }

            // Step 2: Fallback to /registrations/my if not found in Ticket endpoint
            if (!targetTicket) {
                const regRes = await fetch(`${API_BASE_URL}/registrations/my`, {
                    headers: getAuthHeaders()
                });
                const regData = await regRes.json();

                if (regData.success && regData.registrations && regData.registrations.length > 0) {
                    let targetReg = queryId 
                        ? regData.registrations.find(r => 
                            String(r._id) === String(queryId) || 
                            r.ticketId === queryId || 
                            r.orderId === queryId || 
                            r.transactionId === queryId
                          )
                        : regData.registrations[0];

                    if (!targetReg) targetReg = regData.registrations[0];

                    ev = targetReg.event || {};
                    u = targetReg.user || user || {};

                    const shortId = targetReg._id ? targetReg._id.substring(Math.max(0, targetReg._id.length - 6)).toUpperCase() : '001';

                    targetTicket = {
                        _id: targetReg._id,
                        ticketId: targetReg.ticketId || `TKT-2026-${shortId}`,
                        bookingId: targetReg.orderId || `BKG-2026-${shortId}`,
                        quantity: targetReg.quantity || 1,
                        ticketStatus: targetReg.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
                        generatedAt: targetReg.ticketGeneratedTime || targetReg.registrationDate
                    };

                    targetBooking = {
                        bookingId: targetReg.orderId || `BKG-2026-${shortId}`,
                        totalAmount: targetReg.amountPaid !== undefined ? targetReg.amountPaid : ev.price,
                        bookingStatus: targetReg.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'
                    };

                    targetPayment = {
                        paymentId: targetReg.transactionId || `PAY-2026-${shortId}`,
                        paymentStatus: targetReg.paymentStatus === 'free' ? 'FREE' : 'PAID',
                        paymentMethod: targetReg.paymentMethod || 'UPI/QR',
                        transactionId: targetReg.transactionId || 'FREE',
                        paidAt: targetReg.paymentTime || targetReg.registrationDate
                    };
                }
            }

            if (!targetTicket) {
                console.warn("No ticket data found.");
                return;
            }

            // Update Header & Icons
            const ticketTitle = document.getElementById("ticketTitle") || document.querySelector(".ticket-event h2");
            if (ticketTitle) {
                ticketTitle.textContent = ev.title || "Event Ticket";
                ticketTitle.style.color = "#111";
            }

            const ticketCategory = document.getElementById("ticketCategory") || document.querySelector(".ticket-event p");
            if (ticketCategory) {
                ticketCategory.textContent = `${ev.category || 'Official Event'} Pass`;
                ticketCategory.style.color = "#635bff";
            }

            const ticketIcon = document.getElementById("ticketEventIcon") || document.querySelector(".ticket-event-icon");
            if (ticketIcon) ticketIcon.textContent = ev.icon || "🎫";

            // Helper Date Formatter
            function formatTimestamp(dt) {
                if (!dt) return new Date().toLocaleString();
                const d = new Date(dt);
                if (isNaN(d.getTime())) return String(dt);
                return d.toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            }

            const quantity = targetTicket.quantity || 1;
            const payTimeFormatted = formatTimestamp(targetPayment ? targetPayment.paidAt : targetTicket.generatedAt);
            const genTimeFormatted = formatTimestamp(targetTicket.generatedAt);

            // Populate Grid Elements
            const elEvDate = document.getElementById("tktEventDate");
            if (elEvDate) elEvDate.textContent = ev.date ? (String(ev.date).includes('T') ? String(ev.date).split('T')[0] : ev.date) : '-';

            const elEvTime = document.getElementById("tktEventTime");
            if (elEvTime) elEvTime.textContent = ev.time || '-';

            const elEvVenue = document.getElementById("tktEventVenue");
            if (elEvVenue) elEvVenue.textContent = `${ev.location || ''} (${ev.venue || 'Main Venue'})`;

            const elQty = document.getElementById("tktQuantity");
            if (elQty) elQty.textContent = `${quantity} Ticket${quantity > 1 ? 's' : ''}`;

            const elAmt = document.getElementById("tktAmount");
            const amountVal = targetBooking ? targetBooking.totalAmount : (ev.price * quantity);
            if (elAmt) elAmt.textContent = (amountVal === 0 || ev.price === 0) ? "Free" : "₹" + amountVal;

            const elTkt = document.getElementById("tktTicketId");
            if (elTkt) elTkt.textContent = targetTicket.ticketId || '-';

            const elOrd = document.getElementById("tktOrderId");
            if (elOrd) elOrd.textContent = targetTicket.bookingId || (targetBooking ? targetBooking.bookingId : '-');

            const elPayId = document.getElementById("tktPaymentId");
            if (elPayId) elPayId.textContent = targetPayment ? (targetPayment.paymentId || targetPayment.transactionId) : 'PAY-FREE';

            const elPayTime = document.getElementById("tktPayTime");
            if (elPayTime) elPayTime.textContent = payTimeFormatted;

            const elGenTime = document.getElementById("tktGenTime");
            if (elGenTime) elGenTime.textContent = genTimeFormatted;

            const elCustName = document.getElementById("tktCustomerName");
            if (elCustName) {
                elCustName.textContent = u.name || (user ? user.name : 'Attendee');
                elCustName.style.color = "#111";
            }

            const elCustEmail = document.getElementById("tktCustomerEmail");
            if (elCustEmail) {
                elCustEmail.textContent = u.email || (user ? user.email : '-');
                elCustEmail.style.color = "#111";
            }

            const elCustPhone = document.getElementById("tktCustomerPhone");
            if (elCustPhone) {
                elCustPhone.textContent = u.phone || (user ? user.phone : '-');
                elCustPhone.style.color = "#111";
            }

            const elPayStatus = document.getElementById("tktPaymentStatus");
            if (elPayStatus) {
                elPayStatus.textContent = (targetPayment && targetPayment.paymentStatus) ? targetPayment.paymentStatus : 'PAID (Verified)';
                elPayStatus.style.color = "#16834b";
            }

            const elBookStatus = document.getElementById("tktBookingStatus");
            if (elBookStatus) {
                elBookStatus.textContent = targetTicket.ticketStatus || 'CONFIRMED';
                elBookStatus.style.color = "#16834b";
            }

            // Status Badge
            const statusBadge = document.getElementById("tktStatusBadge") || document.querySelector(".confirmed");
            const isCancelled = targetTicket.ticketStatus === 'CANCELLED';

            if (statusBadge) {
                if (isCancelled) {
                    statusBadge.textContent = "✖ Cancelled";
                    statusBadge.style.background = "#fee2e2";
                    statusBadge.style.color = "#dc2626";
                } else {
                    statusBadge.textContent = `✓ Confirmed & Verified (Paid)`;
                    statusBadge.style.background = "#e5f7ed";
                    statusBadge.style.color = "#16834b";
                }
            }

            // QR Code Generation ("TICKET_ID + BOOKING_ID")
            const qrImg = document.getElementById("ticketQrImage");
            const downloadQrBtn = document.getElementById("downloadQrBtn");
            const qrContent = `${targetTicket.ticketId}+${targetTicket.bookingId}`;
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrContent)}`;

            if (qrImg) qrImg.src = qrUrl;
            if (downloadQrBtn) downloadQrBtn.href = qrUrl;

        } catch (err) {
            console.error("Ticket Load Error:", err);
        }
    }

    // =========================================================================
    // ORGANIZER FUNCTIONS
    // =========================================================================
    async function loadOrganizerDashboard() {
        const welcomeH1 = document.querySelector(".welcome-box h1");
        if (welcomeH1 && user) {
            welcomeH1.textContent = `Welcome back, ${user.name}! 👨‍💼`;
        }

        try {
            const eventsRes = await fetch(`${API_BASE_URL}/organizer/events`, {
                headers: getAuthHeaders()
            });
            const eventsData = await eventsRes.json();

            if (eventsData.success) {
                const events = eventsData.events || [];

                // Count total attendees across events
                let totalCapacity = 0;
                let totalSeatsBooked = 0;
                events.forEach(e => {
                    totalCapacity += e.capacity || 0;
                    totalSeatsBooked += (e.capacity - e.availableSeats) || 0;
                });

                const statH2s = document.querySelectorAll(".stat-card h2");
                if (statH2s.length >= 3) {
                    statH2s[0].textContent = events.length;       // Created Events
                    statH2s[1].textContent = totalSeatsBooked;    // Total Attendees
                    statH2s[2].textContent = totalCapacity;       // Total Capacity
                }
            }
        } catch (err) {
            console.error("Organizer Dashboard Load Error:", err);
        }
    }

    function initCreateEventForm() {
        const form = document.getElementById("createEventForm");
        const successMessage = document.getElementById("successMessage");

        if (form) {
            form.addEventListener("submit", async function (e) {
                e.preventDefault();

                const title = document.getElementById("eventTitle").value.trim();
                const category = document.getElementById("category").value;
                const capacity = document.getElementById("capacity").value;
                const date = document.getElementById("eventDate").value;
                const time = document.getElementById("eventTime").value;
                const location = document.getElementById("location").value;
                const venue = document.getElementById("venue").value.trim();
                const price = document.getElementById("price").value;
                const description = document.getElementById("description").value.trim();

                try {
                    const res = await fetch(`${API_BASE_URL}/events`, {
                        method: "POST",
                        headers: getAuthHeaders(),
                        body: JSON.stringify({
                            title,
                            category,
                            capacity,
                            date,
                            time,
                            location,
                            venue,
                            price,
                            description
                        })
                    });

                    const data = await res.json();

                    if (data.success) {
                        if (successMessage) {
                            successMessage.innerHTML = `✓ Event created successfully! <a href="manage-events.html" style="color: #635bff; font-weight: bold; margin-left: 10px;">Go to Manage Events →</a>`;
                            successMessage.style.display = "block";
                        } else {
                            alert("✓ Event created successfully!");
                        }
                        form.reset();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        setTimeout(() => {
                            window.location.href = "manage-events.html";
                        }, 1500);
                    } else {
                        alert(data.message || "Failed to create event.");
                    }
                } catch (err) {
                    console.error("Create Event Error:", err);
                    alert("Error connecting to server.");
                }
            });
        }
    }

    async function loadOrganizerManageEvents() {
        const eventsContainer = document.querySelector(".manage-events-container") || document.querySelector(".events-card") || document.querySelector(".dashboard-card");

        try {
            const res = await fetch(`${API_BASE_URL}/organizer/events`, {
                headers: getAuthHeaders()
            });
            const data = await res.json();

            if (data.success && eventsContainer) {
                const events = data.events || [];

                let html = `<h2 style="margin-bottom:20px;">Manage My Events</h2>`;

                if (events.length === 0) {
                    html += `<p style="color:#667085;">You haven't created any events yet. <a href="create-event.html" style="color:#635bff;">Create Event →</a></p>`;
                } else {
                    events.forEach(ev => {
                        const booked = ev.capacity - ev.availableSeats;
                        html += `
                            <div style="display:flex; align-items:center; justify-content:space-between; padding:18px; border:1px solid #eee; border-radius:12px; margin-bottom:15px; background:white;">
                                <div style="display:flex; align-items:center; gap:15px;">
                                    <div style="font-size:32px;">${ev.icon || '🎫'}</div>
                                    <div>
                                        <h3 style="font-size:18px; margin-bottom:5px;">${ev.title}</h3>
                                        <p style="color:#667085; font-size:13px;">📅 ${ev.date} | ⏰ ${ev.time} | 📍 ${ev.location} (${ev.venue})</p>
                                        <p style="color:#635bff; font-size:13px; font-weight:600; margin-top:4px;">👥 ${booked} / ${ev.capacity} Attendees</p>
                                    </div>
                                </div>
                                <div style="display:flex; align-items:center; gap:12px;">
                                    <a href="attendees.html?eventId=${ev._id}" style="background:#e8e7ff; color:#635bff; padding:8px 14px; border-radius:6px; text-decoration:none; font-weight:600; font-size:13px;">Attendees</a>
                                    <button onclick="deleteOrganizerEvent('${ev._id}')" style="background:#fee2e2; color:#dc2626; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:600; font-size:13px;">Delete</button>
                                </div>
                            </div>
                        `;
                    });
                }
                eventsContainer.innerHTML = html;
            }
        } catch (err) {
            console.error("Organizer Manage Events Error:", err);
        }
    }

    window.deleteOrganizerEvent = async function (eventId) {
        if (!confirm("Are you sure you want to delete this event? This will also remove registered attendees.")) return;

        try {
            const res = await fetch(`${API_BASE_URL}/events/${eventId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                alert("Event deleted successfully.");
                window.location.reload();
            } else {
                alert(data.message || "Failed to delete event.");
            }
        } catch (err) {
            console.error("Delete Event Error:", err);
        }
    };

    async function loadOrganizerAttendees() {
        const params = new URLSearchParams(window.location.search);
        const eventId = params.get("eventId");

        const attendeesContainer = document.querySelector(".attendees-container") || document.querySelector(".dashboard-card");

        try {
            // First fetch organizer events to build dropdown if available
            const eventsRes = await fetch(`${API_BASE_URL}/organizer/events`, {
                headers: getAuthHeaders()
            });
            const eventsData = await eventsRes.json();
            const events = eventsData.events || [];

            let selectedId = eventId || (events.length > 0 ? events[0]._id : null);

            if (!selectedId) {
                if (attendeesContainer) {
                    attendeesContainer.innerHTML = `<h2>Event Attendees</h2><p style="color:#667085;">No events created yet.</p>`;
                }
                return;
            }

            const regRes = await fetch(`${API_BASE_URL}/registrations/event/${selectedId}`, {
                headers: getAuthHeaders()
            });
            const regData = await regRes.json();
            const regs = regData.registrations || [];

            if (attendeesContainer) {
                let options = events.map(e => `<option value="${e._id}" ${e._id === selectedId ? 'selected' : ''}>${e.title}</option>`).join('');

                let html = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h2>Event Attendees (${regs.length})</h2>
                        <select onchange="window.location.href='attendees.html?eventId='+this.value" style="padding:8px 14px; border:1px solid #ddd; border-radius:8px;">
                            ${options}
                        </select>
                    </div>
                `;

                if (regs.length === 0) {
                    html += `<p style="color:#667085;">No attendees registered for this event yet.</p>`;
                } else {
                    html += `
                        <table style="width:100%; border-collapse:collapse; background:white; border-radius:8px; overflow:hidden;">
                            <thead>
                                <tr style="background:#f8f9fc; text-align:left; border-bottom:1px solid #eee;">
                                    <th style="padding:12px;">Name</th>
                                    <th style="padding:12px;">Email</th>
                                    <th style="padding:12px;">Phone</th>
                                    <th style="padding:12px;">Date</th>
                                    <th style="padding:12px;">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    regs.forEach(r => {
                        const u = r.user || {};
                        html += `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:12px; font-weight:600;">${u.name || 'N/A'}</td>
                                <td style="padding:12px;">${u.email || 'N/A'}</td>
                                <td style="padding:12px;">${u.phone || 'N/A'}</td>
                                <td style="padding:12px;">${new Date(r.registrationDate).toLocaleDateString()}</td>
                                <td style="padding:12px;"><span style="color:${r.status === 'registered' ? '#16834b' : '#dc2626'}; font-weight:600;">${r.status}</span></td>
                            </tr>
                        `;
                    });

                    html += `</tbody></table>`;
                }
                attendeesContainer.innerHTML = html;
            }
        } catch (err) {
            console.error("Attendees Load Error:", err);
        }
    }

    // =========================================================================
    // ADMIN FUNCTIONS
    // =========================================================================
    async function loadAdminDashboard() {
        const welcomeH1 = document.querySelector(".welcome-box h1");
        if (welcomeH1 && user) {
            welcomeH1.textContent = `Welcome back, Admin (${user.name})! 🛡️`;
        }

        try {
            const [usersRes, orgsRes, eventsRes, regsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/organizers`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/admin/events`, { headers: getAuthHeaders() }),
                fetch(`${API_BASE_URL}/admin/registrations`, { headers: getAuthHeaders() })
            ]);

            const usersData = await usersRes.json();
            const orgsData = await orgsRes.json();
            const eventsData = await eventsRes.json();
            const regsData = await regsRes.json();

            const statH2s = document.querySelectorAll(".stat-card h2");
            if (statH2s.length >= 4) {
                statH2s[0].textContent = usersData.count || 0;
                statH2s[1].textContent = orgsData.count || 0;
                statH2s[2].textContent = eventsData.count || 0;
                statH2s[3].textContent = regsData.count || 0;
            }
        } catch (err) {
            console.error("Admin Dashboard Error:", err);
        }
    }

    async function loadAdminUsers() {
        const container = document.querySelector(".users-container") || document.querySelector(".dashboard-card");

        try {
            const res = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });
            const data = await res.json();

            if (data.success && container) {
                const usersList = data.users || [];

                let html = `<h2 style="margin-bottom:20px;">Manage Users (${usersList.length})</h2>`;

                if (usersList.length === 0) {
                    html += `<p style="color:#667085;">No users found.</p>`;
                } else {
                    html += `
                        <table style="width:100%; border-collapse:collapse; background:white;">
                            <thead>
                                <tr style="background:#f8f9fc; text-align:left; border-bottom:1px solid #eee;">
                                    <th style="padding:12px;">Name</th>
                                    <th style="padding:12px;">Email</th>
                                    <th style="padding:12px;">Phone</th>
                                    <th style="padding:12px;">Joined Date</th>
                                    <th style="padding:12px;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    usersList.forEach(u => {
                        html += `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:12px; font-weight:600;">${u.name}</td>
                                <td style="padding:12px;">${u.email}</td>
                                <td style="padding:12px;">${u.phone}</td>
                                <td style="padding:12px;">${new Date(u.createdAt).toLocaleDateString()}</td>
                                <td style="padding:12px;">
                                    <button onclick="deleteAdminUser('${u._id}')" style="background:#fee2e2; color:#dc2626; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px;">Delete</button>
                                </td>
                            </tr>
                        `;
                    });

                    html += `</tbody></table>`;
                }
                container.innerHTML = html;
            }
        } catch (err) {
            console.error("Admin Users Error:", err);
        }
    }

    window.deleteAdminUser = async function (userId) {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/users/${userId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                alert("User deleted successfully.");
                window.location.reload();
            } else {
                alert(data.message || "Failed to delete user.");
            }
        } catch (err) {
            console.error("Delete User Error:", err);
        }
    };

    async function loadAdminOrganizers() {
        const container = document.querySelector(".organizers-container") || document.querySelector(".dashboard-card");

        try {
            const res = await fetch(`${API_BASE_URL}/organizers`, { headers: getAuthHeaders() });
            const data = await res.json();

            if (data.success && container) {
                const orgs = data.organizers || [];

                let html = `<h2 style="margin-bottom:20px;">Manage Organizers (${orgs.length})</h2>`;

                if (orgs.length === 0) {
                    html += `<p style="color:#667085;">No organizers found.</p>`;
                } else {
                    html += `
                        <table style="width:100%; border-collapse:collapse; background:white;">
                            <thead>
                                <tr style="background:#f8f9fc; text-align:left; border-bottom:1px solid #eee;">
                                    <th style="padding:12px;">Name</th>
                                    <th style="padding:12px;">Email</th>
                                    <th style="padding:12px;">Phone</th>
                                    <th style="padding:12px;">Joined Date</th>
                                    <th style="padding:12px;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    orgs.forEach(o => {
                        html += `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:12px; font-weight:600;">${o.name}</td>
                                <td style="padding:12px;">${o.email}</td>
                                <td style="padding:12px;">${o.phone}</td>
                                <td style="padding:12px;">${new Date(o.createdAt).toLocaleDateString()}</td>
                                <td style="padding:12px;">
                                    <button onclick="deleteAdminOrganizer('${o._id}')" style="background:#fee2e2; color:#dc2626; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px;">Delete</button>
                                </td>
                            </tr>
                        `;
                    });

                    html += `</tbody></table>`;
                }
                container.innerHTML = html;
            }
        } catch (err) {
            console.error("Admin Organizers Error:", err);
        }
    }

    window.deleteAdminOrganizer = async function (orgId) {
        if (!confirm("Are you sure you want to delete this organizer and all their events?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/organizers/${orgId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
            const data = await res.json();
            if (data.success) {
                alert("Organizer deleted successfully.");
                window.location.reload();
            } else {
                alert(data.message || "Failed to delete organizer.");
            }
        } catch (err) {
            console.error("Delete Organizer Error:", err);
        }
    };

    async function loadAdminEvents() {
        const container = document.querySelector(".events-container") || document.querySelector(".dashboard-card");

        try {
            const res = await fetch(`${API_BASE_URL}/admin/events`, { headers: getAuthHeaders() });
            const data = await res.json();

            if (data.success && container) {
                const events = data.events || [];

                let html = `<h2 style="margin-bottom:20px;">Manage All Events (${events.length})</h2>`;

                if (events.length === 0) {
                    html += `<p style="color:#667085;">No events found.</p>`;
                } else {
                    html += `
                        <table style="width:100%; border-collapse:collapse; background:white;">
                            <thead>
                                <tr style="background:#f8f9fc; text-align:left; border-bottom:1px solid #eee;">
                                    <th style="padding:12px;">Title</th>
                                    <th style="padding:12px;">Organizer</th>
                                    <th style="padding:12px;">Category</th>
                                    <th style="padding:12px;">Date</th>
                                    <th style="padding:12px;">Seats</th>
                                    <th style="padding:12px;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    events.forEach(e => {
                        html += `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:12px; font-weight:600;">${e.icon || '🎫'} ${e.title}</td>
                                <td style="padding:12px;">${e.organizer?.name || 'N/A'}</td>
                                <td style="padding:12px;">${e.category}</td>
                                <td style="padding:12px;">${e.date}</td>
                                <td style="padding:12px;">${e.availableSeats}/${e.capacity}</td>
                                <td style="padding:12px;">
                                    <button onclick="deleteOrganizerEvent('${e._id}')" style="background:#fee2e2; color:#dc2626; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px;">Delete</button>
                                </td>
                            </tr>
                        `;
                    });

                    html += `</tbody></table>`;
                }
                container.innerHTML = html;
            }
        } catch (err) {
            console.error("Admin Events Error:", err);
        }
    }

    async function loadAdminRegistrations() {
        const container = document.querySelector(".registrations-container") || document.querySelector(".dashboard-card");

        try {
            const res = await fetch(`${API_BASE_URL}/admin/registrations`, { headers: getAuthHeaders() });
            const data = await res.json();

            if (data.success && container) {
                const regs = data.registrations || [];

                let html = `<h2 style="margin-bottom:20px;">All System Registrations (${regs.length})</h2>`;

                if (regs.length === 0) {
                    html += `<p style="color:#667085;">No registrations found.</p>`;
                } else {
                    html += `
                        <table style="width:100%; border-collapse:collapse; background:white;">
                            <thead>
                                <tr style="background:#f8f9fc; text-align:left; border-bottom:1px solid #eee;">
                                    <th style="padding:12px;">User</th>
                                    <th style="padding:12px;">Event</th>
                                    <th style="padding:12px;">Date</th>
                                    <th style="padding:12px;">Status</th>
                                    <th style="padding:12px;">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                    `;

                    regs.forEach(r => {
                        const u = r.user || {};
                        const ev = r.event || {};
                        html += `
                            <tr style="border-bottom:1px solid #eee;">
                                <td style="padding:12px; font-weight:600;">${u.name || 'N/A'} (${u.email || ''})</td>
                                <td style="padding:12px;">${ev.title || 'N/A'}</td>
                                <td style="padding:12px;">${new Date(r.registrationDate).toLocaleDateString()}</td>
                                <td style="padding:12px;"><span style="color:${r.status === 'registered' ? '#16834b' : '#dc2626'}; font-weight:600;">${r.status}</span></td>
                                <td style="padding:12px;">
                                    ${r.status === 'registered' ? `<button onclick="cancelRegistration('${r._id}')" style="background:#fee2e2; color:#dc2626; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-weight:600; font-size:12px;">Cancel</button>` : '—'}
                                </td>
                            </tr>
                        `;
                    });

                    html += `</tbody></table>`;
                }
                container.innerHTML = html;
            }
        } catch (err) {
            console.error("Admin Registrations Error:", err);
        }
    }
});
