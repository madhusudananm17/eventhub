document.addEventListener("DOMContentLoaded", () => {
    const verifyForm = document.getElementById("verifyForm");
    const manualCodeInput = document.getElementById("manualCode");
    const resultCard = document.getElementById("resultCard");
    const statusBadge = document.getElementById("statusBadge");
    const admitBtn = document.getElementById("admitBtn");

    let currentTicketCode = "";
    let html5QrcodeScanner = null;

    // Check query params if code passed via URL e.g. verify-ticket.html?code=EH-2026-123456
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get("code") || urlParams.get("ticketCode");
    if (codeParam) {
        manualCodeInput.value = codeParam;
        performVerification(codeParam);
    }

    if (verifyForm) {
        verifyForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const code = manualCodeInput.value.trim();
            if (code) {
                performVerification(code);
            }
        });
    }

    // Camera QR Scanner setup
    const startScanBtn = document.getElementById("startScanBtn");
    const stopScanBtn = document.getElementById("stopScanBtn");

    if (startScanBtn && typeof Html5Qrcode !== "undefined") {
        startScanBtn.addEventListener("click", () => {
            html5QrcodeScanner = new Html5Qrcode("reader");
            html5QrcodeScanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText) => {
                    manualCodeInput.value = decodedText;
                    performVerification(decodedText);
                    stopScanner();
                },
                (errorMessage) => {
                    // Ignore scan errors while looking for QR code
                }
            ).then(() => {
                startScanBtn.style.display = "none";
                stopScanBtn.style.display = "inline-block";
            }).catch(err => {
                alert("Camera access unavailable or blocked: " + err.message + ". Please use manual ticket code entry below.");
            });
        });

        if (stopScanBtn) {
            stopScanBtn.addEventListener("click", () => {
                stopScanner();
            });
        }
    }

    function stopScanner() {
        if (html5QrcodeScanner) {
            html5QrcodeScanner.stop().then(() => {
                html5QrcodeScanner.clear();
                if (startScanBtn) startScanBtn.style.display = "inline-block";
                if (stopScanBtn) stopScanBtn.style.display = "none";
            }).catch(err => console.log(err));
        }
    }

    async function performVerification(ticketCode) {
        currentTicketCode = ticketCode;
        resultCard.style.display = "block";
        statusBadge.textContent = "Verifying Ticket...";
        statusBadge.style.background = "rgba(14, 165, 233, 0.2)";
        statusBadge.style.color = "#38bdf8";
        admitBtn.style.display = "none";

        try {
            const res = await fetch(`${API_BASE_URL}/tickets/verify/${encodeURIComponent(ticketCode)}`);
            const data = await res.json();

            if (data.isValid) {
                document.getElementById("resEventTitle").textContent = data.eventName || "-";
                document.getElementById("resEventTime").textContent = `${data.eventDate || ''} ${data.eventTime || ''}`;
                document.getElementById("resVenue").textContent = `${data.venue || ''}, ${data.location || ''}`;
                document.getElementById("resHolderName").textContent = data.ticketHolderName || "-";
                document.getElementById("resTicketCode").textContent = data.ticketCode || ticketCode;
                document.getElementById("resTicketStatus").textContent = data.ticketStatus || "CONFIRMED";

                if (data.isUsed) {
                    statusBadge.textContent = "⚠️ TICKET VALID BUT ALREADY USED";
                    statusBadge.style.background = "rgba(251, 191, 36, 0.2)";
                    statusBadge.style.color = "#fbbf24";
                    admitBtn.style.display = "none";
                } else {
                    statusBadge.textContent = "✅ TICKET VALID & ACTIVE";
                    statusBadge.style.background = "rgba(16, 185, 129, 0.2)";
                    statusBadge.style.color = "#34d399";
                    admitBtn.style.display = "inline-block";
                }
            } else {
                statusBadge.textContent = data.message || "❌ INVALID OR CANCELLED TICKET";
                statusBadge.style.background = "rgba(239, 68, 68, 0.2)";
                statusBadge.style.color = "#fca5a5";

                document.getElementById("resEventTitle").textContent = data.eventName || "Unknown Event";
                document.getElementById("resEventTime").textContent = "-";
                document.getElementById("resVenue").textContent = "-";
                document.getElementById("resHolderName").textContent = data.ticketHolderName || "-";
                document.getElementById("resTicketCode").textContent = ticketCode;
                document.getElementById("resTicketStatus").textContent = data.ticketStatus || "INVALID";
                admitBtn.style.display = "none";
            }
        } catch (err) {
            console.error("Verification error:", err);
            statusBadge.textContent = "❌ Connection Error: Is the backend server running?";
            statusBadge.style.background = "rgba(239, 68, 68, 0.2)";
            statusBadge.style.color = "#fca5a5";
        }
    }

    if (admitBtn) {
        admitBtn.addEventListener("click", async () => {
            if (!currentTicketCode) return;
            try {
                admitBtn.disabled = true;
                admitBtn.textContent = "Admitting...";

                const token = localStorage.getItem("token");
                const res = await fetch(`${API_BASE_URL}/tickets/mark-used`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ ticketId: currentTicketCode })
                });

                const data = await res.json();
                admitBtn.disabled = false;
                admitBtn.textContent = "✅ Admit Attendee (Mark as Used)";

                if (data.success) {
                    alert("✅ Attendee successfully admitted!");
                    performVerification(currentTicketCode);
                } else {
                    alert("⚠️ " + (data.message || "Failed to mark ticket as used."));
                }
            } catch (err) {
                console.error("Admit error:", err);
                admitBtn.disabled = false;
                admitBtn.textContent = "✅ Admit Attendee (Mark as Used)";
                alert("Error connecting to server.");
            }
        });
    }
});
