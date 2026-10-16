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

  // Load and setup Academic Credits (Teacher & Student details)
  loadAcademicCredits();
  setupAcademicCreditsModal();

  // Setup Aadhaar Identity Card Generator
  setupCardGenerator();

  // Setup Demographic Updation Portal
  setupUpdatePortal();

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
  } else if (sectionId === "update-section") {
    loadCitizensDropdown();
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
const centerForm = document.getElementById("centerform") || document.getElementById("centerregistration");

if (centerForm) {
  centerForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const nameInput = document.getElementById("centername") || document.getElementById("centerName");
    const centerName = nameInput ? nameInput.value.trim() : "";
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
  const cardSelect = document.getElementById("cardCitizenSelect");
  const updateSelect = document.getElementById("updateCitizenSelect");
  if (!select && !cardSelect && !updateSelect) return;

  fetch(`${API_BASE_URL}/citizens`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.citizens)) {
        allCitizens = data.citizens;

        // Also update card section citizen dropdown
        if (typeof loadCardCitizensDropdown === "function") {
          loadCardCitizensDropdown(allCitizens);
        }

        // Also update demographic updation section dropdown
        if (typeof loadUpdateCitizensDropdown === "function") {
          loadUpdateCitizensDropdown(allCitizens);
        }

        if (!select) return;
        if (allCitizens.length === 0) {
          select.innerHTML = '<option value="">No citizens registered yet. Please register one first.</option>';
          return;
        }

        let options = '<option value="">-- Choose a Registered Citizen --</option>';
        allCitizens.forEach(function (c) {
          options += `<option value="${c.citizen_id}">#${c.citizen_id} - ${c.citizen_name} (Mobile: ${c.mobile_number})</option>`;
        });
        select.innerHTML = options;
      }
    })
    .catch((err) => {
      console.error("Error loading citizens dropdown:", err);
      if (select) select.innerHTML = '<option value="">Failed to load citizens from backend</option>';
      if (cardSelect) cardSelect.innerHTML = '<option value="">Failed to load citizens</option>';
      if (updateSelect) updateSelect.innerHTML = '<option value="">Failed to load citizens</option>';
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
          const resAppId = document.getElementById("resAppId");
          if (resAppId) resAppId.textContent = `#${app.application_id}`;
          const resAppIdNum = document.getElementById("resAppIdNum");
          if (resAppIdNum) resAppIdNum.textContent = app.application_id;

          document.getElementById("resCitizenName").textContent = app.citizen_name;
          document.getElementById("resMobile").textContent = `+91 ${app.mobile_number}`;
          document.getElementById("resCenterName").textContent = app.center_name;
          document.getElementById("resLocation").textContent = `${app.district}, ${app.state}`;
          document.getElementById("resAppDate").textContent = app.application_date;

          const resStatusText = document.getElementById("resStatusText");
          if (resStatusText) resStatusText.textContent = app.status;

          // Status badge
          const statusBadge = document.getElementById("trackStatusBadge");
          if (statusBadge) {
            statusBadge.textContent = app.status;
            statusBadge.className = `status-badge ${app.status}`;
          }

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

        // Keep card generator dropdown in sync
        if (typeof loadCardCitizensDropdown === "function") {
          loadCardCitizensDropdown(allCitizens);
        }
      }
    })
    .catch((err) => {
      console.error("Error loading citizens table:", err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="table-empty">Failed to load citizens from database.</td></tr>';
      }
    });
}

