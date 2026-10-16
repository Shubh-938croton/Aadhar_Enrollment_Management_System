// ====================================================
// Aadhaar Enrollment Management System — Frontend JavaScript
// Complete Table Operations: Show, Add, Update, Remove
// Relational Database Management System (DBMS) Project
// ====================================================

// Primary backend domain on Vercel
const DEPLOYED_BACKEND_URL = "https://aadhar-enrollment-management-system-croton2.vercel.app";

// Automatic API base resolution
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

// In-memory data store for live search, relations, and prefilling
let allCitizens = [];
let allCenters = [];
let allApplications = [];
let allBiometrics = [];
let currentCardCitizen = null;

// ====================================================
// 1. INITIALIZATION
// ====================================================
document.addEventListener("DOMContentLoaded", function () {
  setupNavigation();
  checkBackendHealth();

  // Load all tables on startup
  loadCitizensTable(false);
  loadCentersTable(false);
  loadApplicationsTable(false);
  loadBiometricsTable(false);

  // Setup form toggles and submissions for each table
  setupCitizensOperations();
  setupCentersOperations();
  setupApplicationsOperations();
  setupBiometricsOperations();

  // Setup Universal Update Record Modal
  setupUniversalUpdateModal();

  // Setup Live Search for each table
  setupSearchFilters();

  // Setup Identity Card generator
  setupCardGenerator();

  // Setup Academic Credits (Teacher & 5 Student members)
  loadAcademicCredits();
  setupAcademicCreditsModal();

  // Restrict Date of Birth pickers to today or earlier
  const today = new Date().toISOString().split("T")[0];
  const dobInput = document.getElementById("DOB");
  if (dobInput) dobInput.setAttribute("max", today);
});

// ====================================================
// 2. NAVIGATION BETWEEN TABLE SECTIONS
// ====================================================
function setupNavigation() {
  const navButtons = document.querySelectorAll(".nav-item");

  navButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const sectionId = this.getAttribute("data-section");
      switchSection(sectionId);
    });
  });
}

function switchSection(sectionId) {
  const sections = document.querySelectorAll(".app-section");
  const navButtons = document.querySelectorAll(".nav-item");

  sections.forEach((sec) => sec.classList.remove("active"));
  navButtons.forEach((btn) => btn.classList.remove("active"));

  const targetSection = document.getElementById(sectionId);
  if (targetSection) targetSection.classList.add("active");

  const activeBtn = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  // Populate dropdowns when switching
  if (sectionId === "section-applications") {
    populateApplicationDropdowns();
  } else if (sectionId === "section-biometrics") {
    populateBiometricDropdowns();
  } else if (sectionId === "section-card") {
    populateCardDropdown();
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ====================================================
// 3. UTILITY FUNCTIONS
// ====================================================
function showAlert(elementId, message, type) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.className = `alert-box alert-${type}`;
  el.innerHTML = message;
  el.style.display = "block";

  if (type === "success") {
    setTimeout(() => {
      if (el.innerHTML === message) {
        el.style.display = "none";
      }
    }, 6000);
  }
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
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

function generateRandomHash(prefix) {
  const chars = "0123456789abcdef";
  let hash = prefix ? prefix + "_" : "";
  for (let i = 0; i < 32; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// ====================================================
// 4. BACKEND CONNECTIVITY CHECK
// ====================================================
function checkBackendHealth() {
  const statusText = document.getElementById("backendStatusText");
  const statusContainer = document.querySelector(".status-indicator");

  if (statusText) statusText.textContent = "Backend: Connecting...";

  if (statusContainer && !statusContainer.dataset.configured) {
    statusContainer.dataset.configured = "true";
    statusContainer.style.cursor = "pointer";
    statusContainer.addEventListener("click", () => {
      const current = localStorage.getItem("API_URL") || API_BASE_URL;
      const custom = prompt("Enter Backend API Base URL (leave blank to restore automatic):", current);
      if (custom !== null) {
        if (custom.trim() === "") {
          localStorage.removeItem("API_URL");
        } else {
          localStorage.setItem("API_URL", custom.trim().replace(/\/+$/, ""));
        }
        window.location.reload();
      }
    });
  }

  fetch(`${API_BASE_URL}/health`)
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "OK") {
        if (statusText) {
          const mode = data.database ? data.database.mode : "connected";
          statusText.textContent = `Backend: Connected (${mode})`;
        }
        if (statusContainer) statusContainer.classList.add("online");
      }
    })
    .catch(() => {
      if (statusText) statusText.textContent = "Backend: Offline / Using Cache";
      if (statusContainer) statusContainer.classList.remove("online");
    });
}

// ====================================================
// 5. TABLE 1: CITIZENS OPERATIONS (SHOW, ADD, UPDATE, REMOVE)
// ====================================================
function loadCitizensTable(showFeedback = true) {
  const tbody = document.getElementById("citizensTableBody");
  const countEl = document.getElementById("countCitizens");

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Loading citizens from database...</td></tr>';
  }

  fetch(`${API_BASE_URL}/citizens`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.citizens)) {
        allCitizens = data.citizens;
        if (countEl) countEl.textContent = allCitizens.length;
        renderCitizensTable(allCitizens);
        populateApplicationDropdowns();
        populateCardDropdown();

        if (showFeedback) {
          showAlert("citizenAlert", `[Refreshed] Loaded ${allCitizens.length} citizen records from database.`, "success");
        }
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No citizen records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load citizens error:", err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell error-text">Failed to fetch citizens from server. Click "Show Data / Refresh" to retry.</td></tr>';
      }
      if (showFeedback) {
        showAlert("citizenAlert", "Failed to connect to backend server.", "error");
      }
    });
}

