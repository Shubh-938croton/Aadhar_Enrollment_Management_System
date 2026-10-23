// ====================================================
// Aadhaar Enrollment Management System — Frontend JavaScript
// Clean, Original Academic Implementation for DBMS Laboratory
// ====================================================

const DEPLOYED_BACKEND_URL = "https://aadhar-enrollment-management-system-croton2.vercel.app";

// Automatic API base URL resolution
function getApiBaseUrl() {
  try {
    const customUrl = localStorage.getItem("API_URL");
    if (customUrl) return customUrl.replace(/\/+$/, "");
  } catch (e) {}

  const currentHost = window.location.hostname;
  const currentOrigin = window.location.origin;

  if (currentHost === "localhost" || currentHost === "127.0.0.1") {
    if (window.location.port === "3000") return "/api";
    return "http://localhost:3000/api";
  }

  if (currentOrigin.includes("aadhar-enrollment-management-system")) {
    return "/api";
  }

  return `${DEPLOYED_BACKEND_URL}/api`;
}

const API_BASE_URL = getApiBaseUrl();

// Global data caches for instant filtering and relational dropdowns
let allCitizens = [];
let allCenters = [];
let allApplications = [];
let allBiometrics = [];

// ====================================================
// 1. INITIALIZATION & ROUTING
// ====================================================
document.addEventListener("DOMContentLoaded", function () {
  checkBackendHealth();
  setupNavigation();
  setupCitizensModule();
  setupCentersModule();
  setupApplicationsModule();
  setupBiometricsModule();
  setupSearchFilters();
  loadAcademicCredits();
  setupAcademicCreditsModal();

  // Restrict Date of Birth picker to today or earlier
  const today = new Date().toISOString().split("T")[0];
  const dobInput = document.getElementById("citizenDob");
  if (dobInput) dobInput.setAttribute("max", today);

  // Load all foundational tables
  loadAllData();
});

// Load all 4 relational tables from backend
function loadAllData() {
  loadCitizensTable();
  loadCentersTable();
  loadApplicationsTable();
  loadBiometricsTable();
}

// Check Backend connectivity and TiDB / MySQL status
function checkBackendHealth() {
  const badge = document.getElementById("backendStatusIndicator");
  const text = document.getElementById("backendStatusText");
  if (!badge || !text) return;

  fetch(`${API_BASE_URL}/db-status`)
    .then((res) => res.json())
    .then((data) => {
      if (data.connected || data.success) {
        badge.classList.add("online");
        text.textContent = "Backend: Connected (Live DB)";
      } else {
        badge.classList.remove("online");
        text.textContent = "Backend: DB Disconnected";
      }
    })
    .catch(() => {
      // Fallback check on health endpoint
      fetch(`${API_BASE_URL}/health`)
        .then((res) => res.json())
        .then(() => {
          badge.classList.add("online");
          text.textContent = "Backend: API Online";
        })
        .catch(() => {
          badge.classList.remove("online");
          text.textContent = "Backend: Offline / Connecting...";
        });
    });

  // Clicking badge allows testing custom API URL
  badge.onclick = function () {
    const current = localStorage.getItem("API_URL") || API_BASE_URL;
    const input = prompt("Backend API Base URL (leave blank to restore default):", current);
    if (input !== null) {
      if (input.trim() === "") {
        localStorage.removeItem("API_URL");
      } else {
        localStorage.setItem("API_URL", input.trim());
      }
      window.location.reload();
    }
  };
}

// Navigation between Dashboard and 4 Table views
function setupNavigation() {
  // Top nav tabs
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    tab.addEventListener("click", function () {
      const target = this.getAttribute("data-target");
      navigateToView(target);
    });
  });

  // Entity cards on Dashboard
  document.querySelectorAll(".entity-card").forEach((card) => {
    card.addEventListener("click", function () {
      const section = this.getAttribute("data-section");
      if (section) navigateToView(section);
    });
  });

  // Breadcrumb back buttons on table headers
  document.querySelectorAll(".back-to-dashboard").forEach((btn) => {
    btn.addEventListener("click", function () {
      navigateToView("dashboard");
    });
  });

  // Handle browser back and forward buttons
  window.addEventListener("popstate", function (e) {
    if (e.state && e.state.section) {
      switchView(e.state.section, false);
    } else {
      const params = new URLSearchParams(window.location.search);
      const section = params.get("section") || "dashboard";
      switchView(section, false);
    }
  });

  // Handle initial URL section param
  const initialParams = new URLSearchParams(window.location.search);
  const initialSection = initialParams.get("section") || "dashboard";
  switchView(initialSection, false);
}

function navigateToView(section) {
  const newUrl = section === "dashboard" ? window.location.pathname : `?section=${section}`;
  window.history.pushState({ section }, "", newUrl);
  switchView(section, false);
}

