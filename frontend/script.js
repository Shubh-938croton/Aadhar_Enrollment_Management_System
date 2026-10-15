// ====================================================
// Aadhaar Enrollment Management System - Frontend JavaScript
// Raw Minimalist Implementation (Vanilla JavaScript)
// Educational Demonstration Project
// ====================================================

// Primary backend production domain on Vercel
const DEPLOYED_BACKEND_URL = "https://aadhar-enrollment-management-system-croton2.vercel.app";

// Automatically detects whether running locally, on the same domain, or cross-domain
function getApiBaseUrl() {
  // Allow manual override in browser localStorage (e.g. localStorage.setItem('API_URL', 'https://...'))
  try {
    const customUrl = localStorage.getItem("API_URL");
    if (customUrl) return customUrl.replace(/\/+$/, "");
  } catch (e) {}

  const currentHost = window.location.hostname;
  const currentOrigin = window.location.origin;

  // Local development
  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    // If opened via Node server directly on port 3000
    if (window.location.port === "3000") {
      return "/api";
    }
    // If opened via VS Code Live Server / static file server (port 5500, etc.)
    return "http://localhost:3000/api";
  }

  // If frontend is deployed on the same Vercel project as the backend
  if (currentOrigin.includes("aadhar-enrollment-management-system")) {
    return "/api";
  }

  // If frontend is deployed on a separate URL/domain (e.g. separate Vercel project, GitHub Pages)
  return `${DEPLOYED_BACKEND_URL}/api`;
}

const API_BASE_URL = getApiBaseUrl();

// Cached in-memory lists for fast live search
let allCitizens = [];
let allCenters = [];
let allApplications = [];

// ====================================================
// 1. INITIALIZATION & NAVIGATION ROUTING
// ====================================================
document.addEventListener("DOMContentLoaded", function () {
  setupNavigation();
  setupSubTabs();
  checkBackendHealth();

  // Load initial dropdowns and tables
  loadCitizensDropdown();
  loadCentersDropdown();
  loadApplicationsTable();
  loadCitizensTable();
  loadCentersTable();

  // Restrict DOB input so future dates cannot be selected
  const dobInput = document.getElementById("DOB");
  if (dobInput) {
    const today = new Date().toISOString().split("T")[0];
    dobInput.setAttribute("max", today);
  }
});

// Setup tab navigation between sections
function setupNavigation() {
  const navLinks = document.querySelectorAll(".nav-item");
  const navToggle = document.getElementById("navToggle");
  const navLinksContainer = document.getElementById("navLinks");

  // Mobile menu toggle
  if (navToggle) {
    navToggle.addEventListener("click", function () {
      navLinksContainer.classList.toggle("open");
    });
  }

  // Handle nav clicks
  navLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const targetSectionId = link.getAttribute("data-section");
      switchSection(targetSectionId);

      // Close mobile menu if open
      if (navLinksContainer) {
        navLinksContainer.classList.remove("open");
      }
    });
  });

  // Handle service cards click on Home Dashboard
  const serviceCards = document.querySelectorAll(".service-card");
  serviceCards.forEach(function (card) {
    card.addEventListener("click", function () {
      const targetSectionId = card.getAttribute("data-target");
      if (targetSectionId) {
        switchSection(targetSectionId);
      }
    });
  });

  // Handle in-text links to switch sections
  const switchLinks = document.querySelectorAll(".switch-link");
  switchLinks.forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const targetSectionId = link.getAttribute("data-target");
      if (targetSectionId) {
        switchSection(targetSectionId);
      }
    });
  });
}