function renderCitizensTable(list) {
  const tbody = document.getElementById("citizensTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No citizen records match the search criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((c) => {
      return `
        <tr>
          <td><strong>#${c.citizen_id}</strong></td>
          <td><strong>${escapeHtml(c.citizen_name)}</strong></td>
          <td>${formatDate(c.dob)}</td>
          <td><span class="tag-gender">${escapeHtml(c.gender)}</span></td>
          <td><code>${escapeHtml(c.mobile_number)}</code></td>
          <td class="table-actions">
            <button type="button" class="action-btn btn-update" onclick="handleOpenUpdateModal('citizens', ${c.citizen_id})">✏️ Update</button>
            <button type="button" class="action-btn btn-remove" onclick="handleDeleteCitizen(${c.citizen_id}, '${escapeHtml(c.citizen_name).replace(/'/g, "\\'")}')">🗑️ Remove</button>
            <button type="button" class="action-btn btn-card" onclick="handleViewCardForCitizen(${c.citizen_id})">🪪 ID Card</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function setupCitizensOperations() {
  const showBtn = document.getElementById("btnShowCitizens");
  const toggleAddBtn = document.getElementById("toggleAddCitizenBtn");
  const closeAddBtn = document.getElementById("closeAddCitizenBtn");
  const cancelAddBtn = document.getElementById("cancelAddCitizenBtn");
  const addContainer = document.getElementById("addCitizenContainer");
  const form = document.getElementById("registrationform");

  if (showBtn) {
    showBtn.addEventListener("click", () => loadCitizensTable(true));
  }

  if (toggleAddBtn && addContainer) {
    toggleAddBtn.addEventListener("click", () => {
      addContainer.classList.toggle("hidden");
      if (!addContainer.classList.contains("hidden")) {
        document.getElementById("citizenname")?.focus();
      }
    });
  }

  const hideAdd = () => {
    if (addContainer) addContainer.classList.add("hidden");
  };
  if (closeAddBtn) closeAddBtn.addEventListener("click", hideAdd);
  if (cancelAddBtn) cancelAddBtn.addEventListener("click", hideAdd);

  // Add Citizen Submission (POST /api/citizens)
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const name = document.getElementById("citizenname").value.trim();
      const dob = document.getElementById("DOB").value;
      const gender = document.getElementById("gender").value;
      const mobile = document.getElementById("mobile").value.trim();
      const submitBtn = document.getElementById("citizenSubmitBtn");

      if (!name || !dob || !gender || !mobile) {
        showAlert("citizenAlert", "Please fill in all required fields.", "error");
        return;
      }

      if (!/^\d{10}$/.test(mobile)) {
        showAlert("citizenAlert", "Mobile number must be exactly 10 digits.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Inserting Record...";

      fetch(`${API_BASE_URL}/citizens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizen_name: name,
          dob: dob,
          gender: gender,
          mobile_number: mobile
        })
      })
        .then((res) => res.json())
        .then((data) => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Insert Citizen Data";

          if (data.success) {
            showAlert("citizenAlert", `[Success] Inserted Citizen record: <strong>#${data.citizen_id} - ${escapeHtml(name)}</strong>.`, "success");
            form.reset();
            hideAdd();
            loadCitizensTable(false);
          } else {
            const detail = data.error ? ` (${data.error})` : "";
            showAlert("citizenAlert", `[Error] ${data.message || "Failed to insert citizen."}${detail}`, "error");
          }
        })
        .catch((err) => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Insert Citizen Data";
          console.error("Citizen insert error:", err);
          showAlert("citizenAlert", "[Error] Could not connect to backend server.", "error");
        });
    });
  }
}

// Remove Citizen (DELETE /api/citizens/:id)
window.handleDeleteCitizen = function (citizenId, citizenName) {
  const confirmed = confirm(
    `WARNING: Are you sure you want to remove Citizen #${citizenId} ("${citizenName}")?\n\n` +
      `Cascading Rule: All related applications and biometric records for this citizen will also be removed.`
  );

  if (!confirmed) return;

  fetch(`${API_BASE_URL}/citizens/${citizenId}`, {
    method: "DELETE"
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showAlert("citizenAlert", `[Removed] Citizen record #${citizenId} successfully deleted from database.`, "success");
        loadCitizensTable(false);
        loadApplicationsTable(false);
        loadBiometricsTable(false);
      } else {
        showAlert("citizenAlert", `[Error] ${data.message || "Could not delete citizen."}`, "error");
      }
    })
    .catch((err) => {
      console.error("Citizen delete error:", err);
      showAlert("citizenAlert", "[Error] Could not connect to backend server to delete record.", "error");
    });
};

// ====================================================
// 6. TABLE 2: ENROLLMENT CENTER OPERATIONS
// ====================================================
function loadCentersTable(showFeedback = true) {
  const tbody = document.getElementById("centersTableBody");
  const countEl = document.getElementById("countCenters");

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Loading enrollment centers from database...</td></tr>';
  }

  fetch(`${API_BASE_URL}/centers`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.centers)) {
        allCenters = data.centers;
        if (countEl) countEl.textContent = allCenters.length;
        renderCentersTable(allCenters);
        populateApplicationDropdowns();

        if (showFeedback) {
          showAlert("centerAlert", `[Refreshed] Loaded ${allCenters.length} enrollment center records.`, "success");
        }
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No center records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load centers error:", err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell error-text">Failed to fetch centers from server.</td></tr>';
      }
      if (showFeedback) {
        showAlert("centerAlert", "Failed to connect to backend server.", "error");
      }
    });
}