function switchView(section, updateUrl = true) {
  // Normalize section
  const validSections = ["dashboard", "Citizens", "EnrollmentCenter", "AadharApplication", "BiometricRecord"];
  const currentSection = validSections.includes(section) ? section : "dashboard";

  // Update nav tabs active state
  document.querySelectorAll(".nav-tab").forEach((tab) => {
    if (tab.getAttribute("data-target") === currentSection) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // Update page-view visibility
  document.querySelectorAll(".page-view").forEach((view) => {
    view.classList.remove("active");
  });

  const targetView = document.getElementById(`view-${currentSection}`);
  if (targetView) {
    targetView.classList.add("active");
  }

  // Close open form panels when switching views
  document.querySelectorAll(".crud-form-panel").forEach((panel) => {
    panel.classList.add("hidden");
  });

  if (updateUrl) {
    const newUrl = currentSection === "dashboard" ? window.location.pathname : `?section=${currentSection}`;
    window.history.pushState({ section: currentSection }, "", newUrl);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Update all count badges across tabs and dashboard cards
function updateBadges() {
  // Citizens
  const cLen = allCitizens.length;
  setText("tabCountCitizens", cLen);
  setText("badgeCitizens", `${cLen} Record${cLen === 1 ? "" : "s"}`);
  setText("countCitizens", cLen);

  // Centers
  const cenLen = allCenters.length;
  setText("tabCountCenters", cenLen);
  setText("badgeCenters", `${cenLen} Record${cenLen === 1 ? "" : "s"}`);
  setText("countCenters", cenLen);

  // Applications
  const aLen = allApplications.length;
  setText("tabCountApps", aLen);
  setText("badgeApps", `${aLen} Record${aLen === 1 ? "" : "s"}`);
  setText("countApps", aLen);

  // Biometrics
  const bLen = allBiometrics.length;
  setText("tabCountBio", bLen);
  setText("badgeBio", `${bLen} Record${bLen === 1 ? "" : "s"}`);
  setText("countBio", bLen);
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// Alert banner display
function showNotification(elementId, message, type = "success") {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.className = `notification-alert ${type}`;
  el.textContent = message;
  el.style.display = "block";

  setTimeout(() => {
    if (el.textContent === message) {
      el.style.display = "none";
    }
  }, 4500);
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (e) {
    return dateStr;
  }
}

function getStatusBadgeHtml(status) {
  const s = (status || "Pending").toLowerCase();
  let statusClass = "status-pending";
  if (s === "approved" || s === "complete") statusClass = "status-approved";
  else if (s === "rejected") statusClass = "status-rejected";

  return `<span class="status-pill ${statusClass}">${escapeHtml(status || "Pending")}</span>`;
}

// ====================================================
// 2. CITIZENS MODULE
// ====================================================
function setupCitizensModule() {
  const toggleBtn = document.getElementById("toggleAddCitizenBtn");
  const formPanel = document.getElementById("citizenFormPanel");
  const cancelBtn = document.getElementById("cancelCitizenBtn");
  const closeBtn = document.getElementById("closeCitizenFormBtn");
  const form = document.getElementById("citizenCrudForm");

  // Toggle Insert Form
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById("editCitizenId").value = "";
      document.getElementById("citizenFormTitle").textContent = "➕ Insert New Citizen Record";
      formPanel.classList.toggle("hidden");
      if (!formPanel.classList.contains("hidden")) {
        document.getElementById("citizenName").focus();
      }
    });
  }

  // Cancel Buttons
  const hidePanel = () => formPanel.classList.add("hidden");
  if (cancelBtn) cancelBtn.addEventListener("click", hidePanel);
  if (closeBtn) closeBtn.addEventListener("click", hidePanel);

  // Form Submit (Add or Update)
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const editId = document.getElementById("editCitizenId").value;
      const citizen_name = document.getElementById("citizenName").value.trim();
      const dob = document.getElementById("citizenDob").value;
      const gender = document.getElementById("citizenGender").value;
      const mobile_number = document.getElementById("citizenMobile").value.trim();

      if (!citizen_name || !dob || !gender || !mobile_number) {
        showNotification("citizenAlert", "Please fill in all required fields.", "error");
        return;
      }

      if (!/^[0-9]{10}$/.test(mobile_number)) {
        showNotification("citizenAlert", "Mobile number must be exactly 10 digits.", "error");
        return;
      }

      const payload = { citizen_name, dob, gender, mobile_number };
      const isEdit = Boolean(editId);
      const url = isEdit ? `${API_BASE_URL}/citizens/${editId}` : `${API_BASE_URL}/citizens`;
      const method = isEdit ? "PUT" : "POST";

      fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showNotification(
              "citizenAlert",
              isEdit ? `Citizen #${editId} details updated successfully!` : "New citizen registered successfully!",
              "success"
            );
            form.reset();
            document.getElementById("editCitizenId").value = "";
            formPanel.classList.add("hidden");
            loadCitizensTable();
          } else {
            showNotification("citizenAlert", data.message || "Failed to save citizen record.", "error");
          }
        })
        .catch((err) => {
          console.error("Citizen save error:", err);
          showNotification("citizenAlert", "Network error while saving citizen.", "error");
        });
    });
  }
}

