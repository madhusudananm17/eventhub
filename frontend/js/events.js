document.addEventListener("DOMContentLoaded", function () {
    let events = [];

    const eventsGrid = document.getElementById("eventsGrid");
    const eventCount = document.getElementById("eventCount");
    const noResults = document.getElementById("noResults");

    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");

    const categoryFilter = document.getElementById("categoryFilter");
    const locationFilter = document.getElementById("locationFilter");
    const priceFilter = document.getElementById("priceFilter");
    const sortFilter = document.getElementById("sortFilter");

    // Get search query from URL parameter if available
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get("search");
    if (initialSearch && searchInput) {
        searchInput.value = initialSearch;
    }

    async function fetchEvents() {
        try {
            if (eventsGrid) {
                eventsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #667085;">Loading events...</div>`;
            }

            const response = await fetch(`${API_BASE_URL}/events`);
            const data = await response.json();

            if (data.success && Array.isArray(data.events)) {
                events = data.events;
                filterEvents();
            } else {
                if (noResults) noResults.style.display = "block";
                if (eventCount) eventCount.textContent = "0 Events";
            }
        } catch (error) {
            console.error("Error fetching events:", error);
            if (eventsGrid) {
                eventsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: red;">Failed to load events. Is the backend running?</div>`;
            }
        }
    }

    function displayEvents(eventList) {
        if (!eventsGrid) return;
        eventsGrid.innerHTML = "";

        if (eventList.length === 0) {
            if (eventCount) eventCount.textContent = "0 Events";
            if (noResults) noResults.style.display = "block";
            return;
        }

        if (noResults) noResults.style.display = "none";
        if (eventCount) eventCount.textContent = eventList.length + " Events";

        eventList.forEach(function (event) {
            const priceText = event.price === 0 ? "Free" : "₹" + event.price;
            const categoryClass = (event.category || "").toLowerCase();
            const formattedDate = event.date ? (String(event.date).includes('T') ? String(event.date).split('T')[0] : event.date) : '';

            const card = document.createElement("div");
            card.className = "event-card";

            const imageMedia = event.image
                ? `<img src="${event.image}" alt="${event.title}" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:0;">`
                : `<span class="card-icon" style="position:relative; z-index:1;">${event.icon || '🎫'}</span>`;

            card.innerHTML = `
                <div class="event-card-image ${categoryClass}" style="position:relative; overflow:hidden;">
                    <span class="card-category" style="position:absolute; top:14px; left:14px; z-index:2;">
                        ${event.category || 'General'}
                    </span>
                    ${imageMedia}
                </div>

                <div class="card-content">
                    <h3>
                        ${event.title}
                    </h3>
                    <p class="card-detail">
                        📅 ${formattedDate}
                    </p>
                    <p class="card-detail">
                        ⏰ ${event.time}
                    </p>
                    <p class="card-detail">
                        📍 ${event.location} ${event.venue ? `(${event.venue})` : ''}
                    </p>
                    <p class="card-detail" style="color: #635bff; font-size: 13px; font-weight: 600;">
                        🎟️ ${event.availableSeats} / ${event.capacity} seats left
                    </p>

                    <div class="card-bottom">
                        <span class="card-price">
                            ${priceText}
                        </span>
                        <a
                            href="event-details.html?id=${event._id || event.id}"
                            class="details-btn"
                        >
                            View Details →
                        </a>
                    </div>
                </div>
            `;

            eventsGrid.appendChild(card);
        });
    }

    function filterEvents() {
        const searchText = searchInput ? searchInput.value.trim().toLowerCase() : "";
        const selectedCategory = categoryFilter ? categoryFilter.value : "all";
        const selectedLocation = locationFilter ? locationFilter.value : "all";
        const selectedPrice = priceFilter ? priceFilter.value : "all";

        let filteredEvents = events.filter(function (event) {
            const title = (event.title || "").toLowerCase();
            const category = (event.category || "").toLowerCase();
            const location = (event.location || "").toLowerCase();

            const searchMatch = searchText === "" ||
                title.includes(searchText) ||
                category.includes(searchText) ||
                location.includes(searchText);

            const categoryMatch = selectedCategory === "all" ||
                event.category === selectedCategory;

            const locationMatch = selectedLocation === "all" ||
                event.location === selectedLocation;

            let priceMatch = true;
            if (selectedPrice === "free") {
                priceMatch = event.price === 0;
            } else if (selectedPrice === "under500") {
                priceMatch = event.price > 0 && event.price < 500;
            } else if (selectedPrice === "above500") {
                priceMatch = event.price > 500;
            }

            return searchMatch && categoryMatch && locationMatch && priceMatch;
        });

        if (sortFilter) {
            if (sortFilter.value === "low") {
                filteredEvents.sort((a, b) => a.price - b.price);
            } else if (sortFilter.value === "high") {
                filteredEvents.sort((a, b) => b.price - a.price);
            }
        }

        displayEvents(filteredEvents);
    }

    if (searchInput) searchInput.addEventListener("input", filterEvents);
    if (searchBtn) searchBtn.addEventListener("click", filterEvents);
    if (categoryFilter) categoryFilter.addEventListener("change", filterEvents);
    if (locationFilter) locationFilter.addEventListener("change", filterEvents);
    if (priceFilter) priceFilter.addEventListener("change", filterEvents);
    if (sortFilter) sortFilter.addEventListener("change", filterEvents);

    // Initial fetch
    fetchEvents();
});