function renderCentersTable(list) {
  const tbody = document.getElementById("centersTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No center records match the search criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((ctr) => {
      return `
        <tr>
          <td><strong>#${ctr.center_id}</strong></td>
          <td><strong>${escapeHtml(ctr.center_name)}</strong></td>
          <td>${escapeHtml(ctr.district)}</td>
          <td>${escapeHtml(ctr.state)}</td>
          <td class="table-actions">
            <button type="button" class="action-btn btn-update" onclick="handleOpenUpdateModal('centers', ${ctr.center_id})">✏️ Update</button>
            <button type="button" class="action-btn btn-remove" onclick="handleDeleteCenter(${ctr.center_id}, '${escapeHtml(ctr.center_name).replace(/'/g, "\\'")}')">🗑️ Remove</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function setupCentersOperations() {
  const showBtn = document.getElementById("btnShowCenters");
  const toggleAddBtn = document.getElementById("toggleAddCenterBtn");
  const closeAddBtn = document.getElementById("closeAddCenterBtn");
  const cancelAddBtn = document.getElementById("cancelAddCenterBtn");
  const addContainer = document.getElementById("addCenterContainer");
  const form = document.getElementById("centerform");

  if (showBtn) {
    showBtn.addEventListener("click", () => loadCentersTable(true));
  }

  if (toggleAddBtn && addContainer) {
    toggleAddBtn.addEventListener("click", () => {
      addContainer.classList.toggle("hidden");
      if (!addContainer.classList.contains("hidden")) {
        document.getElementById("centername")?.focus();
      }
    });
  }

  const hideAdd = () => {
    if (addContainer) addContainer.classList.add("hidden");
  };
  if (closeAddBtn) closeAddBtn.addEventListener("click", hideAdd);
  if (cancelAddBtn) cancelAddBtn.addEventListener("click", hideAdd);

  // Add Center Submission (POST /api/centers)
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const name = document.getElementById("centername").value.trim();
      const district = document.getElementById("district").value.trim();
      const state = document.getElementById("state").value.trim();
      const submitBtn = document.getElementById("centerSubmitBtn");

      if (!name || !district || !state) {
        showAlert("centerAlert", "Please fill in all center details.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Inserting Center...";

      fetch(`${API_BASE_URL}/centers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          center_name: name,
          district: district,
          state: state
        })
      })
        .then((res) => res.json())
        .then((data) => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Insert Center Data";

          if (data.success) {
            showAlert("centerAlert", `[Success] Center record created: <strong>#${data.center_id} - ${escapeHtml(name)}</strong>.`, "success");
            form.reset();
            hideAdd();
            loadCentersTable(false);
          } else {
            const detail = data.error ? ` (${data.error})` : "";
            showAlert("centerAlert", `[Error] ${data.message || "Failed to insert center."}${detail}`, "error");
          }
        })
        .catch((err) => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Insert Center Data";
          console.error("Center insert error:", err);
          showAlert("centerAlert", "[Error] Could not connect to backend server.", "error");
        });
    });
  }
}

// Remove Center (DELETE /api/centers/:id)
window.handleDeleteCenter = function (centerId, centerName) {
  const confirmed = confirm(
    `WARNING: Are you sure you want to remove Enrollment Center #${centerId} ("${centerName}")?\n\n` +
      `Cascading Rule: All related applications and biometric records processed at this center will also be removed.`
  );

  if (!confirmed) return;

  fetch(`${API_BASE_URL}/centers/${centerId}`, {
    method: "DELETE"
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showAlert("centerAlert", `[Removed] Enrollment center #${centerId} deleted successfully.`, "success");
        loadCentersTable(false);
        loadApplicationsTable(false);
        loadBiometricsTable(false);
      } else {
        showAlert("centerAlert", `[Error] ${data.message || "Could not delete center."}`, "error");
      }
    })
    .catch((err) => {
      console.error("Center delete error:", err);
      showAlert("centerAlert", "[Error] Could not connect to backend server.", "error");
    });
};

// ====================================================
// 7. TABLE 3: AADHAAR APPLICATION OPERATIONS
// ====================================================
function populateApplicationDropdowns() {
  const citizenSelect = document.getElementById("appCitizenSelect");
  const centerSelect = document.getElementById("appCenterSelect");

  if (citizenSelect) {
    const curVal = citizenSelect.value;
    let opts = '<option value="">-- Choose Registered Citizen --</option>';
    allCitizens.forEach((c) => {
      opts += `<option value="${c.citizen_id}">#${c.citizen_id} - ${escapeHtml(c.citizen_name)} (${c.mobile_number})</option>`;
    });
    citizenSelect.innerHTML = opts;
    if (curVal) citizenSelect.value = curVal;
  }

  if (centerSelect) {
    const curVal = centerSelect.value;
    let opts = '<option value="">-- Choose Enrollment Center --</option>';
    allCenters.forEach((ctr) => {
      opts += `<option value="${ctr.center_id}">#${ctr.center_id} - ${escapeHtml(ctr.center_name)} (${escapeHtml(ctr.district)})</option>`;
    });
    centerSelect.innerHTML = opts;
    if (curVal) centerSelect.value = curVal;
  }
}

function loadApplicationsTable(showFeedback = true) {
  const tbody = document.getElementById("applicationsTableBody");
  const countEl = document.getElementById("countApps");

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Loading applications from database...</td></tr>';
  }

  fetch(`${API_BASE_URL}/applications`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.applications)) {
        allApplications = data.applications;
        if (countEl) countEl.textContent = allApplications.length;
        renderApplicationsTable(allApplications);
        populateBiometricDropdowns();

        if (showFeedback) {
          showAlert("applicationAlert", `[Refreshed] Loaded ${allApplications.length} application records.`, "success");
        }
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No application records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load applications error:", err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell error-text">Failed to fetch applications from server.</td></tr>';
      }
      if (showFeedback) {
        showAlert("applicationAlert", "Failed to connect to backend server.", "error");
      }
    });
}