function loadCitizensTable() {
  const tbody = document.getElementById("citizensTableBody");

  fetch(`${API_BASE_URL}/citizens`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.citizens)) {
        allCitizens = data.citizens;
        renderCitizensTable(allCitizens);
        updateBadges();
        populateCitizenDropdown();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No citizen records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load citizens error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Unable to connect to database.</td></tr>';
    });
}

function renderCitizensTable(list) {
  const tbody = document.getElementById("citizensTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No matching records found.</td></tr>';
    setText("countCitizens", 0);
    return;
  }

  setText("countCitizens", list.length);

  tbody.innerHTML = list
    .map((c) => {
      return `
        <tr>
          <td><strong>#${c.citizen_id}</strong></td>
          <td>${escapeHtml(c.citizen_name)}</td>
          <td>${formatDate(c.dob)}</td>
          <td>${escapeHtml(c.gender)}</td>
          <td><code>${escapeHtml(c.mobile_number)}</code></td>
          <td style="text-align: center;">
            <div class="row-actions-group">
              <button type="button" class="btn-table-action btn-edit" onclick="handleEditCitizen(${c.citizen_id})">✏ Edit</button>
              <button type="button" class="btn-table-action btn-delete" onclick="handleDeleteCitizen(${c.citizen_id})">🗑 Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

window.handleEditCitizen = function (id) {
  const citizen = allCitizens.find((c) => Number(c.citizen_id) === Number(id));
  if (!citizen) return;

  document.getElementById("editCitizenId").value = citizen.citizen_id;
  document.getElementById("citizenName").value = citizen.citizen_name || "";
  document.getElementById("citizenDob").value = formatDate(citizen.dob);
  document.getElementById("citizenGender").value = citizen.gender || "";
  document.getElementById("citizenMobile").value = citizen.mobile_number || "";

  document.getElementById("citizenFormTitle").textContent = `✏️ Edit Citizen #${citizen.citizen_id} (${citizen.citizen_name})`;

  const formPanel = document.getElementById("citizenFormPanel");
  formPanel.classList.remove("hidden");
  formPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

window.handleDeleteCitizen = function (id) {
  const citizen = allCitizens.find((c) => Number(c.citizen_id) === Number(id));
  const name = citizen ? citizen.citizen_name : `#${id}`;

  const confirmed = confirm(
    `Are you sure you want to delete Citizen #${id} (${name})?\n\nWarning: This will also remove any related Aadhaar Applications and Biometric Records (Cascade Delete).`
  );
  if (!confirmed) return;

  fetch(`${API_BASE_URL}/citizens/${id}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showNotification("citizenAlert", `Citizen #${id} removed successfully.`, "success");
        loadCitizensTable();
        loadApplicationsTable();
        loadBiometricsTable();
      } else {
        showNotification("citizenAlert", data.message || "Failed to delete citizen.", "error");
      }
    })
    .catch((err) => {
      console.error("Delete citizen error:", err);
      showNotification("citizenAlert", "Network error while deleting citizen.", "error");
    });
};

// ====================================================
// 3. ENROLLMENT CENTERS MODULE
// ====================================================
function setupCentersModule() {
  const toggleBtn = document.getElementById("toggleAddCenterBtn");
  const formPanel = document.getElementById("centerFormPanel");
  const cancelBtn = document.getElementById("cancelCenterBtn");
  const closeBtn = document.getElementById("closeCenterFormBtn");
  const form = document.getElementById("centerCrudForm");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById("editCenterId").value = "";
      document.getElementById("centerFormTitle").textContent = "➕ Insert New Enrollment Center";
      formPanel.classList.toggle("hidden");
      if (!formPanel.classList.contains("hidden")) {
        document.getElementById("centerName").focus();
      }
    });
  }

  const hidePanel = () => formPanel.classList.add("hidden");
  if (cancelBtn) cancelBtn.addEventListener("click", hidePanel);
  if (closeBtn) closeBtn.addEventListener("click", hidePanel);

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const editId = document.getElementById("editCenterId").value;
      const center_name = document.getElementById("centerName").value.trim();
      const district = document.getElementById("centerDistrict").value.trim();
      const state = document.getElementById("centerState").value.trim();

      if (!center_name || !district || !state) {
        showNotification("centerAlert", "Please fill in all center fields.", "error");
        return;
      }

      const payload = { center_name, district, state };
      const isEdit = Boolean(editId);
      const url = isEdit ? `${API_BASE_URL}/centers/${editId}` : `${API_BASE_URL}/centers`;
      const method = isEdit ? "PUT" : "POST";

      fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showNotification(
              "centerAlert",
              isEdit ? `Center #${editId} updated successfully!` : "New enrollment center added successfully!",
              "success"
            );
            form.reset();
            document.getElementById("editCenterId").value = "";
            formPanel.classList.add("hidden");
            loadCentersTable();
          } else {
            showNotification("centerAlert", data.message || "Failed to save center.", "error");
          }
        })
        .catch((err) => {
          console.error("Center save error:", err);
          showNotification("centerAlert", "Network error while saving center.", "error");
        });
    });
  }
}