function renderCitizensTable(citizens) {
  const tbody = document.getElementById("citizensTableBody");
  if (!tbody) return;

  if (citizens.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="table-empty">No citizens recorded in database.</td></tr>';
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
        <td>
          <button class="action-btn-sm" style="margin-right: 4px;" onclick="openUpdateCitizen(${c.citizen_id})" title="Update demographic details">
            ✏️ Edit
          </button>
          <button class="action-btn-sm" onclick="viewCitizenCard(${c.citizen_id})" title="View and download Aadhaar Identity Card">
            🪪 ID Card
          </button>
        </td>
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

// ====================================================
// 9. ACADEMIC CREDITS & SUBMISSION DETAILS (5 MEMBERS)
// ====================================================
const DEFAULT_CREDITS = {
  teacherName: "Prof. Faculty Guide",
  teacherDept: "Department of Computer Science & Engineering",
  members: [
    { name: "Student 1 Name", scholar: "2211XXXX1" },
    { name: "Student 2 Name", scholar: "2211XXXX2" },
    { name: "Student 3 Name", scholar: "2211XXXX3" },
    { name: "Student 4 Name", scholar: "2211XXXX4" },
    { name: "Student 5 Name", scholar: "2211XXXX5" }
  ]
};

function getAcademicCredits() {
  try {
    const saved = localStorage.getItem("DBMS_ACADEMIC_CREDITS");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate from old format (member1, member2) if needed
      if (!Array.isArray(parsed.members)) {
        parsed.members = [
          { name: parsed.member1 || "Student 1 Name", scholar: parsed.scholar1 || "2211XXXX1" },
          { name: parsed.member2 || "Student 2 Name", scholar: parsed.scholar2 || "2211XXXX2" },
          { name: parsed.member3 || "Student 3 Name", scholar: parsed.scholar3 || "2211XXXX3" },
          { name: parsed.member4 || "Student 4 Name", scholar: parsed.scholar4 || "2211XXXX4" },
          { name: parsed.member5 || "Student 5 Name", scholar: parsed.scholar5 || "2211XXXX5" }
        ];
      }
      // Ensure there are always 5 members in the list
      while (parsed.members.length < 5) {
        const idx = parsed.members.length + 1;
        parsed.members.push({ name: `Student ${idx} Name`, scholar: `2211XXXX${idx}` });
      }
      return { ...DEFAULT_CREDITS, ...parsed };
    }
  } catch (e) {
    console.warn("Could not read academic credits from localStorage:", e);
  }
  return { ...DEFAULT_CREDITS };
}

function saveAcademicCredits(credits) {
  try {
    localStorage.setItem("DBMS_ACADEMIC_CREDITS", JSON.stringify(credits));
  } catch (e) {
    console.warn("Could not save academic credits to localStorage:", e);
  }
  renderAcademicCredits(credits);
}

function loadAcademicCredits() {
  renderAcademicCredits(getAcademicCredits());
}

function renderAcademicCredits(credits) {
  // Top header badge
  const headerTeacher = document.getElementById("headerTeacherName");
  if (headerTeacher) headerTeacher.textContent = credits.teacherName;

  // Highlighted faculty card on home page bottom
  const dispTeacher = document.getElementById("displayTeacherName");
  if (dispTeacher) dispTeacher.textContent = credits.teacherName;
  const dispDept = document.getElementById("displayTeacherDept");
  if (dispDept) dispDept.textContent = credits.teacherDept;

  // Active member count badge
  const activeMembers = credits.members.filter((m) => m && m.name && m.name.trim() !== "");
  const teamCountBadge = document.getElementById("teamCountBadge");
  if (teamCountBadge) teamCountBadge.textContent = `${activeMembers.length || 5} Team Members`;

  // Render 5 student items in Home bottom spotlight grid
  const homeGrid = document.getElementById("homeStudentsGrid");
  if (homeGrid) {
    let html = "";
    credits.members.forEach((m, idx) => {
      const name = m && m.name ? m.name.trim() : "";
      if (!name && idx >= 2) return; // Skip if optional slot is empty
      const scholar = m && m.scholar ? m.scholar.trim() : "";
      const scholarText = scholar ? (scholar.startsWith("Scholar No") ? scholar : `Scholar No: ${scholar}`) : `Scholar No: 2211XXXX${idx + 1}`;
      html += `
        <div class="student-card-item">
          <div class="student-badge-avatar">S${idx + 1}</div>
          <div class="student-info-col">
            <strong class="student-name-text" title="${escapeHtml(name || `Student ${idx + 1}`)}">${escapeHtml(name || `Student ${idx + 1}`)}</strong>
            <span class="student-scholar-pill">${escapeHtml(scholarText)}</span>
          </div>
        </div>
      `;
    });
    homeGrid.innerHTML = html;
  }

  // Section 8 (About / Project Credits)
  const aboutTeacher = document.getElementById("aboutTeacherName");
  if (aboutTeacher) aboutTeacher.textContent = credits.teacherName;
  const aboutDept = document.getElementById("aboutTeacherDept");
  if (aboutDept) aboutDept.textContent = credits.teacherDept;

  const aboutTeam = document.getElementById("aboutTeamContainer");
  if (aboutTeam) {
    let html = "";
    credits.members.forEach((m, idx) => {
      const name = m && m.name ? m.name.trim() : "";
      if (!name && idx >= 2) return;
      const scholar = m && m.scholar ? m.scholar.trim() : "";
      const scholarText = scholar ? (scholar.startsWith("Scholar No") ? scholar : `Scholar No: ${scholar}`) : `Scholar No: 2211XXXX${idx + 1}`;
      html += `
        <div class="member-chip">
          <div class="member-avatar">S${idx + 1}</div>
          <div class="member-info">
            <strong>${escapeHtml(name || `Student ${idx + 1}`)}</strong>
            <span class="scholar-tag">${escapeHtml(scholarText)}</span>
          </div>
        </div>
      `;
    });
    aboutTeam.innerHTML = html;
  }

  // Footer
  const footerTeacher = document.getElementById("footerTeacherName");
  if (footerTeacher) footerTeacher.textContent = credits.teacherName;
  const footerTeam = document.getElementById("footerTeamNames");
  if (footerTeam) {
    const validNames = credits.members.filter((m) => m && m.name && m.name.trim() !== "").map((m) => m.name.trim());
    footerTeam.textContent = validNames.length > 0 ? validNames.join(", ") : "5 Student Team Members";
  }
}

function setupAcademicCreditsModal() {
  const modal = document.getElementById("creditsModal");
  const form = document.getElementById("creditsForm");
  const openBtn1 = document.getElementById("openEditCreditsBtn");
  const openBtn2 = document.getElementById("openEditCreditsBtn2");
  const closeBtn = document.getElementById("closeCreditsModalBtn");
  const cancelBtn = document.getElementById("cancelCreditsModalBtn");

  function openModal() {
    const current = getAcademicCredits();
    const inTeacher = document.getElementById("inputTeacherName");
    const inDept = document.getElementById("inputTeacherDept");

    if (inTeacher) inTeacher.value = current.teacherName;
    if (inDept) inDept.value = current.teacherDept;

    for (let i = 1; i <= 5; i++) {
      const inM = document.getElementById(`inputMember${i}`);
      const inS = document.getElementById(`inputScholar${i}`);
      const member = current.members[i - 1] || { name: "", scholar: "" };

      if (inM) inM.value = member.name || "";
      if (inS) inS.value = (member.scholar || "").replace(/^Scholar No:\s*/i, "");
    }

    if (modal) modal.classList.remove("hidden");
  }

  function closeModal() {
    if (modal) modal.classList.add("hidden");
  }

  if (openBtn1) openBtn1.addEventListener("click", openModal);
  if (openBtn2) openBtn2.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const inTeacher = document.getElementById("inputTeacherName").value.trim();
      const inDept = document.getElementById("inputTeacherDept").value.trim();

      const newMembers = [];
      for (let i = 1; i <= 5; i++) {
        const inM = document.getElementById(`inputMember${i}`);
        const inS = document.getElementById(`inputScholar${i}`);
        const nameVal = inM ? inM.value.trim() : "";
        const scholarVal = inS ? inS.value.trim() : "";

        newMembers.push({
          name: nameVal,
          scholar: scholarVal ? (scholarVal.startsWith("Scholar No") ? scholarVal : `Scholar No: ${scholarVal}`) : ""
        });
      }

      const newCredits = {
        teacherName: inTeacher || DEFAULT_CREDITS.teacherName,
        teacherDept: inDept || DEFAULT_CREDITS.teacherDept,
        members: newMembers
      };

      saveAcademicCredits(newCredits);
      closeModal();
    });
  }
}