// Function to activate a specific section
function switchSection(sectionId) {
  const sections = document.querySelectorAll(".app-section");
  const navLinks = document.querySelectorAll(".nav-item");

  sections.forEach(function (sec) {
    sec.classList.remove("active");
  });

  navLinks.forEach(function (lnk) {
    lnk.classList.remove("active");
  });

  const activeSection = document.getElementById(sectionId);
  if (activeSection) {
    activeSection.classList.add("active");
  }

  const activeLink = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (activeLink) {
    activeLink.classList.add("active");
  }

  // Auto-refresh data depending on section
  if (sectionId === "application-section") {
    loadCitizensDropdown();
    loadCentersDropdown();
  } else if (sectionId === "records-section") {
    loadApplicationsTable();
    loadCitizensTable();
    loadCentersTable();
  }

  // Scroll to top of window smoothly
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Setup sub-tabs inside Database Records Management
function setupSubTabs() {
  const subTabButtons = document.querySelectorAll(".sub-tab-btn");
  const subTabContents = document.querySelectorAll(".sub-tab-content");

  subTabButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      subTabButtons.forEach((b) => b.classList.remove("active"));
      subTabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      const targetTabId = btn.getAttribute("data-tab");
      const targetContent = document.getElementById(targetTabId);
      if (targetContent) {
        targetContent.classList.add("active");
      }
    });
  });
}

// Check backend connectivity status with diagnostic details
function checkBackendHealth() {
  const statusText = document.getElementById("backendStatusText");
  const statusContainer = document.querySelector(".status-indicator");

  if (statusText) statusText.textContent = "Backend: Connecting...";

  // Enable one-click manual backend URL configuration
  if (statusContainer && !statusContainer.dataset.configured) {
    statusContainer.dataset.configured = "true";
    statusContainer.style.cursor = "pointer";
    statusContainer.setAttribute("title", "Click to view or switch Backend API URL");
    statusContainer.addEventListener("click", function () {
      const activeUrl = localStorage.getItem("API_URL") || API_BASE_URL;
      const input = prompt(
        "Current Backend API URL:\n" +
          activeUrl +
          "\n\nEnter a new Backend URL (or leave blank to reset to default):",
        activeUrl
      );
      if (input !== null) {
        if (input.trim() === "") {
          localStorage.removeItem("API_URL");
        } else {
          let clean = input.trim().replace(/\/+$/, "");
          if (!clean.endsWith("/api")) clean += "/api";
          localStorage.setItem("API_URL", clean);
        }
        window.location.reload();
      }
    });
  }

  fetch(`${API_BASE_URL}/health`)
    .then(async function (res) {
      const contentType = res.headers.get("content-type") || "";

      // Check if Vercel Authentication redirect page was returned
      if (contentType.includes("text/html")) {
        const text = await res.text();
        if (text.includes("Login – Vercel") || text.includes("Protected Deployment")) {
          throw new Error("Vercel Deployment Protection (Authentication) is enabled on the backend.");
        }
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data && data.success) {
        if (statusText) {
          statusText.textContent = "Backend: Connected (Online)";
          statusText.title = `Connected to ${API_BASE_URL}`;
        }
      } else {
        throw new Error("Invalid response format");
      }
    })
    .catch(function (error) {
      console.warn("Backend connectivity issue:", error);
      if (statusText) {
        if (error.message && error.message.includes("Vercel Deployment Protection")) {
          statusText.textContent = "Backend: Blocked by Vercel Authentication (Turn off in Settings)";
        } else {
          statusText.textContent = "Backend: Not Connected";
        }
        statusText.title = `Attempted: ${API_BASE_URL}/health\nError: ${error.message || error}\n(Click to change URL)`;
      }
    });
}

// Helper to show inline alerts
function showAlert(elementId, message, type) {
  const alertBox = document.getElementById(elementId);
  if (!alertBox) return;

  alertBox.className = "alert-box";
  alertBox.innerHTML = message;
  alertBox.style.display = "block";

  // Auto-hide alert after 8 seconds for success
  if (type === "success") {
    setTimeout(function () {
      alertBox.style.display = "none";
    }, 8000);
  }
}