function loadCentersTable() {
  const tbody = document.getElementById("centersTableBody");

  fetch(`${API_BASE_URL}/centers`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.centers)) {
        allCenters = data.centers;
        renderCentersTable(allCenters);
        updateBadges();
        populateCenterDropdown();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No enrollment centers found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load centers error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Unable to connect to database.</td></tr>';
    });
}

function renderCentersTable(list) {
  const tbody = document.getElementById("centersTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No matching centers found.</td></tr>';
    setText("countCenters", 0);
    return;
  }

  setText("countCenters", list.length);

  tbody.innerHTML = list
    .map((c) => {
      return `
        <tr>
          <td><strong>#${c.center_id}</strong></td>
          <td>${escapeHtml(c.center_name)}</td>
          <td>${escapeHtml(c.district)}</td>
          <td>${escapeHtml(c.state)}</td>
          <td style="text-align: center;">
            <div class="row-actions-group">
              <button type="button" class="btn-table-action btn-edit" onclick="handleEditCenter(${c.center_id})">✏ Edit</button>
              <button type="button" class="btn-table-action btn-delete" onclick="handleDeleteCenter(${c.center_id})">🗑 Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

window.handleEditCenter = function (id) {
  const center = allCenters.find((c) => Number(c.center_id) === Number(id));
  if (!center) return;

  document.getElementById("editCenterId").value = center.center_id;
  document.getElementById("centerName").value = center.center_name || "";
  document.getElementById("centerDistrict").value = center.district || "";
  document.getElementById("centerState").value = center.state || "";

  document.getElementById("centerFormTitle").textContent = `✏️ Edit Center #${center.center_id} (${center.center_name})`;

  const formPanel = document.getElementById("centerFormPanel");
  formPanel.classList.remove("hidden");
  formPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

window.handleDeleteCenter = function (id) {
  const center = allCenters.find((c) => Number(c.center_id) === Number(id));
  const name = center ? center.center_name : `#${id}`;

  const confirmed = confirm(
    `Are you sure you want to remove Enrollment Center #${id} (${name})?\n\nWarning: Associated applications and biometric records may also be affected.`
  );
  if (!confirmed) return;

  fetch(`${API_BASE_URL}/centers/${id}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showNotification("centerAlert", `Center #${id} removed successfully.`, "success");
        loadCentersTable();
        loadApplicationsTable();
        loadBiometricsTable();
      } else {
        showNotification("centerAlert", data.message || "Failed to delete center.", "error");
      }
    })
    .catch((err) => {
      console.error("Delete center error:", err);
      showNotification("centerAlert", "Network error while deleting center.", "error");
    });
};

// ====================================================
// 4. AADHAAR APPLICATIONS MODULE
// ====================================================
function setupApplicationsModule() {
  const toggleBtn = document.getElementById("toggleAddAppBtn");
  const formPanel = document.getElementById("appFormPanel");
  const cancelBtn = document.getElementById("cancelAppBtn");
  const closeBtn = document.getElementById("closeAppFormBtn");
  const form = document.getElementById("appCrudForm");
  const statusGroup = document.getElementById("appStatusFieldGroup");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById("editAppId").value = "";
      document.getElementById("appFormTitle").textContent = "➕ Create New Aadhaar Application";
      if (statusGroup) statusGroup.style.display = "none";
      formPanel.classList.toggle("hidden");
      if (!formPanel.classList.contains("hidden")) {
        populateCitizenDropdown();
        populateCenterDropdown();
      }
    });
  }

  const hidePanel = () => formPanel.classList.add("hidden");
  if (cancelBtn) cancelBtn.addEventListener("click", hidePanel);
  if (closeBtn) closeBtn.addEventListener("click", hidePanel);

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const editId = document.getElementById("editAppId").value;
      const citizen_id = document.getElementById("appCitizenSelect").value;
      const center_id = document.getElementById("appCenterSelect").value;
      const statusSelect = document.getElementById("appStatusSelect");
      const status = statusSelect ? statusSelect.value : "Pending";

      if (!citizen_id || !center_id) {
        showNotification("applicationAlert", "Please select both a citizen and an enrollment center.", "error");
        return;
      }

      const isEdit = Boolean(editId);
      const url = isEdit ? `${API_BASE_URL}/applications/${editId}` : `${API_BASE_URL}/applications`;
      const method = isEdit ? "PUT" : "POST";

      const payload = isEdit
        ? { citizen_id: Number(citizen_id), center_id: Number(center_id), status: status }
        : { citizen_id: Number(citizen_id), center_id: Number(center_id) };

      fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showNotification(
              "applicationAlert",
              isEdit
                ? `Application #${editId} updated successfully!`
                : `Application #${data.application_id || ""} created with auto-generated Biometric Record!`,
              "success"
            );
            form.reset();
            document.getElementById("editAppId").value = "";
            if (statusGroup) statusGroup.style.display = "none";
            formPanel.classList.add("hidden");
            loadApplicationsTable();
            loadBiometricsTable();
          } else {
            showNotification("applicationAlert", data.message || "Failed to save application.", "error");
          }
        })
        .catch((err) => {
          console.error("Application save error:", err);
          showNotification("applicationAlert", "Network error while saving application.", "error");
        });
    });
  }
}