// ====================================================
// 10. AADHAAR IDENTITY CARD GENERATOR & DOWNLOADER
// ====================================================
let currentCardCitizen = null;

// Deterministic 12-digit pseudo Aadhaar number generator based on Citizen ID & Mobile
function generateAadhaarNumber(citizenId, mobile) {
  const seed = (parseInt(citizenId) || 1) * 31;
  const mob = (mobile || "9876543210").replace(/\D/g, "");
  const p1 = String((seed * 73 + 1234) % 9000 + 1000);
  const p2 = String((parseInt(mob.slice(0, 4)) || 5432) % 9000 + 1000);
  const p3 = String(citizenId).padStart(4, "0");
  return `${p1} ${p2} ${p3}`;
}

function formatAadhaarDate(dobString) {
  if (!dobString) return "01/01/2000";
  const dateOnly = dobString.split("T")[0];
  const parts = dateOnly.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  }
  return dateOnly;
}

function updateAadhaarCardUI(citizen, centerName) {
  currentCardCitizen = citizen;
  const nameEl = document.getElementById("cardCitizenName");
  const dobEl = document.getElementById("cardDOB");
  const genderEl = document.getElementById("cardGender");
  const mobileEl = document.getElementById("cardMobile");
  const centerEl = document.getElementById("cardCenter");
  const numberStrip = document.getElementById("cardAadhaarNumber");

  const aadhaarNumber = generateAadhaarNumber(citizen.citizen_id, citizen.mobile_number);
  const parts = aadhaarNumber.split(" ");

  if (nameEl) nameEl.textContent = citizen.citizen_name;
  if (dobEl) dobEl.textContent = formatAadhaarDate(citizen.dob);
  if (genderEl) genderEl.textContent = citizen.gender;
  if (mobileEl) mobileEl.textContent = `XXXXXX${(citizen.mobile_number || "0000").slice(-4)}`;
  if (centerEl) centerEl.textContent = centerName || "Central UIDAI Kendra, District";

  if (numberStrip) {
    numberStrip.innerHTML = `
      <span>${parts[0]}</span>
      <span>${parts[1]}</span>
      <span id="cardLastDigits">${parts[2]}</span>
    `;
  }
}

