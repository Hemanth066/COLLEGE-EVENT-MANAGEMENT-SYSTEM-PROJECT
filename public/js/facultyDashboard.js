// ===============================
// LOAD DATA FROM LOCAL STORAGE
// ===============================

let events = JSON.parse(localStorage.getItem("events")) || [];
let registrations = JSON.parse(localStorage.getItem("registrations")) || [];

// ===============================
// TAB SWITCHING FUNCTION
// ===============================

function showTab(e, tabName) {

    document.querySelectorAll(".tab-content").forEach(tab =>
        tab.classList.remove("active")
    );

    document.querySelectorAll(".menu-item").forEach(item =>
        item.classList.remove("active")
    );

    document.getElementById(tabName).classList.add("active");
    e.currentTarget.classList.add("active");

    if (tabName === "registrations") {
        loadEventDropdown("registrationEventFilter");
        filterRegistrations();
    }

    if (tabName === "attendance") {
        loadEventDropdown("attendanceEventFilter");
        filterAttendance();
    }
}

// ===============================
// LOAD EVENTS INTO DROPDOWN
// ===============================

function loadEventDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = `<option value="">Select Event</option>`;

    events.forEach(event => {
        select.innerHTML += `
            <option value="${event.id}">
                ${event.name}
            </option>
        `;
    });
}

// ===============================
// FILTER REGISTRATIONS
// ===============================

function filterRegistrations() {

    const eventId = document.getElementById("registrationEventFilter").value;
    const tbody = document.getElementById("registrationTableBody");

    if (!eventId) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding:30px;color:#999;">
                    Please select an event
                </td>
            </tr>`;
        return;
    }

    const filtered = registrations.filter(reg => reg.eventId == eventId);

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding:30px;color:#999;">
                    No registrations found
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = "";

    filtered.forEach((reg, index) => {

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${reg.name}</td>
                <td>${reg.email}</td>
                <td>${reg.phone}</td>
                <td>${reg.attended ? "Present" : "Absent"}</td>
                <td>
                    <button class="btn-present" onclick="markAttendance('${reg.id}', true)">
                        ✔ Present
                    </button>
                    <button class="btn-absent" onclick="markAttendance('${reg.id}', false)">
                        ✖ Absent
                    </button>
                </td>
                <td>${reg.score || 0}</td>
            </tr>
        `;
    });
}

// ===============================
// MARK ATTENDANCE
// ===============================

function markAttendance(regId, status) {

    const reg = registrations.find(r => r.id == regId);
    if (!reg) return;

    reg.attended = status;

    localStorage.setItem("registrations", JSON.stringify(registrations));

    filterRegistrations();
    filterAttendance();
}

// ===============================
// FILTER ATTENDANCE TAB
// ===============================

function filterAttendance() {

    const eventId = document.getElementById("attendanceEventFilter").value;
    const tbody = document.getElementById("attendanceTableBody");
    const attendedCount = document.getElementById("attendedCount");

    if (!eventId) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="padding:30px;color:#999;">
                    Please select an event
                </td>
            </tr>`;
        attendedCount.textContent = "Select event";
        return;
    }

    const filtered = registrations.filter(reg =>
        reg.eventId == eventId && reg.attended
    );

    attendedCount.textContent = filtered.length + " Students Present";

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="padding:30px;color:#999;">
                    No attended students
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = "";

    filtered.forEach((reg, index) => {

        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${reg.name}</td>
                <td>${reg.email}</td>
                <td>${reg.phone}</td>
                <td>${reg.score || 0}</td>
                <td>
                    <button class="btn-score"
                        onclick="assignScore('${reg.id}')">
                        🎯 Assign Score
                    </button>
                </td>
            </tr>
        `;
    });
}

// ===============================
// ASSIGN SCORE
// ===============================

function assignScore(regId) {

    const score = prompt("Enter score:");

    if (score === null || score === "") return;

    const reg = registrations.find(r => r.id == regId);
    if (!reg) return;

    reg.score = Number(score);

    localStorage.setItem("registrations", JSON.stringify(registrations));

    filterAttendance();
    filterRegistrations();
}

// ===============================
// INITIAL LOAD
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    loadEventDropdown("registrationEventFilter");
    loadEventDropdown("attendanceEventFilter");
});