function loadApplicationsTable() {
  const tbody = document.getElementById("applicationsTableBody");

  fetch(`${API_BASE_URL}/applications`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.applications)) {
        allApplications = data.applications;
        renderApplicationsTable(allApplications);
        updateBadges();
        populateApplicationDropdown();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No application records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load applications error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Unable to connect to database.</td></tr>';
    });
}

function renderApplicationsTable(list) {
  const tbody = document.getElementById("applicationsTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No matching applications found.</td></tr>';
    setText("countApps", 0);
    return;
  }

  setText("countApps", list.length);

  tbody.innerHTML = list
    .map((a) => {
      const citizenLabel = a.citizen_name
        ? `${escapeHtml(a.citizen_name)} <span style="color:#64748b; font-size:11px;">(#${a.citizen_id})</span>`
        : `Citizen #${a.citizen_id}`;
      const centerLabel = a.center_name
        ? `${escapeHtml(a.center_name)} <span style="color:#64748b; font-size:11px;">(${escapeHtml(a.district || "")})</span>`
        : `Center #${a.center_id}`;

      return `
        <tr>
          <td><strong>#${a.application_id}</strong></td>
          <td>${citizenLabel}</td>
          <td>${centerLabel}</td>
          <td>${formatDate(a.application_date)}</td>
          <td>${getStatusBadgeHtml(a.status)}</td>
          <td style="text-align: center;">
            <div class="row-actions-group">
              <button type="button" class="btn-table-action btn-edit" onclick="handleEditApplication(${a.application_id})">✏ Edit</button>
              <button type="button" class="btn-table-action btn-delete" onclick="handleDeleteApplication(${a.application_id})">🗑 Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populateCitizenDropdown() {
  const select = document.getElementById("appCitizenSelect");
  if (!select) return;

  const currentVal = select.value;
  let options = '<option value="">-- Choose Registered Citizen --</option>';
  allCitizens.forEach((c) => {
    options += `<option value="${c.citizen_id}">#${c.citizen_id} — ${escapeHtml(c.citizen_name)} (${escapeHtml(c.mobile_number)})</option>`;
  });
  select.innerHTML = options;
  if (currentVal) select.value = currentVal;
}

function populateCenterDropdown() {
  const select = document.getElementById("appCenterSelect");
  if (!select) return;

  const currentVal = select.value;
  let options = '<option value="">-- Choose Enrollment Center --</option>';
  allCenters.forEach((c) => {
    options += `<option value="${c.center_id}">#${c.center_id} — ${escapeHtml(c.center_name)} (${escapeHtml(c.district)}, ${escapeHtml(c.state)})</option>`;
  });
  select.innerHTML = options;
  if (currentVal) select.value = currentVal;
}