// ====================================================
// 2. CITIZEN REGISTRATION (SECTION 2)
// ====================================================
const citizenForm = document.getElementById("registrationform");

if (citizenForm) {
  citizenForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const citizenName = document.getElementById("citizenname").value.trim();
    const dob = document.getElementById("DOB").value;
    const gender = document.getElementById("gender").value;
    const mobile = document.getElementById("mobile").value.trim();
    const submitBtn = document.getElementById("citizenSubmitBtn");

    if (citizenName === "") {
      showAlert("citizenAlert", "Please enter the citizen's full name.", "error");
      return;
    }

    if (!dob) {
      showAlert("citizenAlert", "Please select a valid date of birth.", "error");
      return;
    }
    const selectedDate = new Date(dob);
    const currentDate = new Date();
    if (selectedDate > currentDate) {
      showAlert("citizenAlert", "Date of birth cannot be in the future.", "error");
      return;
    }

    if (gender === "") {
      showAlert("citizenAlert", "Please select a gender.", "error");
      return;
    }

    const mobilePattern = /^[0-9]{10}$/;
    if (!mobilePattern.test(mobile)) {
      showAlert("citizenAlert", "Please enter a valid 10-digit mobile number.", "error");
      return;
    }

    const citizenData = {
      citizen_name: citizenName,
      dob: dob,
      gender: gender,
      mobile_number: mobile,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Registering...";

    fetch(`${API_BASE_URL}/citizens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(citizenData),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register Citizen";

        if (data.success) {
          showAlert(
            "citizenAlert",
            `[Success] Citizen registered successfully. Generated Citizen ID: #${data.citizen_id}`,
            "success"
          );
          citizenForm.reset();
          loadCitizensDropdown();
          loadCitizensTable();
        } else {
          const detail = data.error ? ` Details: ${data.error}` : "";
          showAlert("citizenAlert", `[Error] ${data.message || "Failed to register citizen."}${detail}`, "error");
        }
      })
      .catch(function (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register Citizen";
        console.error("Citizen registration error:", error);
        showAlert("citizenAlert", "[Error] Could not connect to backend server. Make sure server is running.", "error");
      });
  });
}

// ====================================================
// 3. ENROLLMENT CENTER REGISTRATION (SECTION 3)
// ====================================================
const centerForm = document.getElementById("centerregistration");

if (centerForm) {
  centerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const centerName = document.getElementById("centerName").value.trim();
    const district = document.getElementById("district").value.trim();
    const state = document.getElementById("state").value.trim();
    const submitBtn = document.getElementById("centerSubmitBtn");

    if (centerName === "" || district === "" || state === "") {
      showAlert("centerAlert", "Please fill out Center Name, District, and State.", "error");
      return;
    }

    const centerData = {
      center_name: centerName,
      district: district,
      state: state,
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Registering...";

    fetch(`${API_BASE_URL}/centers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(centerData),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register Center";

        if (data.success) {
          showAlert(
            "centerAlert",
            `[Success] Enrollment center registered successfully. Generated Center ID: #${data.center_id}`,
            "success"
          );
          centerForm.reset();
          loadCentersDropdown();
          loadCentersTable();
        } else {
          const detail = data.error ? ` Details: ${data.error}` : "";
          showAlert("centerAlert", `[Error] ${data.message || "Failed to register enrollment center."}${detail}`, "error");
        }
      })
      .catch(function (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Register Center";
        console.error("Center registration error:", error);
        showAlert("centerAlert", "[Error] Could not connect to backend server. Make sure server is running.", "error");
      });
  });
}