function loadCardCitizensDropdown(citizens) {
  const select = document.getElementById("cardCitizenSelect");
  if (!select) return;

  const currentVal = select.value;
  let options = '<option value="">-- Choose a Citizen to Generate Card --</option>';
  citizens.forEach((c) => {
    options += `<option value="${c.citizen_id}">#${c.citizen_id} - ${c.citizen_name} (Mobile: ${c.mobile_number})</option>`;
  });
  select.innerHTML = options;
  if (currentVal) select.value = currentVal;
}

function displayCitizenCard(citizenId) {
  if (!citizenId) return;

  const citizen = allCitizens.find((c) => String(c.citizen_id) === String(citizenId));
  if (!citizen) {
    showAlert("cardAlert", `Citizen #${citizenId} not found in current records.`, "error");
    return;
  }

  // Find center if citizen has an application
  const app = allApplications.find((a) => String(a.citizen_id) === String(citizenId));
  const centerName = app ? `${app.center_name} (${app.district})` : "Central UIDAI Kendra";

  updateAadhaarCardUI(citizen, centerName);
  showAlert("cardAlert", `[Loaded] Aadhaar Card generated for <strong>${escapeHtml(citizen.citizen_name)}</strong> (#${citizen.citizen_id}). Ready for download or printing.`, "success");
}

window.viewCitizenCard = function (citizenId) {
  switchSection("card-section");
  const select = document.getElementById("cardCitizenSelect");
  if (select) select.value = citizenId;
  displayCitizenCard(citizenId);
};

function setupCardGenerator() {
  const citizenSelect = document.getElementById("cardCitizenSelect");
  if (citizenSelect) {
    citizenSelect.addEventListener("change", function () {
      displayCitizenCard(this.value);
    });
  }

  const loadByAppBtn = document.getElementById("loadCardByAppBtn");
  const appIdInput = document.getElementById("cardAppIdInput");
  if (loadByAppBtn && appIdInput) {
    loadByAppBtn.addEventListener("click", function () {
      const appId = appIdInput.value.trim();
      if (!appId) {
        showAlert("cardAlert", "Please enter an Application ID.", "error");
        return;
      }
      fetch(`${API_BASE_URL}/applications/${appId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.application) {
            const app = data.application;
            const pseudoCitizen = {
              citizen_id: app.citizen_id,
              citizen_name: app.citizen_name,
              dob: app.dob || "2000-01-01",
              gender: app.gender || "Citizen",
              mobile_number: app.mobile_number
            };
            const centerInfo = `${app.center_name} (${app.district})`;
            updateAadhaarCardUI(pseudoCitizen, centerInfo);
            showAlert("cardAlert", `[Found] Generated ID Card from Application #${appId} for <strong>${escapeHtml(app.citizen_name)}</strong>.`, "success");
          } else {
            showAlert("cardAlert", `Application #${appId} not found in database.`, "error");
          }
        })
        .catch((err) => {
          console.error(err);
          showAlert("cardAlert", "Failed to retrieve application from server.", "error");
        });
    });
  }

  // Track page "View & Download Identity Card" button
  const trackCardBtn = document.getElementById("generateCardFromTrackBtn");
  if (trackCardBtn) {
    trackCardBtn.addEventListener("click", function () {
      const name = document.getElementById("resCitizenName").textContent;
      const mobileRaw = document.getElementById("resMobile").textContent.replace(/\D/g, "");
      const center = document.getElementById("resCenterName").textContent;
      const location = document.getElementById("resLocation").textContent;

      const matched = allCitizens.find((c) => c.citizen_name === name || c.mobile_number.slice(-4) === mobileRaw.slice(-4));
      switchSection("card-section");

      if (matched) {
        const select = document.getElementById("cardCitizenSelect");
        if (select) select.value = matched.citizen_id;
        displayCitizenCard(matched.citizen_id);
      } else {
        const fallbackCitizen = {
          citizen_id: 1,
          citizen_name: name !== "-" ? name : "Citizen Name",
          dob: "2000-01-01",
          gender: "Citizen",
          mobile_number: mobileRaw || "9876543210"
        };
        updateAadhaarCardUI(fallbackCitizen, `${center} (${location})`);
      }
    });
  }

  // Print Card Button
  const printBtn = document.getElementById("printCardBtn");
  if (printBtn) {
    printBtn.addEventListener("click", function () {
      window.print();
    });
  }

  // Canvas High-Res PNG Download
  const downloadPngBtn = document.getElementById("downloadCardPngBtn");
  if (downloadPngBtn) {
    downloadPngBtn.addEventListener("click", function () {
      downloadAadhaarCardPng();
    });
  }
}