window.handleEditApplication = function (id) {
  const app = allApplications.find((a) => Number(a.application_id) === Number(id));
  if (!app) return;

  populateCitizenDropdown();
  populateCenterDropdown();

  document.getElementById("editAppId").value = app.application_id;
  document.getElementById("appCitizenSelect").value = app.citizen_id;
  document.getElementById("appCenterSelect").value = app.center_id;

  const statusGroup = document.getElementById("appStatusFieldGroup");
  const statusSelect = document.getElementById("appStatusSelect");
  if (statusGroup && statusSelect) {
    statusGroup.style.display = "flex";
    statusSelect.value = app.status || "Pending";
  }

  document.getElementById("appFormTitle").textContent = `✏️ Edit Application #${app.application_id}`;

  const formPanel = document.getElementById("appFormPanel");
  formPanel.classList.remove("hidden");
  formPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

window.handleDeleteApplication = function (id) {
  const confirmed = confirm(
    `Are you sure you want to delete Application #${id}?\n\nWarning: Associated Biometric Records will also be removed.`
  );
  if (!confirmed) return;

  fetch(`${API_BASE_URL}/applications/${id}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showNotification("applicationAlert", `Application #${id} deleted successfully.`, "success");
        loadApplicationsTable();
        loadBiometricsTable();
      } else {
        showNotification("applicationAlert", data.message || "Failed to delete application.", "error");
      }
    })
    .catch((err) => {
      console.error("Delete application error:", err);
      showNotification("applicationAlert", "Network error while deleting application.", "error");
    });
};

// ====================================================
// 5. BIOMETRIC RECORDS MODULE
// ====================================================
function setupBiometricsModule() {
  const toggleBtn = document.getElementById("toggleAddBioBtn");
  const formPanel = document.getElementById("bioFormPanel");
  const cancelBtn = document.getElementById("cancelBioBtn");
  const closeBtn = document.getElementById("closeBioFormBtn");
  const form = document.getElementById("bioCrudForm");
  const appSelectGroup = document.getElementById("bioAppSelectGroup");

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById("editBioId").value = "";
      document.getElementById("bioFormTitle").textContent = "➕ Insert Biometric Security Hashes";
      if (appSelectGroup) appSelectGroup.style.display = "flex";
      formPanel.classList.toggle("hidden");
      if (!formPanel.classList.contains("hidden")) {
        populateApplicationDropdown();
      }
    });
  }

  const hidePanel = () => formPanel.classList.add("hidden");
  if (cancelBtn) cancelBtn.addEventListener("click", hidePanel);
  if (closeBtn) closeBtn.addEventListener("click", hidePanel);

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const editId = document.getElementById("editBioId").value;
      const appSelect = document.getElementById("bioAppSelect");
      const application_id = appSelect ? appSelect.value : "";
      const fingerprint_hash = document.getElementById("bioFingerprint").value.trim();
      const iris_hash = document.getElementById("bioIris").value.trim();

      const isEdit = Boolean(editId);
      if (!isEdit && !application_id) {
        showNotification("biometricAlert", "Please select a target application.", "error");
        return;
      }

      const url = isEdit ? `${API_BASE_URL}/biometrics/${editId}` : `${API_BASE_URL}/biometrics`;
      const method = isEdit ? "PUT" : "POST";

      const payload = isEdit
        ? {
            fingerprint_hash: fingerprint_hash || generateDemoHash("FP"),
            iris_hash: iris_hash || generateDemoHash("IRIS"),
          }
        : {
            application_id: Number(application_id),
            fingerprint_hash: fingerprint_hash || generateDemoHash("FP"),
            iris_hash: iris_hash || generateDemoHash("IRIS"),
          };

      fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showNotification(
              "biometricAlert",
              isEdit
                ? `Biometric Record #${editId} updated successfully!`
                : `Biometric Record #${data.biometric_id || ""} registered successfully!`,
              "success"
            );
            form.reset();
            document.getElementById("editBioId").value = "";
            if (appSelectGroup) appSelectGroup.style.display = "flex";
            formPanel.classList.add("hidden");
            loadBiometricsTable();
          } else {
            showNotification("biometricAlert", data.message || "Failed to save biometric record.", "error");
          }
        })
        .catch((err) => {
          console.error("Biometric save error:", err);
          showNotification("biometricAlert", "Network error while saving biometric hashes.", "error");
        });
    });
  }
}

function generateDemoHash(type) {
  const chars = "0123456789ABCDEF";
  let hash = `SHA256-${type}-`;
  for (let i = 0; i < 16; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

function loadBiometricsTable() {
  const tbody = document.getElementById("biometricsTableBody");

  fetch(`${API_BASE_URL}/biometrics`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.biometrics)) {
        allBiometrics = data.biometrics;
        renderBiometricsTable(allBiometrics);
        updateBadges();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No biometric records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load biometrics error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Unable to connect to database.</td></tr>';
    });
}