// ====================================================
// 4. AADHAAR APPLICATION REGISTRATION (SECTION 4)
// ====================================================
function loadCitizensDropdown() {
  const select = document.getElementById("appCitizenSelect");
  if (!select) return;

  fetch(`${API_BASE_URL}/citizens`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.citizens)) {
        if (data.citizens.length === 0) {
          select.innerHTML = '<option value="">No citizens registered yet. Please register one first.</option>';
          return;
        }

        let options = '<option value="">-- Choose a Registered Citizen --</option>';
        data.citizens.forEach(function (c) {
          options += `<option value="${c.citizen_id}">#${c.citizen_id} - ${c.citizen_name} (Mobile: ${c.mobile_number})</option>`;
        });
        select.innerHTML = options;
      }
    })
    .catch((err) => {
      console.error("Error loading citizens dropdown:", err);
      select.innerHTML = '<option value="">Failed to load citizens from backend</option>';
    });
}

function loadCentersDropdown() {
  const select = document.getElementById("appCenterSelect");
  if (!select) return;

  fetch(`${API_BASE_URL}/centers`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.centers)) {
        if (data.centers.length === 0) {
          select.innerHTML = '<option value="">No centers registered yet. Please add one first.</option>';
          return;
        }

        let options = '<option value="">-- Choose an Enrollment Center --</option>';
        data.centers.forEach(function (ctr) {
          options += `<option value="${ctr.center_id}">#${ctr.center_id} - ${ctr.center_name} (${ctr.district}, ${ctr.state})</option>`;
        });
        select.innerHTML = options;
      }
    })
    .catch((err) => {
      console.error("Error loading centers dropdown:", err);
      select.innerHTML = '<option value="">Failed to load centers from backend</option>';
    });
}

const refreshCitizensDropdownBtn = document.getElementById("refreshCitizensDropdownBtn");
if (refreshCitizensDropdownBtn) {
  refreshCitizensDropdownBtn.addEventListener("click", function () {
    loadCitizensDropdown();
  });
}

const refreshCentersDropdownBtn = document.getElementById("refreshCentersDropdownBtn");
if (refreshCentersDropdownBtn) {
  refreshCentersDropdownBtn.addEventListener("click", function () {
    loadCentersDropdown();
  });
}

const applicationForm = document.getElementById("applicationForm");
if (applicationForm) {
  applicationForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const citizenId = document.getElementById("appCitizenSelect").value;
    const centerId = document.getElementById("appCenterSelect").value;
    const submitBtn = document.getElementById("appSubmitBtn");

    if (!citizenId || !centerId) {
      showAlert("applicationAlert", "Please select both a citizen and an enrollment center.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Creating Application...";

    fetch(`${API_BASE_URL}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citizen_id: citizenId,
        center_id: centerId,
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Application";

        if (data.success) {
          showAlert(
            "applicationAlert",
            `[Success] Application created successfully. Application ID: #${data.application_id} | Status: ${data.status} | Date: ${data.application_date}`,
            "success"
          );
          applicationForm.reset();
          loadApplicationsTable();
        } else {
          const detail = data.error ? ` Details: ${data.error}` : "";
          showAlert("applicationAlert", `[Error] ${data.message || "Failed to create application."}${detail}`, "error");
        }
      })
      .catch(function (error) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Application";
        console.error("Application submission error:", error);
        showAlert("applicationAlert", "[Error] Could not connect to backend server.", "error");
      });
  });
}