function renderApplicationsTable(list) {
  const tbody = document.getElementById("applicationsTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No application records match search criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((app) => {
      const statusClass = `status-${(app.status || "pending").toLowerCase()}`;
      return `
        <tr>
          <td><strong>#${app.application_id}</strong></td>
          <td>
            <strong>${escapeHtml(app.citizen_name || "Citizen #" + app.citizen_id)}</strong>
            <div class="cell-sub">ID: #${app.citizen_id} | Mobile: ${escapeHtml(app.mobile_number || "-")}</div>
          </td>
          <td>
            <strong>${escapeHtml(app.center_name || "Center #" + app.center_id)}</strong>
            <div class="cell-sub">${escapeHtml(app.district || "")}, ${escapeHtml(app.state || "")}</div>
          </td>
          <td>${formatDate(app.application_date)}</td>
          <td><span class="status-badge ${statusClass}">${escapeHtml(app.status || "Pending")}</span></td>
          <td class="table-actions">
            <button type="button" class="action-btn btn-update" onclick="handleOpenUpdateModal('applications', ${app.application_id})">✏️ Update</button>
            <button type="button" class="action-btn btn-remove" onclick="handleDeleteApplication(${app.application_id})">🗑️ Remove</button>
            <button type="button" class="action-btn btn-card" onclick="handleViewCardForCitizen(${app.citizen_id})">🪪 ID Card</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function setupApplicationsOperations() {
  const showBtn = document.getElementById("btnShowApplications");
  const toggleAddBtn = document.getElementById("toggleAddAppBtn");
  const closeAddBtn = document.getElementById("closeAddAppBtn");
  const cancelAddBtn = document.getElementById("cancelAddAppBtn");
  const addContainer = document.getElementById("addAppContainer");
  const form = document.getElementById("applicationForm");

  if (showBtn) {
    showBtn.addEventListener("click", () => loadApplicationsTable(true));
  }

  if (toggleAddBtn && addContainer) {
    toggleAddBtn.addEventListener("click", () => {
      addContainer.classList.toggle("hidden");
      populateApplicationDropdowns();
    });
  }

  const hideAdd = () => {
    if (addContainer) addContainer.classList.add("hidden");
  };
  if (closeAddBtn) closeAddBtn.addEventListener("click", hideAdd);
  if (cancelAddBtn) cancelAddBtn.addEventListener("click", hideAdd);

  // Add Application Submission (POST /api/applications)
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const citizenId = document.getElementById("appCitizenSelect").value;
      const centerId = document.getElementById("appCenterSelect").value;
      const submitBtn = document.getElementById("appSubmitBtn");

      if (!citizenId || !centerId) {
        showAlert("applicationAlert", "Please select both a citizen and an enrollment center.", "error");
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Inserting Application...";

      fetch(`${API_BASE_URL}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          citizen_id: citizenId,
          center_id: centerId
        })
      })
        .then((res) => res.json())
        .then((data) => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Insert Application Data";

          if (data.success) {
            showAlert("applicationAlert", `[Success] Application created: <strong>App ID: #${data.application_id} | Status: ${data.status}</strong>.`, "success");
            form.reset();
            hideAdd();
            loadApplicationsTable(false);
          } else {
            const detail = data.error ? ` (${data.error})` : "";
            showAlert("applicationAlert", `[Error] ${data.message || "Failed to create application."}${detail}`, "error");
          }
        })
        .catch((err) => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Insert Application Data";
          console.error("Application insert error:", err);
          showAlert("applicationAlert", "[Error] Could not connect to backend server.", "error");
        });
    });
  }
}

// Remove Application (DELETE /api/applications/:id)
window.handleDeleteApplication = function (applicationId) {
  const confirmed = confirm(
    `WARNING: Are you sure you want to remove Application #${applicationId}?\n\n` +
      `Cascading Rule: Any associated BiometricRecord will also be removed.`
  );

  if (!confirmed) return;

  fetch(`${API_BASE_URL}/applications/${applicationId}`, {
    method: "DELETE"
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showAlert("applicationAlert", `[Removed] Application #${applicationId} deleted successfully.`, "success");
        loadApplicationsTable(false);
        loadBiometricsTable(false);
      } else {
        showAlert("applicationAlert", `[Error] ${data.message || "Could not delete application."}`, "error");
      }
    })
    .catch((err) => {
      console.error("Application delete error:", err);
      showAlert("applicationAlert", "[Error] Could not connect to backend server.", "error");
    });
};

// ====================================================
// 8. TABLE 4: BIOMETRIC RECORD OPERATIONS
// ====================================================
function populateBiometricDropdowns() {
  const bioAppSelect = document.getElementById("bioAppSelect");
  if (!bioAppSelect) return;

  const curVal = bioAppSelect.value;
  let opts = '<option value="">-- Choose Application ID --</option>';
  allApplications.forEach((app) => {
    opts += `<option value="${app.application_id}">App #${app.application_id} — ${escapeHtml(app.citizen_name || "Citizen #" + app.citizen_id)} (${escapeHtml(app.status)})</option>`;
  });
  bioAppSelect.innerHTML = opts;
  if (curVal) bioAppSelect.value = curVal;
}

function loadBiometricsTable(showFeedback = true) {
  const tbody = document.getElementById("biometricsTableBody");
  const countEl = document.getElementById("countBiometrics");

  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Loading biometric records from database...</td></tr>';
  }

  fetch(`${API_BASE_URL}/biometrics`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.biometrics)) {
        allBiometrics = data.biometrics;
        if (countEl) countEl.textContent = allBiometrics.length;
        renderBiometricsTable(allBiometrics);

        if (showFeedback) {
          showAlert("biometricAlert", `[Refreshed] Loaded ${allBiometrics.length} biometric records.`, "success");
        }
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No biometric records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load biometrics error:", err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-cell error-text">Failed to fetch biometrics from server.</td></tr>';
      }
      if (showFeedback) {
        showAlert("biometricAlert", "Failed to connect to backend server.", "error");
      }
    });
}