// Function to draw clean, official-grade Aadhaar PVC Card on HTML5 Canvas and export as PNG
function downloadAadhaarCardPng() {
  const citizen = currentCardCitizen || {
    citizen_id: 1,
    citizen_name: document.getElementById("cardCitizenName")?.textContent || "Citizen Full Name",
    dob: document.getElementById("cardDOB")?.textContent || "01/01/2000",
    gender: document.getElementById("cardGender")?.textContent || "Citizen",
    mobile_number: (document.getElementById("cardMobile")?.textContent || "9876543210").replace(/\D/g, "")
  };

  const centerText = document.getElementById("cardCenter")?.textContent || "Central UIDAI Kendra, District";
  const aadhaarNumber = generateAadhaarNumber(citizen.citizen_id, citizen.mobile_number);

  const canvas = document.getElementById("offscreenCardCanvas") || document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");

  // Clear canvas
  ctx.clearRect(0, 0, 1000, 630);

  // Helper for rounded rectangle
  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Card Outer Shadow & Background
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 3;
  roundRect(ctx, 15, 15, 970, 600, 20, true, true);

  // Top Tricolor Indian Ribbon
  ctx.fillStyle = "#ff9933"; // Saffron
  ctx.fillRect(15, 15, 970, 5);
  ctx.fillStyle = "#ffffff"; // White
  ctx.fillRect(15, 20, 970, 5);
  ctx.fillStyle = "#138808"; // Green
  ctx.fillRect(15, 25, 970, 5);

  // Header Divider
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(15, 115);
  ctx.lineTo(985, 115);
  ctx.stroke();

  // Emblem Circle / Chakra on Left
  ctx.save();
  ctx.strokeStyle = "#0f2e5a";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(68, 68, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(68, 68, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#0f2e5a";
  ctx.fill();
  for (let i = 0; i < 24; i++) {
    const angle = (i * 15 * Math.PI) / 180;
    ctx.beginPath();
    ctx.moveTo(68 + Math.cos(angle) * 8, 68 + Math.sin(angle) * 8);
    ctx.lineTo(68 + Math.cos(angle) * 28, 68 + Math.sin(angle) * 28);
    ctx.stroke();
  }
  ctx.restore();

  // Header Titles
  ctx.textAlign = "center";
  ctx.fillStyle = "#0f2e5a";
  ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("भारत सरकार", 500, 52);

  ctx.fillStyle = "#1e293b";
  ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("GOVERNMENT OF INDIA", 500, 74);

  ctx.fillStyle = "#ea580c";
  ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("भारतीय विशिष्ट पहचान प्राधिकरण | UIDAI", 500, 95);

  // Sun Aadhaar Logo on Right
  ctx.fillStyle = "#b91c1c";
  ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("आधार", 920, 80);
  ctx.fillStyle = "#ea580c";
  ctx.font = "24px Arial";
  ctx.fillText("☀️", 920, 52);

  // Photo Frame on Left (x: 50, y: 140, w: 170, h: 215)
  ctx.fillStyle = "#f8fafc";
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  roundRect(ctx, 50, 140, 170, 215, 8, true, true);

  // Silhouette / Avatar inside Photo Box
  ctx.save();
  ctx.beginPath();
  ctx.arc(135, 215, 42, 0, Math.PI * 2);
  ctx.fillStyle = "#cbd5e1";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(135, 335, 75, Math.PI, 0, false);
  ctx.fillStyle = "#94a3b8";
  ctx.fill();
  ctx.restore();

  // Chip bar on Photo
  ctx.fillStyle = "rgba(15, 46, 90, 0.9)";
  roundRect(ctx, 50, 325, 170, 30, 4, true, false);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("SECURE SMART CHIP", 135, 345);

  // Verified Stamp under Photo
  ctx.fillStyle = "#f0fdf4";
  ctx.strokeStyle = "#16a34a";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 50, 370, 170, 32, 6, true, true);
  ctx.fillStyle = "#166534";
  ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("✓ VERIFIED IDENTITY", 135, 391);

  // Middle Information Block (x: 250, starting y: 155)
  ctx.textAlign = "left";

  function drawInfoLine(labelHi, labelEn, value, yPos, isTitle = false) {
    ctx.fillStyle = "#64748b";
    ctx.font = "600 13px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(`${labelHi} / ${labelEn} :`, 250, yPos);

    if (isTitle) {
      ctx.fillStyle = "#0f2e5a";
      ctx.font = "bold 23px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(value, 250, yPos + 26);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 17px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(value, 250, yPos + 22);
    }
  }

  drawInfoLine("नाम", "Name", citizen.citizen_name || "Citizen Full Name", 155, true);
  drawInfoLine("जन्म तिथि", "Date of Birth", formatAadhaarDate(citizen.dob), 220);
  drawInfoLine("लिंग", "Gender", citizen.gender || "Citizen", 275);
  drawInfoLine("पंजीकृत मोबाइल", "Mobile", `+91 ${citizen.mobile_number || "9876543210"}`, 330);
  drawInfoLine("नामांकन केंद्र", "Enrollment Center", centerText, 385);

  // Right Side: Realistic QR Code Box (x: 755, y: 140, w: 185, h: 220)
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 755, 140, 185, 220, 8, true, true);

  // QR Code Finder Patterns & modules
  ctx.fillStyle = "#0f2e5a";
  // Finder 1: top-left (775, 160)
  ctx.fillRect(775, 160, 42, 42);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(781, 166, 30, 30);
  ctx.fillStyle = "#0f2e5a";
  ctx.fillRect(787, 172, 18, 18);

  // Finder 2: top-right (875, 160)
  ctx.fillRect(875, 160, 42, 42);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(881, 166, 30, 30);
  ctx.fillStyle = "#0f2e5a";
  ctx.fillRect(887, 172, 18, 18);

  // Finder 3: bottom-left (775, 260)
  ctx.fillRect(775, 260, 42, 42);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(781, 266, 30, 30);
  ctx.fillStyle = "#0f2e5a";
  ctx.fillRect(787, 272, 18, 18);

  // Random data clusters inside QR for realistic matrix
  const matrixDots = [
    [825, 165, 12, 12], [845, 170, 8, 14], [830, 190, 10, 10], [850, 192, 14, 8],
    [780, 215, 10, 10], [800, 225, 8, 8], [820, 215, 14, 14], [845, 225, 8, 8],
    [870, 215, 12, 10], [895, 225, 12, 12], [825, 245, 10, 12], [845, 250, 8, 8],
    [870, 250, 14, 8], [890, 265, 12, 12], [840, 280, 10, 12], [865, 285, 14, 10]
  ];
  matrixDots.forEach(([dx, dy, dw, dh]) => {
    ctx.fillRect(dx, dy, dw, dh);
  });

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 11px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("DIGITALLY SIGNED QR", 847, 342);

  // 12-Digit Aadhaar Number Strip (y: 440 to 525)
  ctx.fillStyle = "#f8fafc";
  roundRect(ctx, 35, 440, 930, 80, 8, true, false);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1;
  ctx.strokeRect(35, 440, 930, 80);

  ctx.fillStyle = "#64748b";
  ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("आपका आधार क्रमांक / Your Aadhaar No. :", 500, 465);

  ctx.fillStyle = "#b91c1c";
  ctx.font = "bold 32px 'Courier New', Courier, monospace";
  ctx.fillText(aadhaarNumber, 500, 505);

  // Card Bottom Footer Slogan (y: 535 to 600)
  ctx.strokeStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.moveTo(35, 545);
  ctx.lineTo(965, 545);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#0f2e5a";
  ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("मेरा आधार, मेरी पहचान", 50, 580);

  ctx.textAlign = "center";
  ctx.fillStyle = "#475569";
  ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("My Aadhaar, My Identity", 500, 580);

  ctx.textAlign = "right";
  ctx.fillStyle = "#94a3b8";
  ctx.font = "12px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("[DBMS Laboratory Project - Academic Demo]", 950, 580);

  // Trigger download
  const cleanName = (citizen.citizen_name || "Citizen").replace(/[^a-zA-Z0-9]/g, "_");
  const dataUrl = canvas.toDataURL("image/png");
  const downloadLink = document.createElement("a");
  downloadLink.href = dataUrl;
  downloadLink.download = `Aadhaar_Card_${cleanName}.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

// ====================================================
// 11. DEMOGRAPHIC UPDATION PORTAL (SECTION: UPDATE)
// ====================================================
function loadUpdateCitizensDropdown(citizens) {
  const select = document.getElementById("updateCitizenSelect");
  if (!select) return;

  const currentVal = select.value;
  let options = '<option value="">-- Choose a Citizen to Edit --</option>';
  if (Array.isArray(citizens)) {
    citizens.forEach((c) => {
      options += `<option value="${c.citizen_id}">#${c.citizen_id} - ${c.citizen_name} (Mobile: ${c.mobile_number})</option>`;
    });
  }
  select.innerHTML = options;
  if (currentVal) select.value = currentVal;
}