// ====================================================
// 5. APPLICATION STATUS TRACKING (SECTION 5)
// ====================================================
const trackForm = document.getElementById("trackForm");
if (trackForm) {
  trackForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const appId = document.getElementById("trackAppId").value.trim();
    const resultCard = document.getElementById("trackResultCard");
    const submitBtn = document.getElementById("trackSubmitBtn");

    if (!appId) {
      showAlert("trackAlert", "Please enter a valid Application ID.", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Tracking...";
    resultCard.classList.add("hidden");

    fetch(`${API_BASE_URL}/applications/${appId}`)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Track Status";

        if (data.success && data.application) {
          const app = data.application;
          document.getElementById("trackAlert").style.display = "none";

          // Populate result card fields
          document.getElementById("resAppId").textContent = `#${app.application_id}`;
          document.getElementById("resCitizenName").textContent = app.citizen_name;
          document.getElementById("resMobile").textContent = `+91 ${app.mobile_number}`;
          document.getElementById("resCenterName").textContent = app.center_name;
          document.getElementById("resLocation").textContent = `${app.district}, ${app.state}`;
          document.getElementById("resAppDate").textContent = app.application_date;

          // Status badge
          const statusBadge = document.getElementById("trackStatusBadge");
          statusBadge.textContent = app.status;
          statusBadge.className = "status-badge";

          resultCard.classList.remove("hidden");
        } else {
          showAlert("trackAlert", `[Error] ${data.message || "Application not found with ID #" + appId}`, "error");
        }
      })
      .catch(function (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Track Status";
        console.error("Tracking error:", err);
        showAlert("trackAlert", "[Error] Could not retrieve application. Make sure the server is online.", "error");
      });
  });
}

// ====================================================
// 6. VIEW & MANAGE APPLICATIONS (SECTION 8)
// ====================================================
function loadApplicationsTable() {
  const tbody = document.getElementById("applicationsTableBody");
  const countBadge = document.getElementById("countApps");

  fetch(`${API_BASE_URL}/applications`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.applications)) {
        allApplications = data.applications;
        if (countBadge) countBadge.textContent = allApplications.length;
        renderApplicationsTable(allApplications);
      }
    })
    .catch((err) => {
      console.error("Error loading applications table:", err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="table-empty">Failed to load applications from database.</td></tr>';
      }
    });
}