function renderBiometricsTable(list) {
  const tbody = document.getElementById("biometricsTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No biometric records match search criteria.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((bio) => {
      return `
        <tr>
          <td><strong>#${bio.biometric_id}</strong></td>
          <td>
            <strong>App #${bio.application_id}</strong>
            <div class="cell-sub">${escapeHtml(bio.citizen_name || "Citizen #" + (bio.citizen_id || ""))}</div>
          </td>
          <td><code>${escapeHtml(bio.fingerprint_hash || "NULL")}</code></td>
          <td><code>${escapeHtml(bio.iris_hash || "NULL")}</code></td>
          <td class="table-actions">
            <button type="button" class="action-btn btn-update" onclick="handleOpenUpdateModal('biometrics', ${bio.biometric_id})">✏️ Update</button>
            <button type="button" class="action-btn btn-remove" onclick="handleDeleteBiometric(${bio.biometric_id})">🗑️ Remove</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function setupBiometricsOperations() {
  const showBtn = document.getElementById("btnShowBiometrics");
  const toggleAddBtn = document.getElementById("toggleAddBioBtn");
  const closeAddBtn = document.getElementById("closeAddBioBtn");
  const cancelAddBtn = document.getElementById("cancelAddBioBtn");
  const addContainer = document.getElementById("addBioContainer");
  const form = document.getElementById("biometricForm");

  if (showBtn) {
    showBtn.addEventListener("click", () => loadBiometricsTable(true));
  }

  if (toggleAddBtn && addContainer) {
    toggleAddBtn.addEventListener("click", () => {
      addContainer.classList.toggle("hidden");
      populateBiometricDropdowns();
      // Pre-fill suggested SHA-256 hashes
      const fpInput = document.getElementById("fingerprintHash");
      const irisInput = document.getElementById("irisHash");
      if (fpInput && !fpInput.value) fpInput.value = generateRandomHash("fp_sha256");
      if (irisInput && !irisInput.value) irisInput.value = generateRandomHash("iris_sha256");
    });
  }

  const hideAdd = () => {
    if (addContainer) addContainer.classList.add("hidden");
  };
  if (closeAddBtn) closeAddBtn.addEventListener("click", hideAdd);
  if (cancelAddBtn) cancelAddBtn.addEventListener("click", hideAdd);

  // Add Biometric Submission (POST /api/biometrics)
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const appId = document.getElementById("bioAppSelect").value;
      let fpHash = document.getElementById("fingerprintHash").value.trim();
      let irisHash = document.getElementById("irisHash").value.trim();
      const submitBtn = document.getElementById("bioSubmitBtn");

      if (!appId) {
        showAlert("biometricAlert", "Please select an Application ID.", "error");
        return;
      }

      if (!fpHash) fpHash = generateRandomHash("fp_sha256");
      if (!irisHash) irisHash = generateRandomHash("iris_sha256");

      submitBtn.disabled = true;
      submitBtn.textContent = "Inserting Biometric...";

      fetch(`${API_BASE_URL}/biometrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: appId,
          fingerprint_hash: fpHash,
          iris_hash: irisHash
        })
      })
        .then((res) => res.json())
        .then((data) => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Insert Biometric Data";

          if (data.success) {
            showAlert("biometricAlert", `[Success] Biometric record created: <strong>ID #${data.biometric_id}</strong> for Application #${appId}.`, "success");
            form.reset();
            hideAdd();
            loadBiometricsTable(false);
          } else {
            const detail = data.error ? ` (${data.error})` : "";
            showAlert("biometricAlert", `[Error] ${data.message || "Failed to insert biometrics."}${detail}`, "error");
          }
        })
        .catch((err) => {
          submitBtn.disabled = false;
          submitBtn.textContent = "Insert Biometric Data";
          console.error("Biometric insert error:", err);
          showAlert("biometricAlert", "[Error] Could not connect to backend server.", "error");
        });
    });
  }
}

// Remove Biometric Record (DELETE /api/biometrics/:id)
window.handleDeleteBiometric = function (biometricId) {
  const confirmed = confirm(`Are you sure you want to remove Biometric Record #${biometricId}?`);
  if (!confirmed) return;

  fetch(`${API_BASE_URL}/biometrics/${biometricId}`, {
    method: "DELETE"
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showAlert("biometricAlert", `[Removed] Biometric record #${biometricId} deleted successfully.`, "success");
        loadBiometricsTable(false);
      } else {
        showAlert("biometricAlert", `[Error] ${data.message || "Could not delete record."}`, "error");
      }
    })
    .catch((err) => {
      console.error("Biometric delete error:", err);
      showAlert("biometricAlert", "[Error] Could not connect to backend server.", "error");
    });
};

// ====================================================
// 9. UNIVERSAL UPDATE RECORD MODAL
// ====================================================
function setupUniversalUpdateModal() {
  const modal = document.getElementById("updateRecordModal");
  const form = document.getElementById("updateRecordForm");
  const closeBtn = document.getElementById("closeUpdateModalBtn");
  const cancelBtn = document.getElementById("cancelUpdateModalBtn");

  const closeModal = () => {
    if (modal) modal.classList.add("hidden");
    const alertEl = document.getElementById("modalUpdateAlert");
    if (alertEl) alertEl.style.display = "none";
  };

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      const target = document.getElementById("updateTableTarget").value;
      const recordId = document.getElementById("updateRecordId").value;
      const saveBtn = document.getElementById("saveUpdateRecordBtn");

      let payload = {};
      let endpoint = `${API_BASE_URL}/${target}/${recordId}`;

      if (target === "citizens") {
        const name = document.getElementById("modalEditName").value.trim();
        const dob = document.getElementById("modalEditDob").value;
        const gender = document.getElementById("modalEditGender").value;
        const mobile = document.getElementById("modalEditMobile").value.trim();

        if (!name || !dob || !gender || !mobile) {
          showAlert("modalUpdateAlert", "Please fill in all fields.", "error");
          return;
        }
        if (!/^\d{10}$/.test(mobile)) {
          showAlert("modalUpdateAlert", "Mobile must be 10 digits.", "error");
          return;
        }

        payload = {
          citizen_name: name,
          dob: dob,
          gender: gender,
          mobile_number: mobile
        };
      } else if (target === "centers") {
        const name = document.getElementById("modalEditCenterName").value.trim();
        const district = document.getElementById("modalEditDistrict").value.trim();
        const state = document.getElementById("modalEditState").value.trim();

        if (!name || !district || !state) {
          showAlert("modalUpdateAlert", "Please fill in all fields.", "error");
          return;
        }

        payload = {
          center_name: name,
          district: district,
          state: state
        };
      } else if (target === "applications") {
        const citizenId = document.getElementById("modalEditAppCitizen").value;
        const centerId = document.getElementById("modalEditAppCenter").value;
        const status = document.getElementById("modalEditAppStatus").value;

        if (!citizenId || !centerId || !status) {
          showAlert("modalUpdateAlert", "Please select all application fields.", "error");
          return;
        }

        payload = {
          citizen_id: citizenId,
          center_id: centerId,
          status: status
        };
      } else if (target === "biometrics") {
        const fpHash = document.getElementById("modalEditFpHash").value.trim();
        const irisHash = document.getElementById("modalEditIrisHash").value.trim();

        if (!fpHash || !irisHash) {
          showAlert("modalUpdateAlert", "Please provide biometric hashes.", "error");
          return;
        }

        payload = {
          fingerprint_hash: fpHash,
          iris_hash: irisHash
        };
      }

      saveBtn.disabled = true;
      saveBtn.textContent = "Saving Changes...";

      fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then((res) => res.json())
        .then((data) => {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Updates";

          if (data.success) {
            closeModal();
            // Refresh corresponding table and show alert
            if (target === "citizens") {
              showAlert("citizenAlert", `[Updated] Citizen record #${recordId} successfully updated.`, "success");
              loadCitizensTable(false);
              loadApplicationsTable(false);
            } else if (target === "centers") {
              showAlert("centerAlert", `[Updated] Center record #${recordId} successfully updated.`, "success");
              loadCentersTable(false);
              loadApplicationsTable(false);
            } else if (target === "applications") {
              showAlert("applicationAlert", `[Updated] Application record #${recordId} successfully updated.`, "success");
              loadApplicationsTable(false);
              loadBiometricsTable(false);
            } else if (target === "biometrics") {
              showAlert("biometricAlert", `[Updated] Biometric record #${recordId} successfully updated.`, "success");
              loadBiometricsTable(false);
            }
          } else {
            showAlert("modalUpdateAlert", `[Error] ${data.message || "Failed to update record."}`, "error");
          }
        })
        .catch((err) => {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save Updates";
          console.error("Update error:", err);
          showAlert("modalUpdateAlert", "[Error] Could not connect to backend server.", "error");
        });
    });
  }
}