function populateUpdateForm(citizen) {
  if (!citizen) return;

  const editId = document.getElementById("editCitizenId");
  const editName = document.getElementById("editCitizenName");
  const editDob = document.getElementById("editDOB");
  const editGender = document.getElementById("editGender");
  const editMobile = document.getElementById("editMobile");
  const viewCardBtn = document.getElementById("viewUpdatedCardBtn");

  if (editId) editId.value = citizen.citizen_id;
  if (editName) editName.value = citizen.citizen_name || "";
  if (editDob) editDob.value = citizen.dob ? citizen.dob.split("T")[0] : "";
  if (editGender) editGender.value = citizen.gender || "";
  if (editMobile) editMobile.value = citizen.mobile_number || "";

  if (viewCardBtn) viewCardBtn.style.display = "inline-block";

  showAlert(
    "updateAlert",
    `[Loaded] Citizen <strong>#${citizen.citizen_id} - ${escapeHtml(citizen.citizen_name)}</strong> is ready for demographic updates.`,
    "info"
  );
}

window.openUpdateCitizen = function (citizenId) {
  switchSection("update-section");

  const updateSelect = document.getElementById("updateCitizenSelect");
  if (updateSelect) updateSelect.value = citizenId;

  const citizen = allCitizens.find((c) => String(c.citizen_id) === String(citizenId));
  if (citizen) {
    populateUpdateForm(citizen);
  } else {
    const idInput = document.getElementById("updateCitizenIdInput");
    if (idInput) {
      idInput.value = citizenId;
      const fetchBtn = document.getElementById("fetchCitizenForUpdateBtn");
      if (fetchBtn) fetchBtn.click();
    }
  }
};