function renderBiometricsTable(list) {
  const tbody = document.getElementById("biometricsTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No matching biometric records found.</td></tr>';
    setText("countBio", 0);
    return;
  }

  setText("countBio", list.length);

  tbody.innerHTML = list
    .map((b) => {
      const appLabel = b.citizen_name
        ? `App #${b.application_id} — ${escapeHtml(b.citizen_name)}`
        : `App #${b.application_id}`;

      return `
        <tr>
          <td><strong>#${b.biometric_id}</strong></td>
          <td>${appLabel}</td>
          <td><code title="${escapeHtml(b.fingerprint_hash)}">${escapeHtml(b.fingerprint_hash)}</code></td>
          <td><code title="${escapeHtml(b.iris_hash)}">${escapeHtml(b.iris_hash)}</code></td>
          <td style="text-align: center;">
            <div class="row-actions-group">
              <button type="button" class="btn-table-action btn-edit" onclick="handleEditBiometric(${b.biometric_id})">✏ Edit</button>
              <button type="button" class="btn-table-action btn-delete" onclick="handleDeleteBiometric(${b.biometric_id})">🗑 Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populateApplicationDropdown() {
  const select = document.getElementById("bioAppSelect");
  if (!select) return;

  const currentVal = select.value;
  let options = '<option value="">-- Choose Application --</option>';
  allApplications.forEach((a) => {
    const citizenName = a.citizen_name ? ` (${escapeHtml(a.citizen_name)})` : "";
    options += `<option value="${a.application_id}">Application #${a.application_id}${citizenName}</option>`;
  });
  select.innerHTML = options;
  if (currentVal) select.value = currentVal;
}

window.handleEditBiometric = function (id) {
  const bio = allBiometrics.find((b) => Number(b.biometric_id) === Number(id));
  if (!bio) return;

  document.getElementById("editBioId").value = bio.biometric_id;
  document.getElementById("bioFingerprint").value = bio.fingerprint_hash || "";
  document.getElementById("bioIris").value = bio.iris_hash || "";

  // When editing hashes, hide application select (FK remains immutable per 3NF integrity)
  const appSelectGroup = document.getElementById("bioAppSelectGroup");
  if (appSelectGroup) appSelectGroup.style.display = "none";

  document.getElementById("bioFormTitle").textContent = `✏️ Edit Biometric Record #${bio.biometric_id} (App #${bio.application_id})`;

  const formPanel = document.getElementById("bioFormPanel");
  formPanel.classList.remove("hidden");
  formPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
};

window.handleDeleteBiometric = function (id) {
  const confirmed = confirm(`Are you sure you want to delete Biometric Record #${id}?`);
  if (!confirmed) return;

  fetch(`${API_BASE_URL}/biometrics/${id}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showNotification("biometricAlert", `Biometric Record #${id} deleted successfully.`, "success");
        loadBiometricsTable();
      } else {
        showNotification("biometricAlert", data.message || "Failed to delete biometric record.", "error");
      }
    })
    .catch((err) => {
      console.error("Delete biometric error:", err);
      showNotification("biometricAlert", "Network error while deleting biometric record.", "error");
    });
};

// ====================================================
// 6. REAL-TIME SEARCH FILTERS
// ====================================================
function setupSearchFilters() {
  // Search Citizens
  const searchCitizensInput = document.getElementById("searchCitizens");
  if (searchCitizensInput) {
    searchCitizensInput.addEventListener("input", function () {
      const q = this.value.trim().toLowerCase();
      if (!q) {
        renderCitizensTable(allCitizens);
        return;
      }
      const filtered = allCitizens.filter((c) => {
        return (
          String(c.citizen_id).includes(q) ||
          (c.citizen_name && c.citizen_name.toLowerCase().includes(q)) ||
          (c.mobile_number && c.mobile_number.includes(q)) ||
          (c.gender && c.gender.toLowerCase().includes(q))
        );
      });
      renderCitizensTable(filtered);
    });
  }

  // Search Centers
  const searchCentersInput = document.getElementById("searchCenters");
  if (searchCentersInput) {
    searchCentersInput.addEventListener("input", function () {
      const q = this.value.trim().toLowerCase();
      if (!q) {
        renderCentersTable(allCenters);
        return;
      }
      const filtered = allCenters.filter((c) => {
        return (
          String(c.center_id).includes(q) ||
          (c.center_name && c.center_name.toLowerCase().includes(q)) ||
          (c.district && c.district.toLowerCase().includes(q)) ||
          (c.state && c.state.toLowerCase().includes(q))
        );
      });
      renderCentersTable(filtered);
    });
  }

  // Search Applications
  const searchAppsInput = document.getElementById("searchApps");
  if (searchAppsInput) {
    searchAppsInput.addEventListener("input", function () {
      const q = this.value.trim().toLowerCase();
      if (!q) {
        renderApplicationsTable(allApplications);
        return;
      }
      const filtered = allApplications.filter((a) => {
        return (
          String(a.application_id).includes(q) ||
          String(a.citizen_id).includes(q) ||
          String(a.center_id).includes(q) ||
          (a.citizen_name && a.citizen_name.toLowerCase().includes(q)) ||
          (a.center_name && a.center_name.toLowerCase().includes(q)) ||
          (a.status && a.status.toLowerCase().includes(q))
        );
      });
      renderApplicationsTable(filtered);
    });
  }

  // Search Biometrics
  const searchBioInput = document.getElementById("searchBio");
  if (searchBioInput) {
    searchBioInput.addEventListener("input", function () {
      const q = this.value.trim().toLowerCase();
      if (!q) {
        renderBiometricsTable(allBiometrics);
        return;
      }
      const filtered = allBiometrics.filter((b) => {
        return (
          String(b.biometric_id).includes(q) ||
          String(b.application_id).includes(q) ||
          (b.citizen_name && b.citizen_name.toLowerCase().includes(q)) ||
          (b.fingerprint_hash && b.fingerprint_hash.toLowerCase().includes(q)) ||
          (b.iris_hash && b.iris_hash.toLowerCase().includes(q))
        );
      });
      renderBiometricsTable(filtered);
    });
  }
}