function renderApplicationsTable(apps) {
  const tbody = document.getElementById("applicationsTableBody");
  if (!tbody) return;

  if (apps.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="table-empty">No applications registered yet.</td></tr>';
    return;
  }

  let rowsHtml = "";
  apps.forEach(function (app) {
    const isPending = app.status === "Pending";
    const nextStatus = isPending ? "Complete" : "Pending";
    const actionBtnText = isPending ? "Mark Complete" : "Mark Pending";

    rowsHtml += `
      <tr>
        <td><strong>#${app.application_id}</strong></td>
        <td>${escapeHtml(app.citizen_name)}</td>
        <td>+91 ${escapeHtml(app.mobile_number)}</td>
        <td>${escapeHtml(app.center_name)} (${escapeHtml(app.district)})</td>
        <td>${app.application_date}</td>
        <td><span class="status-badge">${app.status}</span></td>
        <td>
          <button class="btn-action" onclick="updateApplicationStatus(${app.application_id}, '${nextStatus}')">
            ${actionBtnText}
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
}

window.updateApplicationStatus = function (appId, newStatus) {
  if (!confirm(`Are you sure you want to mark Application #${appId} as '${newStatus}'?`)) {
    return;
  }

  fetch(`${API_BASE_URL}/applications/${appId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        loadApplicationsTable();
      } else {
        alert("Failed to update status: " + data.message);
      }
    })
    .catch((err) => {
      console.error("Error updating status:", err);
      alert("Error connecting to backend server.");
    });
};

const searchApplicationsInput = document.getElementById("searchApplications");
if (searchApplicationsInput) {
  searchApplicationsInput.addEventListener("input", function (e) {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allApplications.filter(function (app) {
      return (
        app.application_id.toString().includes(query) ||
        app.citizen_name.toLowerCase().includes(query) ||
        app.center_name.toLowerCase().includes(query) ||
        app.district.toLowerCase().includes(query) ||
        app.status.toLowerCase().includes(query)
      );
    });
    renderApplicationsTable(filtered);
  });
}

const refreshApplicationsBtn = document.getElementById("refreshApplicationsBtn");
if (refreshApplicationsBtn) {
  refreshApplicationsBtn.addEventListener("click", loadApplicationsTable);
}

// ====================================================
// 7. VIEW CITIZENS TABLE (SECTION 6)
// ====================================================
function loadCitizensTable() {
  const tbody = document.getElementById("citizensTableBody");
  const countBadge = document.getElementById("countCitizens");

  fetch(`${API_BASE_URL}/citizens`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.citizens)) {
        allCitizens = data.citizens;
        if (countBadge) countBadge.textContent = allCitizens.length;
        renderCitizensTable(allCitizens);
      }
    })
    .catch((err) => {
      console.error("Error loading citizens table:", err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="table-empty">Failed to load citizens from database.</td></tr>';
      }
    });
}

function renderCitizensTable(citizens) {
  const tbody = document.getElementById("citizensTableBody");
  if (!tbody) return;

  if (citizens.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">No citizens recorded in database.</td></tr>';
    return;
  }

  let rowsHtml = "";
  citizens.forEach(function (c) {
    const formattedDob = c.dob ? c.dob.split("T")[0] : "-";
    rowsHtml += `
      <tr>
        <td><strong>#${c.citizen_id}</strong></td>
        <td>${escapeHtml(c.citizen_name)}</td>
        <td>${formattedDob}</td>
        <td>${c.gender}</td>
        <td>+91 ${escapeHtml(c.mobile_number)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
}

const searchCitizensInput = document.getElementById("searchCitizens");
if (searchCitizensInput) {
  searchCitizensInput.addEventListener("input", function (e) {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allCitizens.filter(function (c) {
      return (
        c.citizen_id.toString().includes(query) ||
        c.citizen_name.toLowerCase().includes(query) ||
        c.mobile_number.includes(query) ||
        c.gender.toLowerCase().includes(query)
      );
    });
    renderCitizensTable(filtered);
  });
}

const refreshCitizensBtn = document.getElementById("refreshCitizensBtn");
if (refreshCitizensBtn) {
  refreshCitizensBtn.addEventListener("click", loadCitizensTable);
}

// ====================================================
// 8. VIEW ENROLLMENT CENTERS TABLE (SECTION 7)
// ====================================================
function loadCentersTable() {
  const tbody = document.getElementById("centersTableBody");
  const countBadge = document.getElementById("countCenters");

  fetch(`${API_BASE_URL}/centers`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.centers)) {
        allCenters = data.centers;
        if (countBadge) countBadge.textContent = allCenters.length;
        renderCentersTable(allCenters);
      }
    })
    .catch((err) => {
      console.error("Error loading centers table:", err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="4" class="table-empty">Failed to load centers from database.</td></tr>';
      }
    });
}

function renderCentersTable(centers) {
  const tbody = document.getElementById("centersTableBody");
  if (!tbody) return;

  if (centers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="table-empty">No enrollment centers recorded yet.</td></tr>';
    return;
  }

  let rowsHtml = "";
  centers.forEach(function (ctr) {
    rowsHtml += `
      <tr>
        <td><strong>#${ctr.center_id}</strong></td>
        <td>${escapeHtml(ctr.center_name)}</td>
        <td>${escapeHtml(ctr.district)}</td>
        <td>${escapeHtml(ctr.state)}</td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;
}

const searchCentersInput = document.getElementById("searchCenters");
if (searchCentersInput) {
  searchCentersInput.addEventListener("input", function (e) {
    const query = e.target.value.toLowerCase().trim();
    const filtered = allCenters.filter(function (ctr) {
      return (
        ctr.center_id.toString().includes(query) ||
        ctr.center_name.toLowerCase().includes(query) ||
        ctr.district.toLowerCase().includes(query) ||
        ctr.state.toLowerCase().includes(query)
      );
    });
    renderCentersTable(filtered);
  });
}

const refreshCentersBtn = document.getElementById("refreshCentersBtn");
if (refreshCentersBtn) {
  refreshCentersBtn.addEventListener("click", loadCentersTable);
}

// HTML escape helper
function escapeHtml(text) {
  if (!text) return "";
  return text
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