function setupUpdatePortal() {
  const updateSelect = document.getElementById("updateCitizenSelect");
  const idInput = document.getElementById("updateCitizenIdInput");
  const fetchBtn = document.getElementById("fetchCitizenForUpdateBtn");
  const refreshBtn = document.getElementById("refreshUpdateCitizensBtn");
  const updateForm = document.getElementById("updateCitizenForm");
  const resetBtn = document.getElementById("resetUpdateFormBtn");
  const viewUpdatedCardBtn = document.getElementById("viewUpdatedCardBtn");
  const editDobInput = document.getElementById("editDOB");

  // Restrict DOB to today or earlier
  if (editDobInput) {
    const today = new Date().toISOString().split("T")[0];
    editDobInput.setAttribute("max", today);
  }

  // Handle dropdown selection change
  if (updateSelect) {
    updateSelect.addEventListener("change", function () {
      const citizenId = this.value;
      if (!citizenId) return;
      if (idInput) idInput.value = citizenId;
      const citizen = allCitizens.find((c) => String(c.citizen_id) === String(citizenId));
      if (citizen) {
        populateUpdateForm(citizen);
      }
    });
  }

  // Handle manual ID search / fetch button
  if (fetchBtn && idInput) {
    fetchBtn.addEventListener("click", function () {
      const citizenId = idInput.value.trim();
      if (!citizenId) {
        showAlert("updateAlert", "Please enter a valid numeric Citizen ID.", "error");
        return;
      }

      const existing = allCitizens.find((c) => String(c.citizen_id) === String(citizenId));
      if (existing) {
        if (updateSelect) updateSelect.value = existing.citizen_id;
        populateUpdateForm(existing);
        return;
      }

      // If not in local cache yet, fetch from backend
      fetchBtn.disabled = true;
      fetchBtn.textContent = "Fetching...";

      fetch(`${API_BASE_URL}/citizens`)
        .then((res) => res.json())
        .then((data) => {
          fetchBtn.disabled = false;
          fetchBtn.textContent = "Fetch Details";

          if (data.success && Array.isArray(data.citizens)) {
            allCitizens = data.citizens;
            loadUpdateCitizensDropdown(allCitizens);
            const found = allCitizens.find((c) => String(c.citizen_id) === String(citizenId));
            if (found) {
              if (updateSelect) updateSelect.value = found.citizen_id;
              populateUpdateForm(found);
            } else {
              showAlert("updateAlert", `Citizen ID #${citizenId} was not found in the database.`, "error");
            }
          }
        })
        .catch((err) => {
          fetchBtn.disabled = false;
          fetchBtn.textContent = "Fetch Details";
          console.error("Fetch citizen error:", err);
          showAlert("updateAlert", "Could not connect to backend to fetch citizen details.", "error");
        });
    });
  }

  // Handle refresh list button
  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      loadCitizensDropdown();
    });
  }

  // Handle form submission (PUT /api/citizens/:id)
  if (updateForm) {
    updateForm.addEventListener("submit", function (event) {
      event.preventDefault();

      const citizenId = document.getElementById("editCitizenId").value;
      const citizenName = document.getElementById("editCitizenName").value.trim();
      const dob = document.getElementById("editDOB").value;
      const gender = document.getElementById("editGender").value;
      const mobileNumber = document.getElementById("editMobile").value.trim();
      const submitBtn = document.getElementById("updateCitizenSubmitBtn");

      if (!citizenId) {
        showAlert("updateAlert", "Please select or fetch a citizen record before submitting updates.", "error");
        return;
      }

      if (!citizenName || !dob || !gender || !mobileNumber) {
        showAlert("updateAlert", "Please fill in all required fields.", "error");
        return;
      }

      if (!/^\d{10}$/.test(mobileNumber)) {
        showAlert("updateAlert", "Mobile number must be exactly 10 digits.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Updating Database Record...";

      fetch(`${API_BASE_URL}/citizens/${citizenId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizen_name: citizenName,
          dob: dob,
          gender: gender,
          mobile_number: mobileNumber
        })
      })
        .then((res) => res.json())
        .then((data) => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Updated Details";

          if (data.success) {
            showAlert(
              "updateAlert",
              `[Success] Citizen #${citizenId} updated successfully! Demographic changes saved to database.`,
              "success"
            );

            if (viewUpdatedCardBtn) viewUpdatedCardBtn.style.display = "inline-block";

            // Update in-memory cache
            const idx = allCitizens.findIndex((c) => String(c.citizen_id) === String(citizenId));
            if (idx !== -1) {
              allCitizens[idx] = {
                ...allCitizens[idx],
                citizen_name: citizenName,
                dob: dob,
                gender: gender,
                mobile_number: mobileNumber
              };
            }

            // Refresh tables and dropdowns
            loadCitizensDropdown();
            loadCitizensTable();
            loadApplicationsTable();
          } else {
            const detail = data.error ? ` Details: ${data.error}` : "";
            showAlert("updateAlert", `[Error] ${data.message || "Failed to update citizen."}${detail}`, "error");
          }
        })
        .catch((error) => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Updated Details";
          console.error("Demographic update error:", error);
          showAlert("updateAlert", "[Error] Could not connect to backend server.", "error");
        });
    });
  }

  // Handle View Updated ID Card button
  if (viewUpdatedCardBtn) {
    viewUpdatedCardBtn.addEventListener("click", function () {
      const citizenId = document.getElementById("editCitizenId").value;
      if (citizenId) {
        window.viewCitizenCard(citizenId);
      }
    });
  }

  // Handle Form Reset
  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      if (updateForm) updateForm.reset();
      document.getElementById("editCitizenId").value = "";
      if (updateSelect) updateSelect.value = "";
      if (idInput) idInput.value = "";
      if (viewUpdatedCardBtn) viewUpdatedCardBtn.style.display = "none";
      const alertEl = document.getElementById("updateAlert");
      if (alertEl) alertEl.style.display = "none";
    });
  }
}