// ====================================================
// 7. ACADEMIC CREDITS (FACULTY GUIDE & 5-MEMBER TEAM)
// ====================================================
const DEFAULT_CREDITS = {
  teacherName: "Prof. Faculty Guide",
  teacherDept: "Department of Computer Science & Engineering",
  students: [
    { name: "Student Member 1", scholar: "SCH-001" },
    { name: "Student Member 2", scholar: "SCH-002" },
    { name: "Student Member 3", scholar: "SCH-003" },
    { name: "Student Member 4", scholar: "SCH-004" },
    { name: "Student Member 5", scholar: "SCH-005" },
  ],
};

function getAcademicCredits() {
  try {
    const saved = localStorage.getItem("AADHAAR_CREDITS");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.teacherName && Array.isArray(parsed.students)) {
        return parsed;
      }
    }
  } catch (e) {}
  return DEFAULT_CREDITS;
}

function saveAcademicCredits(credits) {
  try {
    localStorage.setItem("AADHAAR_CREDITS", JSON.stringify(credits));
  } catch (e) {}
}

function loadAcademicCredits() {
  const credits = getAcademicCredits();

  const teacherNameEl = document.getElementById("displayTeacherName");
  const teacherDeptEl = document.getElementById("displayTeacherDept");
  const gridEl = document.getElementById("homeStudentsGrid");
  const countBadge = document.getElementById("teamCountBadge");

  if (teacherNameEl) teacherNameEl.textContent = credits.teacherName;
  if (teacherDeptEl) teacherDeptEl.textContent = credits.teacherDept;

  if (gridEl) {
    gridEl.innerHTML = credits.students
      .map((s, index) => {
        return `
          <div class="student-card">
            <strong>${index + 1}. ${escapeHtml(s.name || `Student ${index + 1}`)}</strong>
            <span>Scholar: ${escapeHtml(s.scholar || "-")}</span>
          </div>
        `;
      })
      .join("");
  }

  const activeCount = credits.students.filter((s) => s.name && s.name.trim()).length || 5;
  if (countBadge) countBadge.textContent = `${activeCount} Members`;
}

function setupAcademicCreditsModal() {
  const openBtn = document.getElementById("openEditCreditsBtn");
  const modal = document.getElementById("creditsModal");
  const closeBtn = document.getElementById("closeCreditsModalBtn");
  const cancelBtn = document.getElementById("cancelCreditsModalBtn");
  const form = document.getElementById("creditsForm");

  const closeModal = () => {
    if (modal) modal.classList.add("hidden");
  };

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      const credits = getAcademicCredits();
      document.getElementById("inputTeacherName").value = credits.teacherName;
      document.getElementById("inputTeacherDept").value = credits.teacherDept;

      credits.students.forEach((s, idx) => {
        const nameInput = document.getElementById(`inputMember${idx + 1}`);
        const scholarInput = document.getElementById(`inputScholar${idx + 1}`);
        if (nameInput) nameInput.value = s.name || "";
        if (scholarInput) scholarInput.value = s.scholar || "";
      });

      if (modal) modal.classList.remove("hidden");
    });
  }

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const teacherName = document.getElementById("inputTeacherName").value.trim() || DEFAULT_CREDITS.teacherName;
      const teacherDept = document.getElementById("inputTeacherDept").value.trim() || DEFAULT_CREDITS.teacherDept;

      const students = [];
      for (let i = 1; i <= 5; i++) {
        const name = document.getElementById(`inputMember${i}`)?.value.trim() || `Student ${i}`;
        const scholar = document.getElementById(`inputScholar${i}`)?.value.trim() || `SCH-00${i}`;
        students.push({ name, scholar });
      }

      saveAcademicCredits({ teacherName, teacherDept, students });
      loadAcademicCredits();
      closeModal();
    });
  }
}