window.handleOpenUpdateModal = function (tableName, recordId) {
  const modal = document.getElementById("updateRecordModal");
  const modalTitle = document.getElementById("updateModalTitle");
  const tableTarget = document.getElementById("updateTableTarget");
  const recordIdInput = document.getElementById("updateRecordId");
  const fieldsContainer = document.getElementById("updateFormFieldsContainer");
  const alertEl = document.getElementById("modalUpdateAlert");

  if (!modal || !fieldsContainer) return;

  if (alertEl) alertEl.style.display = "none";
  tableTarget.value = tableName;
  recordIdInput.value = recordId;

  // Build fields dynamically depending on table
  if (tableName === "citizens") {
    const item = allCitizens.find((c) => String(c.citizen_id) === String(recordId));
    if (!item) {
      alert("Citizen record not found in cache.");
      return;
    }

    modalTitle.textContent = `✏️ Update Citizen Record (ID: #${recordId})`;
    const rawDob = item.dob ? item.dob.split("T")[0] : "";

    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label for="modalEditName">Citizen Full Name <span class="required">*</span></label>
        <input type="text" id="modalEditName" value="${escapeHtml(item.citizen_name)}" required maxlength="100">
      </div>
      <div class="form-row">
        <div class="form-group flex-1">
          <label for="modalEditDob">Date of Birth <span class="required">*</span></label>
          <input type="date" id="modalEditDob" value="${rawDob}" required max="${new Date().toISOString().split("T")[0]}">
        </div>
        <div class="form-group flex-1">
          <label for="modalEditGender">Gender <span class="required">*</span></label>
          <select id="modalEditGender" required>
            <option value="Male" ${item.gender === "Male" ? "selected" : ""}>Male</option>
            <option value="Female" ${item.gender === "Female" ? "selected" : ""}>Female</option>
            <option value="Others" ${item.gender === "Others" ? "selected" : ""}>Others</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label for="modalEditMobile">Mobile Number (10 digits) <span class="required">*</span></label>
        <input type="tel" id="modalEditMobile" value="${escapeHtml(item.mobile_number)}" required pattern="[0-9]{10}" maxlength="10">
      </div>
    `;
  } else if (tableName === "centers") {
    const item = allCenters.find((c) => String(c.center_id) === String(recordId));
    if (!item) {
      alert("Center record not found in cache.");
      return;
    }

    modalTitle.textContent = `✏️ Update Enrollment Center (ID: #${recordId})`;
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label for="modalEditCenterName">Center Name <span class="required">*</span></label>
        <input type="text" id="modalEditCenterName" value="${escapeHtml(item.center_name)}" required maxlength="60">
      </div>
      <div class="form-row">
        <div class="form-group flex-1">
          <label for="modalEditDistrict">District <span class="required">*</span></label>
          <input type="text" id="modalEditDistrict" value="${escapeHtml(item.district)}" required maxlength="60">
        </div>
        <div class="form-group flex-1">
          <label for="modalEditState">State <span class="required">*</span></label>
          <input type="text" id="modalEditState" value="${escapeHtml(item.state)}" required maxlength="60">
        </div>
      </div>
    `;
  } else if (tableName === "applications") {
    const item = allApplications.find((a) => String(a.application_id) === String(recordId));
    if (!item) {
      alert("Application record not found in cache.");
      return;
    }

    modalTitle.textContent = `✏️ Update Application (ID: #${recordId})`;

    let citOptions = "";
    allCitizens.forEach((c) => {
      const sel = String(c.citizen_id) === String(item.citizen_id) ? "selected" : "";
      citOptions += `<option value="${c.citizen_id}" ${sel}>#${c.citizen_id} - ${escapeHtml(c.citizen_name)} (${c.mobile_number})</option>`;
    });

    let ctrOptions = "";
    allCenters.forEach((ctr) => {
      const sel = String(ctr.center_id) === String(item.center_id) ? "selected" : "";
      ctrOptions += `<option value="${ctr.center_id}" ${sel}>#${ctr.center_id} - ${escapeHtml(ctr.center_name)} (${escapeHtml(ctr.district)})</option>`;
    });

    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label for="modalEditAppCitizen">Citizen (FK) <span class="required">*</span></label>
        <select id="modalEditAppCitizen" required>${citOptions}</select>
      </div>
      <div class="form-group">
        <label for="modalEditAppCenter">Enrollment Center (FK) <span class="required">*</span></label>
        <select id="modalEditAppCenter" required>${ctrOptions}</select>
      </div>
      <div class="form-group">
        <label for="modalEditAppStatus">Application Status <span class="required">*</span></label>
        <select id="modalEditAppStatus" required>
          <option value="Pending" ${item.status === "Pending" ? "selected" : ""}>Pending</option>
          <option value="Approved" ${item.status === "Approved" ? "selected" : ""}>Approved</option>
          <option value="Rejected" ${item.status === "Rejected" ? "selected" : ""}>Rejected</option>
        </select>
      </div>
    `;
  } else if (tableName === "biometrics") {
    const item = allBiometrics.find((b) => String(b.biometric_id) === String(recordId));
    if (!item) {
      alert("Biometric record not found in cache.");
      return;
    }

    modalTitle.textContent = `✏️ Update Biometric Record (ID: #${recordId})`;
    fieldsContainer.innerHTML = `
      <div class="form-group">
        <label>Application ID (FK)</label>
        <input type="text" value="Application #${item.application_id}" disabled>
      </div>
      <div class="form-group">
        <label for="modalEditFpHash">Fingerprint Hash <span class="required">*</span></label>
        <input type="text" id="modalEditFpHash" value="${escapeHtml(item.fingerprint_hash || "")}" required>
      </div>
      <div class="form-group">
        <label for="modalEditIrisHash">Iris Scan Hash <span class="required">*</span></label>
        <input type="text" id="modalEditIrisHash" value="${escapeHtml(item.iris_hash || "")}" required>
      </div>
    `;
  }

  modal.classList.remove("hidden");
};

// ====================================================
// 10. REAL-TIME SEARCH FILTERS
// ====================================================
function setupSearchFilters() {
  const searchCitizens = document.getElementById("searchCitizens");
  if (searchCitizens) {
    searchCitizens.addEventListener("input", function () {
      const q = this.value.toLowerCase().trim();
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

  const searchCenters = document.getElementById("searchCenters");
  if (searchCenters) {
    searchCenters.addEventListener("input", function () {
      const q = this.value.toLowerCase().trim();
      if (!q) {
        renderCentersTable(allCenters);
        return;
      }
      const filtered = allCenters.filter((ctr) => {
        return (
          String(ctr.center_id).includes(q) ||
          (ctr.center_name && ctr.center_name.toLowerCase().includes(q)) ||
          (ctr.district && ctr.district.toLowerCase().includes(q)) ||
          (ctr.state && ctr.state.toLowerCase().includes(q))
        );
      });
      renderCentersTable(filtered);
    });
  }

  const searchApps = document.getElementById("searchApplications");
  if (searchApps) {
    searchApps.addEventListener("input", function () {
      const q = this.value.toLowerCase().trim();
      if (!q) {
        renderApplicationsTable(allApplications);
        return;
      }
      const filtered = allApplications.filter((app) => {
        return (
          String(app.application_id).includes(q) ||
          (app.citizen_name && app.citizen_name.toLowerCase().includes(q)) ||
          (app.center_name && app.center_name.toLowerCase().includes(q)) ||
          (app.status && app.status.toLowerCase().includes(q)) ||
          (app.mobile_number && app.mobile_number.includes(q))
        );
      });
      renderApplicationsTable(filtered);
    });
  }

  const searchBio = document.getElementById("searchBiometrics");
  if (searchBio) {
    searchBio.addEventListener("input", function () {
      const q = this.value.toLowerCase().trim();
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
// 11. IDENTITY PROOF CARD PREVIEW & DOWNLOAD
// ====================================================
function populateCardDropdown() {
  const select = document.getElementById("cardCitizenSelect");
  if (!select) return;

  const curVal = select.value;
  let opts = '<option value="">-- Select Citizen to Generate Card --</option>';
  allCitizens.forEach((c) => {
    opts += `<option value="${c.citizen_id}">#${c.citizen_id} - ${escapeHtml(c.citizen_name)} (${c.mobile_number})</option>`;
  });
  select.innerHTML = opts;
  if (curVal) select.value = curVal;
}

function generateAadhaarNumber(citizenId, mobile) {
  const seed = (String(citizenId).padStart(4, "0") + String(mobile || "9999999999")).replace(/\D/g, "");
  const part1 = "2" + (seed.slice(1, 4) || "489");
  const part2 = "7" + (seed.slice(4, 7) || "132");
  const part3 = String(citizenId).padStart(4, "0");
  return `${part1.padEnd(4, "0")} ${part2.padEnd(4, "0")} ${part3}`;
}

function updateAadhaarCardUI(citizen, centerName) {
  currentCardCitizen = citizen;

  const nameEl = document.getElementById("cardCitizenName");
  const dobEl = document.getElementById("cardDOB");
  const genderEl = document.getElementById("cardGender");
  const mobileEl = document.getElementById("cardMobile");
  const centerEl = document.getElementById("cardCenter");
  const numEl = document.getElementById("cardAadhaarNumber");

  if (nameEl) nameEl.textContent = citizen.citizen_name;
  if (dobEl) dobEl.textContent = formatDate(citizen.dob);
  if (genderEl) genderEl.textContent = citizen.gender;
  if (mobileEl) mobileEl.textContent = `XXXXXX${(citizen.mobile_number || "0000").slice(-4)}`;
  if (centerEl) centerEl.textContent = centerName || "Central UIDAI Kendra, District";

  const aadhaarNum = generateAadhaarNumber(citizen.citizen_id, citizen.mobile_number);
  if (numEl) numEl.textContent = aadhaarNum;
}

function displayCitizenCard(citizenId) {
  if (!citizenId) return;

  const citizen = allCitizens.find((c) => String(c.citizen_id) === String(citizenId));
  if (!citizen) {
    showAlert("cardAlert", `Citizen #${citizenId} not found in database records.`, "error");
    return;
  }

  const app = allApplications.find((a) => String(a.citizen_id) === String(citizenId));
  const centerName = app ? `${app.center_name} (${app.district})` : "Central UIDAI Kendra";

  updateAadhaarCardUI(citizen, centerName);
  showAlert("cardAlert", `[Generated] Identity Card generated for <strong>${escapeHtml(citizen.citizen_name)}</strong> (#${citizen.citizen_id}).`, "success");
}

window.handleViewCardForCitizen = function (citizenId) {
  switchSection("section-card");
  const select = document.getElementById("cardCitizenSelect");
  if (select) select.value = citizenId;
  displayCitizenCard(citizenId);
};

function setupCardGenerator() {
  const select = document.getElementById("cardCitizenSelect");
  if (select) {
    select.addEventListener("change", function () {
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

  // Print Card
  const printBtn = document.getElementById("printCardBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }

  // Download Card as PNG
  const downloadBtn = document.getElementById("downloadCardPngBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", downloadAadhaarCardPng);
  }
}

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

  // Card Outer Border & Background
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2.5;
  roundRect(ctx, 15, 15, 970, 600, 12, true, true);

  // Top Rule
  ctx.fillStyle = "#000000";
  ctx.fillRect(15, 15, 970, 6);

  // Header Divider
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(15, 115);
  ctx.lineTo(985, 115);
  ctx.stroke();

  // Ashoka Chakra Emblem Simulation
  ctx.save();
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(68, 68, 28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(68, 68, 8, 0, Math.PI * 2);
  ctx.fillStyle = "#000000";
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
  ctx.fillStyle = "#000000";
  ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("भारत सरकार", 500, 52);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 15px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("GOVERNMENT OF INDIA", 500, 74);

  ctx.fillStyle = "#333333";
  ctx.font = "bold 12px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("भारतीय विशिष्ट पहचान प्राधिकरण | UIDAI", 500, 95);

  // Sun Logo
  ctx.fillStyle = "#000000";
  ctx.font = "bold 18px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("आधार", 920, 80);
  ctx.font = "24px Arial";
  ctx.fillText("☀️", 920, 52);

  // Photo Frame
  ctx.fillStyle = "#f7f7f7";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 50, 140, 170, 215, 4, true, true);

  // Silhouette Avatar
  ctx.save();
  ctx.beginPath();
  ctx.arc(135, 215, 42, 0, Math.PI * 2);
  ctx.fillStyle = "#cccccc";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(135, 335, 80, Math.PI * 1.25, Math.PI * 1.75);
  ctx.lineTo(210, 350);
  ctx.lineTo(60, 350);
  ctx.fillStyle = "#aaaaaa";
  ctx.fill();
  ctx.restore();

  // Verified Badge
  ctx.fillStyle = "#000000";
  ctx.fillRect(50, 325, 170, 30);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("✓ VERIFIED IDENTITY", 135, 345);

  // Citizen Demographic Details
  ctx.textAlign = "left";
  ctx.fillStyle = "#000000";
  ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(citizen.citizen_name || "Citizen Full Name", 255, 175);

  ctx.fillStyle = "#333333";
  ctx.font = "16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("जन्म तिथि / DOB :", 255, 215);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(citizen.dob ? formatDate(citizen.dob) : "01/01/2000", 410, 215);

  ctx.fillStyle = "#333333";
  ctx.font = "16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("लिंग / Gender :", 255, 250);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(citizen.gender || "Citizen", 410, 250);

  ctx.fillStyle = "#333333";
  ctx.font = "16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("मोबाइल / Mobile :", 255, 285);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.fillText(`+91 XXXXXX${(citizen.mobile_number || "0000").slice(-4)}`, 410, 285);

  ctx.fillStyle = "#333333";
  ctx.font = "16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("केंद्र / Center :", 255, 320);
  ctx.fillStyle = "#000000";
  ctx.font = "14px 'Segoe UI', Arial, sans-serif";
  ctx.fillText(centerText, 410, 320);

  // Simulated QR Code
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 770, 140, 175, 175, 4, true, true);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if ((r + c * 3 + citizen.citizen_id) % 3 !== 0) {
        ctx.fillStyle = "#000000";
        ctx.fillRect(785 + c * 18, 155 + r * 18, 14, 14);
      }
    }
  }

  // Large Aadhaar Number Box
  ctx.fillStyle = "#f5f5f5";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 35, 415, 930, 110, 8, true, true);

  ctx.fillStyle = "#555555";
  ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("आपका आधार क्रमांक / Your Aadhaar No. :", 500, 445);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 32px 'Courier New', Courier, monospace";
  ctx.fillText(aadhaarNumber, 500, 490);

  // Footer Slogan
  ctx.strokeStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(35, 545);
  ctx.lineTo(965, 545);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.fillStyle = "#000000";
  ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("मेरा आधार, मेरी पहचान", 50, 580);

  ctx.textAlign = "center";
  ctx.fillStyle = "#333333";
  ctx.font = "bold 13px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("My Aadhaar, My Identity", 500, 580);

  ctx.textAlign = "right";
  ctx.fillStyle = "#666666";
  ctx.font = "12px 'Segoe UI', Arial, sans-serif";
  ctx.fillText("[DBMS Laboratory Project — Academic Evaluation]", 950, 580);

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
// 12. ACADEMIC CREDITS (TEACHER & 5 STUDENT MEMBERS)
// ====================================================
const DEFAULT_CREDITS = {
  teacherName: "Prof. Faculty Guide",
  teacherDept: "Department of Computer Science & Engineering",
  students: [
    { name: "Student Member 1", scholar: "SCH-001" },
    { name: "Student Member 2", scholar: "SCH-002" },
    { name: "Student Member 3", scholar: "SCH-003" },
    { name: "Student Member 4", scholar: "SCH-004" },
    { name: "Student Member 5", scholar: "SCH-005" }
  ]
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
  const footerTeacherEl = document.getElementById("footerTeacherName");
  const footerTeamEl = document.getElementById("footerTeamNames");
  const gridEl = document.getElementById("homeStudentsGrid");
  const countBadge = document.getElementById("teamCountBadge");

  if (teacherNameEl) teacherNameEl.textContent = credits.teacherName;
  if (teacherDeptEl) teacherDeptEl.textContent = credits.teacherDept;
  if (footerTeacherEl) footerTeacherEl.textContent = credits.teacherName;

  if (gridEl) {
    gridEl.innerHTML = credits.students
      .map((s, index) => {
        return `
          <div class="student-profile-item">
            <div class="student-avatar-badge">${index + 1}</div>
            <div class="student-details">
              <strong class="student-name">${escapeHtml(s.name || `Student ${index + 1}`)}</strong>
              <span class="scholar-pill">Scholar No: ${escapeHtml(s.scholar || "-")}</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  const activeNames = credits.students.filter((s) => s.name && s.name.trim()).map((s) => s.name.trim());
  if (countBadge) countBadge.textContent = `${activeNames.length || 5} Members`;
  if (footerTeamEl) footerTeamEl.textContent = activeNames.slice(0, 3).join(", ") + (activeNames.length > 3 ? " & more" : "");
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

      const updated = {
        teacherName,
        teacherDept,
        students
      };

      saveAcademicCredits(updated);
      loadAcademicCredits();
      closeModal();
    });
  }
}
