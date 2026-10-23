// ====================================================
// Aadhaar Enrollment System — Frontend JavaScript
// Matching College DBMS Reference System (Traffic Challan Architecture)
// Enhanced Robust CRUD & Edit Handler
// ====================================================

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

let API_BASE_URL = getApiBaseUrl();

// Global caches for dropdowns and cross-table references
let allCitizens = [];
let allCenters = [];
let allApplications = [];
let allBiometrics = [];

// ====================================================
// 1. INITIALIZATION & ROUTING
// ====================================================
document.addEventListener("DOMContentLoaded", function () {
  checkBackendHealth();
  setupRouting();
  setupAllForms();
  loadAcademicCredits();
  setupAcademicCreditsModal();

  // Restrict DOB to today or earlier
  const today = new Date().toISOString().split("T")[0];
  const dob = document.getElementById("citizenDob");
  if (dob) dob.setAttribute("max", today);
  const editDob = document.getElementById("editCitizenDob");
  if (editDob) editDob.setAttribute("max", today);

  // Load all foundational data
  loadAllData();
});

// Check URL query parameters and switch views
function setupRouting() {
  window.addEventListener("popstate", function () {
    routeByUrl();
  });

  // Handle table link clicks on Dashboard
  document.querySelectorAll(".table-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const section = this.getAttribute("data-section");
      navigateToSection(section);
    });
  });

  // Handle back link clicks
  document.querySelectorAll(".back-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      navigateToSection("");
    });
  });

  // Initial routing
  routeByUrl();
}

function routeByUrl() {
  const params = new URLSearchParams(window.location.search);
  const section = params.get("section");

  if (section && document.getElementById(`view-${section}`)) {
    showView(`view-${section}`);
  } else {
    showView("view-dashboard");
  }
}

function navigateToSection(section) {
  const newUrl = section ? `?section=${section}` : window.location.pathname;
  window.history.pushState({ section }, "", newUrl);

  if (section && document.getElementById(`view-${section}`)) {
    showView(`view-${section}`);
  } else {
    showView("view-dashboard");
  }
}

function showView(viewId) {
  document.querySelectorAll(".page-view").forEach((v) => v.classList.remove("active"));
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add("active");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Accordion toggle helper
window.toggleAccordion = function (accordionId) {
  const item = document.getElementById(accordionId);
  if (!item) return;

  const isOpen = item.classList.contains("open");
  const indicator = item.querySelector(".acc-indicator");

  if (isOpen) {
    item.classList.remove("open");
    if (indicator) {
      indicator.textContent = "+";
    }
  } else {
    item.classList.add("open");
    if (indicator) {
      indicator.textContent = "-";
    }
  }
};

// ====================================================
// 2. DATA LOADERS & RENDERERS
// ====================================================
function loadAllData() {
  loadCitizensTable();
  loadCentersTable();
  loadApplicationsTable();
  loadBiometricsTable();
}

function showAlert(elementId, message, type) {
  const el = document.getElementById(elementId);
  if (!el) return;

  el.className = `ref-alert ${type}`;
  el.innerHTML = message;
  el.style.display = "block";
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });

  setTimeout(() => {
    if (el.innerHTML === message) {
      el.style.display = "none";
    }
  }, 5000);
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
  if (!dateStr) return "";
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

function generateRandomHash(prefix) {
  const chars = "0123456789abcdef";
  let hash = prefix ? prefix + "_" : "";
  for (let i = 0; i < 28; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// ----------------------------------------------------
// TABLE 1: CITIZENS
// ----------------------------------------------------
function loadCitizensTable(preservedEditId) {
  const tbody = document.getElementById("citizensTableBody");

  fetch(`${API_BASE_URL}/citizens`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.citizens)) {
        allCitizens = data.citizens;
        renderCitizensTable(allCitizens);
        populateCitizenDropdowns(preservedEditId);
        populateApplicationDropdowns();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No citizen records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load citizens error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Failed to connect to backend server.</td></tr>';
    });
}

function renderCitizensTable(list) {
  const tbody = document.getElementById("citizensTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No records found.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((c) => {
      return `
        <tr>
          <td>${c.citizen_id}</td>
          <td>${escapeHtml(c.citizen_name)}</td>
          <td>${formatDate(c.dob)}</td>
          <td>${escapeHtml(c.gender)}</td>
          <td>${escapeHtml(c.mobile_number)}</td>
          <td class="table-actions-cell">
            <button type="button" class="btn-action-edit" onclick="quickEditCitizen(${c.citizen_id})">✏ Edit</button>
            <button type="button" class="btn-action-delete" onclick="quickDeleteCitizen(${c.citizen_id})">🗑 Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populateCitizenDropdowns(preservedEditId) {
  const delSelect = document.getElementById("deleteCitizenSelect");
  const editSelect = document.getElementById("editCitizenSelect");

  const currentDel = delSelect ? delSelect.value : "";
  const currentEdit = preservedEditId !== undefined ? String(preservedEditId) : (editSelect ? editSelect.value : "");

  let delOpts = '<option value="">-- Select citizen --</option>';
  let editOpts = '<option value="">-- Choose citizen --</option>';

  allCitizens.forEach((c) => {
    const text = `${c.citizen_id} - ${escapeHtml(c.citizen_name)} (${c.mobile_number})`;
    delOpts += `<option value="${c.citizen_id}">${text}</option>`;
    editOpts += `<option value="${c.citizen_id}">${text}</option>`;
  });

  if (delSelect) {
    delSelect.innerHTML = delOpts;
    if (currentDel) delSelect.value = currentDel;
  }
  if (editSelect) {
    editSelect.innerHTML = editOpts;
    if (currentEdit) {
      editSelect.value = currentEdit;
      populateEditCitizenForm(currentEdit);
    }
  }
}

function populateEditCitizenForm(citizenId) {
  const citizen = allCitizens.find((c) => String(c.citizen_id) === String(citizenId));
  if (!citizen) return;

  const nameInput = document.getElementById("editCitizenName");
  const dobInput = document.getElementById("editCitizenDob");
  const genderInput = document.getElementById("editCitizenGender");
  const mobileInput = document.getElementById("editCitizenMobile");

  if (nameInput) nameInput.value = citizen.citizen_name || "";
  if (dobInput) dobInput.value = formatDate(citizen.dob);
  if (genderInput) genderInput.value = citizen.gender || "Male";
  if (mobileInput) mobileInput.value = citizen.mobile_number || "";
}

window.quickEditCitizen = function (citizenId) {
  const acc = document.getElementById("acc-edit-citizen");
  if (acc && !acc.classList.contains("open")) {
    window.toggleAccordion("acc-edit-citizen");
  }

  const select = document.getElementById("editCitizenSelect");
  if (select) {
    select.value = String(citizenId);
  }

  populateEditCitizenForm(citizenId);

  if (acc) {
    acc.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const nameInput = document.getElementById("editCitizenName");
  if (nameInput) nameInput.focus();
};

window.quickDeleteCitizen = function (citizenId) {
  const citizen = allCitizens.find((c) => String(c.citizen_id) === String(citizenId));
  const name = citizen ? citizen.citizen_name : `#${citizenId}`;

  if (!confirm(`Are you sure you want to delete Citizen #${citizenId} (${name})?\n\nWarning: Any related applications and biometric records will also be removed.`)) {
    return;
  }

  fetch(`${API_BASE_URL}/citizens/${citizenId}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showAlert("citizenAlert", `Citizen #${citizenId} deleted successfully.`, "success");
        loadCitizensTable();
        loadApplicationsTable();
        loadBiometricsTable();
      } else {
        showAlert("citizenAlert", `Error: ${data.message || "Could not delete."}`, "error");
      }
    })
    .catch(() => showAlert("citizenAlert", "Failed to connect to backend server.", "error"));
};

// ----------------------------------------------------
// TABLE 2: ENROLLMENT CENTERS
// ----------------------------------------------------
function loadCentersTable(preservedEditId) {
  const tbody = document.getElementById("centersTableBody");

  fetch(`${API_BASE_URL}/centers`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.centers)) {
        allCenters = data.centers;
        renderCentersTable(allCenters);
        populateCenterDropdowns(preservedEditId);
        populateApplicationDropdowns();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No center records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load centers error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Failed to connect to backend server.</td></tr>';
    });
}

function renderCentersTable(list) {
  const tbody = document.getElementById("centersTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No records found.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((ctr) => {
      return `
        <tr>
          <td>${ctr.center_id}</td>
          <td>${escapeHtml(ctr.center_name)}</td>
          <td>${escapeHtml(ctr.district)}</td>
          <td>${escapeHtml(ctr.state)}</td>
          <td class="table-actions-cell">
            <button type="button" class="btn-action-edit" onclick="quickEditCenter(${ctr.center_id})">✏ Edit</button>
            <button type="button" class="btn-action-delete" onclick="quickDeleteCenter(${ctr.center_id})">🗑 Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populateCenterDropdowns(preservedEditId) {
  const delSelect = document.getElementById("deleteCenterSelect");
  const editSelect = document.getElementById("editCenterSelect");

  const currentDel = delSelect ? delSelect.value : "";
  const currentEdit = preservedEditId !== undefined ? String(preservedEditId) : (editSelect ? editSelect.value : "");

  let delOpts = '<option value="">-- Select center --</option>';
  let editOpts = '<option value="">-- Choose center --</option>';

  allCenters.forEach((ctr) => {
    const text = `${ctr.center_id} - ${escapeHtml(ctr.center_name)} (${escapeHtml(ctr.district)})`;
    delOpts += `<option value="${ctr.center_id}">${text}</option>`;
    editOpts += `<option value="${ctr.center_id}">${text}</option>`;
  });

  if (delSelect) {
    delSelect.innerHTML = delOpts;
    if (currentDel) delSelect.value = currentDel;
  }
  if (editSelect) {
    editSelect.innerHTML = editOpts;
    if (currentEdit) {
      editSelect.value = currentEdit;
      populateEditCenterForm(currentEdit);
    }
  }
}

function populateEditCenterForm(centerId) {
  const ctr = allCenters.find((c) => String(c.center_id) === String(centerId));
  if (!ctr) return;

  const nameInput = document.getElementById("editCenterName");
  const districtInput = document.getElementById("editCenterDistrict");
  const stateInput = document.getElementById("editCenterState");

  if (nameInput) nameInput.value = ctr.center_name || "";
  if (districtInput) districtInput.value = ctr.district || "";
  if (stateInput) stateInput.value = ctr.state || "";
}

window.quickEditCenter = function (centerId) {
  const acc = document.getElementById("acc-edit-center");
  if (acc && !acc.classList.contains("open")) {
    window.toggleAccordion("acc-edit-center");
  }

  const select = document.getElementById("editCenterSelect");
  if (select) {
    select.value = String(centerId);
  }

  populateEditCenterForm(centerId);

  if (acc) {
    acc.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const nameInput = document.getElementById("editCenterName");
  if (nameInput) nameInput.focus();
};

window.quickDeleteCenter = function (centerId) {
  const ctr = allCenters.find((c) => String(c.center_id) === String(centerId));
  const name = ctr ? ctr.center_name : `#${centerId}`;

  if (!confirm(`Are you sure you want to delete Center #${centerId} (${name})?`)) {
    return;
  }

  fetch(`${API_BASE_URL}/centers/${centerId}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showAlert("centerAlert", `Center #${centerId} deleted successfully.`, "success");
        loadCentersTable();
        loadApplicationsTable();
      } else {
        showAlert("centerAlert", `Error: ${data.message || "Could not delete center."}`, "error");
      }
    })
    .catch(() => showAlert("centerAlert", "Failed to connect to backend server.", "error"));
};

// ----------------------------------------------------
// TABLE 3: AADHAAR APPLICATIONS
// ----------------------------------------------------
function loadApplicationsTable(preservedEditId) {
  const tbody = document.getElementById("applicationsTableBody");

  fetch(`${API_BASE_URL}/applications`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.applications)) {
        allApplications = data.applications;
        renderApplicationsTable(allApplications);
        populateApplicationDropdowns(preservedEditId);
        populateBiometricDropdowns();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No application records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load applications error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">Failed to connect to backend server.</td></tr>';
    });
}

function renderApplicationsTable(list) {
  const tbody = document.getElementById("applicationsTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No records found.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((app) => {
      return `
        <tr>
          <td>${app.application_id}</td>
          <td>${escapeHtml(app.citizen_name || "Citizen #" + app.citizen_id)}</td>
          <td>${escapeHtml(app.center_name || "Center #" + app.center_id)}</td>
          <td>${formatDate(app.application_date)}</td>
          <td><strong>${escapeHtml(app.status || "Pending")}</strong></td>
          <td class="table-actions-cell">
            <button type="button" class="btn-action-edit" onclick="quickEditApplication(${app.application_id})">✏ Edit</button>
            <button type="button" class="btn-action-delete" onclick="quickDeleteApplication(${app.application_id})">🗑 Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populateApplicationDropdowns(preservedEditId) {
  const addCit = document.getElementById("appCitizenSelect");
  const addCtr = document.getElementById("appCenterSelect");
  const editCit = document.getElementById("editAppCitizen");
  const editCtr = document.getElementById("editAppCenter");
  const delApp = document.getElementById("deleteAppSelect");
  const editApp = document.getElementById("editAppSelect");

  const currentDel = delApp ? delApp.value : "";
  const currentEdit = preservedEditId !== undefined ? String(preservedEditId) : (editApp ? editApp.value : "");

  // Citizen options
  let citOpts = '<option value="">-- Select citizen --</option>';
  allCitizens.forEach((c) => {
    citOpts += `<option value="${c.citizen_id}">${c.citizen_id} - ${escapeHtml(c.citizen_name)}</option>`;
  });
  if (addCit) addCit.innerHTML = citOpts;
  if (editCit) editCit.innerHTML = citOpts;

  // Center options
  let ctrOpts = '<option value="">-- Select center --</option>';
  allCenters.forEach((ctr) => {
    ctrOpts += `<option value="${ctr.center_id}">${ctr.center_id} - ${escapeHtml(ctr.center_name)}</option>`;
  });
  if (addCtr) addCtr.innerHTML = ctrOpts;
  if (editCtr) editCtr.innerHTML = ctrOpts;

  // Application options
  let appDelOpts = '<option value="">-- Select application --</option>';
  let appEditOpts = '<option value="">-- Choose application --</option>';
  allApplications.forEach((app) => {
    const text = `App #${app.application_id} - ${escapeHtml(app.citizen_name || "Citizen #" + app.citizen_id)} (${app.status})`;
    appDelOpts += `<option value="${app.application_id}">${text}</option>`;
    appEditOpts += `<option value="${app.application_id}">${text}</option>`;
  });

  if (delApp) {
    delApp.innerHTML = appDelOpts;
    if (currentDel) delApp.value = currentDel;
  }
  if (editApp) {
    editApp.innerHTML = appEditOpts;
    if (currentEdit) {
      editApp.value = currentEdit;
      populateEditApplicationForm(currentEdit);
    }
  }
}

function populateEditApplicationForm(appId) {
  const app = allApplications.find((a) => String(a.application_id) === String(appId));
  if (!app) return;

  const citSelect = document.getElementById("editAppCitizen");
  const ctrSelect = document.getElementById("editAppCenter");
  const statusSelect = document.getElementById("editAppStatus");

  if (citSelect) citSelect.value = String(app.citizen_id);
  if (ctrSelect) ctrSelect.value = String(app.center_id);
  if (statusSelect) {
    statusSelect.value = app.status || "Pending";
  }
}

window.quickEditApplication = function (appId) {
  const acc = document.getElementById("acc-edit-app");
  if (acc && !acc.classList.contains("open")) {
    window.toggleAccordion("acc-edit-app");
  }

  const select = document.getElementById("editAppSelect");
  if (select) {
    select.value = String(appId);
  }

  populateEditApplicationForm(appId);

  if (acc) {
    acc.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
};

window.quickDeleteApplication = function (appId) {
  if (!confirm(`Are you sure you want to delete Application #${appId}? Any associated biometrics will also be deleted.`)) {
    return;
  }

  fetch(`${API_BASE_URL}/applications/${appId}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showAlert("applicationAlert", `Application #${appId} deleted successfully.`, "success");
        loadApplicationsTable();
        loadBiometricsTable();
      } else {
        showAlert("applicationAlert", `Error: ${data.message || "Could not delete application."}`, "error");
      }
    })
    .catch(() => showAlert("applicationAlert", "Failed to connect to backend server.", "error"));
};

// ----------------------------------------------------
// TABLE 4: BIOMETRIC RECORDS
// ----------------------------------------------------
function loadBiometricsTable(preservedEditId) {
  const tbody = document.getElementById("biometricsTableBody");

  fetch(`${API_BASE_URL}/biometrics`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.biometrics)) {
        allBiometrics = data.biometrics;
        renderBiometricsTable(allBiometrics);
        populateBiometricDropdowns(preservedEditId);
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No biometric records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load biometrics error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Failed to connect to backend server.</td></tr>';
    });
}

function renderBiometricsTable(list) {
  const tbody = document.getElementById("biometricsTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No records found.</td></tr>';
    return;
  }

  tbody.innerHTML = list
    .map((b) => {
      return `
        <tr>
          <td>${b.biometric_id}</td>
          <td>App #${b.application_id}</td>
          <td><code style="font-size:12px;">${escapeHtml(b.fingerprint_hash || "-")}</code></td>
          <td><code style="font-size:12px;">${escapeHtml(b.iris_hash || "-")}</code></td>
          <td class="table-actions-cell">
            <button type="button" class="btn-action-edit" onclick="quickEditBiometric(${b.biometric_id})">✏ Edit</button>
            <button type="button" class="btn-action-delete" onclick="quickDeleteBiometric(${b.biometric_id})">🗑 Delete</button>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populateBiometricDropdowns(preservedEditId) {
  const bioAppSelect = document.getElementById("bioAppSelect");
  const delBioSelect = document.getElementById("deleteBioSelect");
  const editBioSelect = document.getElementById("editBioSelect");

  const currentDel = delBioSelect ? delBioSelect.value : "";
  const currentEdit = preservedEditId !== undefined ? String(preservedEditId) : (editBioSelect ? editBioSelect.value : "");

  let appOpts = '<option value="">-- Select application --</option>';
  allApplications.forEach((app) => {
    appOpts += `<option value="${app.application_id}">App #${app.application_id} - ${escapeHtml(app.citizen_name || "Citizen #" + app.citizen_id)}</option>`;
  });
  if (bioAppSelect) bioAppSelect.innerHTML = appOpts;

  let delOpts = '<option value="">-- Select biometric record --</option>';
  let editOpts = '<option value="">-- Choose record --</option>';
  allBiometrics.forEach((b) => {
    const text = `Record #${b.biometric_id} (App #${b.application_id})`;
    delOpts += `<option value="${b.biometric_id}">${text}</option>`;
    editOpts += `<option value="${b.biometric_id}">${text}</option>`;
  });

  if (delBioSelect) {
    delBioSelect.innerHTML = delOpts;
    if (currentDel) delBioSelect.value = currentDel;
  }
  if (editBioSelect) {
    editBioSelect.innerHTML = editOpts;
    if (currentEdit) {
      editBioSelect.value = currentEdit;
      populateEditBiometricForm(currentEdit);
    }
  }
}

function populateEditBiometricForm(bioId) {
  const b = allBiometrics.find((item) => String(item.biometric_id) === String(bioId));
  if (!b) return;

  const fpInput = document.getElementById("editBioFingerprint");
  const irisInput = document.getElementById("editBioIris");

  if (fpInput) fpInput.value = b.fingerprint_hash || "";
  if (irisInput) irisInput.value = b.iris_hash || "";
}

window.quickEditBiometric = function (bioId) {
  const acc = document.getElementById("acc-edit-bio");
  if (acc && !acc.classList.contains("open")) {
    window.toggleAccordion("acc-edit-bio");
  }

  const select = document.getElementById("editBioSelect");
  if (select) {
    select.value = String(bioId);
  }

  populateEditBiometricForm(bioId);

  if (acc) {
    acc.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  const fpInput = document.getElementById("editBioFingerprint");
  if (fpInput) fpInput.focus();
};

window.quickDeleteBiometric = function (bioId) {
  if (!confirm(`Are you sure you want to delete Biometric Record #${bioId}?`)) {
    return;
  }

  fetch(`${API_BASE_URL}/biometrics/${bioId}`, { method: "DELETE" })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        showAlert("biometricAlert", `Biometric record #${bioId} deleted successfully.`, "success");
        loadBiometricsTable();
      } else {
        showAlert("biometricAlert", `Error: ${data.message || "Could not delete."}`, "error");
      }
    })
    .catch(() => showAlert("biometricAlert", "Failed to connect to backend server.", "error"));
};

// ====================================================
// 3. FORM SUBMISSIONS & CRUD ACTIONS
// ====================================================
function setupAllForms() {
  // 1. CITIZEN CRUD
  const addCitForm = document.getElementById("addCitizenForm");
  if (addCitForm) {
    addCitForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = document.getElementById("citizenName").value.trim();
      const dob = document.getElementById("citizenDob").value;
      const gender = document.getElementById("citizenGender").value;
      const mobile = document.getElementById("citizenMobile").value.trim();
      const btn = document.getElementById("btnAddCitizen");

      btn.disabled = true;
      btn.textContent = "Adding...";

      fetch(`${API_BASE_URL}/citizens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizen_name: name, dob, gender, mobile_number: mobile })
      })
        .then((res) => res.json())
        .then((data) => {
          btn.disabled = false;
          btn.textContent = "Add";
          if (data.success) {
            showAlert("citizenAlert", `Record #${data.citizen_id} (${escapeHtml(name)}) added successfully.`, "success");
            addCitForm.reset();
            loadCitizensTable();
          } else {
            showAlert("citizenAlert", `Error: ${data.message || "Failed to add citizen."}`, "error");
          }
        })
        .catch(() => {
          btn.disabled = false;
          btn.textContent = "Add";
          showAlert("citizenAlert", "Failed to connect to backend server.", "error");
        });
    });
  }

  const delCitForm = document.getElementById("deleteCitizenForm");
  if (delCitForm) {
    delCitForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("deleteCitizenSelect").value;
      if (!id) return;
      window.quickDeleteCitizen(id);
    });
  }

  const editCitSelect = document.getElementById("editCitizenSelect");
  if (editCitSelect) {
    editCitSelect.addEventListener("change", function () {
      const id = this.value;
      if (!id) {
        document.getElementById("editCitizenName").value = "";
        document.getElementById("editCitizenDob").value = "";
        document.getElementById("editCitizenGender").value = "Male";
        document.getElementById("editCitizenMobile").value = "";
        return;
      }
      populateEditCitizenForm(id);
    });
  }

  const editCitForm = document.getElementById("editCitizenForm");
  if (editCitForm) {
    editCitForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("editCitizenSelect").value;
      if (!id) {
        showAlert("citizenAlert", "Please select a citizen to edit from the dropdown or click Edit on any table row.", "error");
        return;
      }

      const name = document.getElementById("editCitizenName").value.trim();
      const dob = document.getElementById("editCitizenDob").value;
      const gender = document.getElementById("editCitizenGender").value;
      const mobile = document.getElementById("editCitizenMobile").value.trim();
      const btn = document.getElementById("btnUpdateCitizen");

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving...";
      }

      fetch(`${API_BASE_URL}/citizens/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizen_name: name, dob, gender, mobile_number: mobile })
      })
        .then((res) => res.json())
        .then((data) => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Save";
          }
          if (data.success) {
            showAlert("citizenAlert", `Citizen #${id} (${escapeHtml(name)}) updated successfully!`, "success");
            loadCitizensTable(id);
          } else {
            showAlert("citizenAlert", `Error: ${data.message || "Update failed."}`, "error");
          }
        })
        .catch(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Save";
          }
          showAlert("citizenAlert", "Network error while saving citizen update.", "error");
        });
    });
  }

  // 2. ENROLLMENT CENTER CRUD
  const addCtrForm = document.getElementById("addCenterForm");
  if (addCtrForm) {
    addCtrForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const name = document.getElementById("centerName").value.trim();
      const district = document.getElementById("centerDistrict").value.trim();
      const state = document.getElementById("centerState").value.trim();
      const btn = document.getElementById("btnAddCenter");

      btn.disabled = true;
      btn.textContent = "Adding...";

      fetch(`${API_BASE_URL}/centers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ center_name: name, district, state })
      })
        .then((res) => res.json())
        .then((data) => {
          btn.disabled = false;
          btn.textContent = "Add";
          if (data.success) {
            showAlert("centerAlert", `Center #${data.center_id} (${escapeHtml(name)}) added successfully.`, "success");
            addCtrForm.reset();
            loadCentersTable();
          } else {
            showAlert("centerAlert", `Error: ${data.message || "Failed to add center."}`, "error");
          }
        })
        .catch(() => {
          btn.disabled = false;
          btn.textContent = "Add";
          showAlert("centerAlert", "Failed to connect to backend server.", "error");
        });
    });
  }

  const delCtrForm = document.getElementById("deleteCenterForm");
  if (delCtrForm) {
    delCtrForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("deleteCenterSelect").value;
      if (!id) return;
      window.quickDeleteCenter(id);
    });
  }

  const editCtrSelect = document.getElementById("editCenterSelect");
  if (editCtrSelect) {
    editCtrSelect.addEventListener("change", function () {
      const id = this.value;
      if (!id) {
        document.getElementById("editCenterName").value = "";
        document.getElementById("editCenterDistrict").value = "";
        document.getElementById("editCenterState").value = "";
        return;
      }
      populateEditCenterForm(id);
    });
  }

  const editCtrForm = document.getElementById("editCenterForm");
  if (editCtrForm) {
    editCtrForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("editCenterSelect").value;
      if (!id) {
        showAlert("centerAlert", "Please select a center to edit.", "error");
        return;
      }

      const name = document.getElementById("editCenterName").value.trim();
      const district = document.getElementById("centerDistrict") ? document.getElementById("editCenterDistrict").value.trim() : "";
      const state = document.getElementById("editCenterState").value.trim();
      const btn = document.getElementById("btnUpdateCenter");

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving...";
      }

      fetch(`${API_BASE_URL}/centers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ center_name: name, district, state })
      })
        .then((res) => res.json())
        .then((data) => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Save";
          }
          if (data.success) {
            showAlert("centerAlert", `Center #${id} (${escapeHtml(name)}) updated successfully!`, "success");
            loadCentersTable(id);
          } else {
            showAlert("centerAlert", `Error: ${data.message || "Update failed."}`, "error");
          }
        })
        .catch(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Save";
          }
          showAlert("centerAlert", "Network error while saving center update.", "error");
        });
    });
  }

  // 3. APPLICATION CRUD
  const addAppForm = document.getElementById("addApplicationForm");
  if (addAppForm) {
    addAppForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const citizen_id = document.getElementById("appCitizenSelect").value;
      const center_id = document.getElementById("appCenterSelect").value;
      const btn = document.getElementById("btnAddApp");

      btn.disabled = true;
      btn.textContent = "Adding...";

      fetch(`${API_BASE_URL}/applications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizen_id, center_id })
      })
        .then((res) => res.json())
        .then((data) => {
          btn.disabled = false;
          btn.textContent = "Add";
          if (data.success) {
            showAlert("applicationAlert", `Application #${data.application_id} created successfully with auto-generated Biometric Record!`, "success");
            addAppForm.reset();
            loadApplicationsTable();
            loadBiometricsTable();
          } else {
            showAlert("applicationAlert", `Error: ${data.message || "Failed to create application."}`, "error");
          }
        })
        .catch(() => {
          btn.disabled = false;
          btn.textContent = "Add";
          showAlert("applicationAlert", "Failed to connect to backend server.", "error");
        });
    });
  }

  const delAppForm = document.getElementById("deleteAppForm");
  if (delAppForm) {
    delAppForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("deleteAppSelect").value;
      if (!id) return;
      window.quickDeleteApplication(id);
    });
  }

  const editAppSelect = document.getElementById("editAppSelect");
  if (editAppSelect) {
    editAppSelect.addEventListener("change", function () {
      const id = this.value;
      if (!id) {
        document.getElementById("editAppCitizen").value = "";
        document.getElementById("editAppCenter").value = "";
        document.getElementById("editAppStatus").value = "Pending";
        return;
      }
      populateEditApplicationForm(id);
    });
  }

  const editAppForm = document.getElementById("editAppForm");
  if (editAppForm) {
    editAppForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("editAppSelect").value;
      if (!id) {
        showAlert("applicationAlert", "Please select an application to edit.", "error");
        return;
      }

      const citizen_id = document.getElementById("editAppCitizen").value;
      const center_id = document.getElementById("editAppCenter").value;
      const status = document.getElementById("editAppStatus").value;
      const btn = document.getElementById("btnUpdateApp");

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving...";
      }

      fetch(`${API_BASE_URL}/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizen_id, center_id, status })
      })
        .then((res) => res.json())
        .then((data) => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Save";
          }
          if (data.success) {
            showAlert("applicationAlert", `Application #${id} updated successfully!`, "success");
            loadApplicationsTable(id);
          } else {
            showAlert("applicationAlert", `Error: ${data.message || "Update failed."}`, "error");
          }
        })
        .catch(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Save";
          }
          showAlert("applicationAlert", "Network error while saving application update.", "error");
        });
    });
  }

  // 4. BIOMETRIC CRUD
  const addBioForm = document.getElementById("addBiometricForm");
  if (addBioForm) {
    addBioForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const application_id = document.getElementById("bioAppSelect").value;
      let fp = document.getElementById("bioFingerprint").value.trim();
      let iris = document.getElementById("bioIris").value.trim();
      const btn = document.getElementById("btnAddBio");

      if (!fp) fp = generateRandomHash("fp_sha256");
      if (!iris) iris = generateRandomHash("iris_sha256");

      btn.disabled = true;
      btn.textContent = "Adding...";

      fetch(`${API_BASE_URL}/biometrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ application_id, fingerprint_hash: fp, iris_hash: iris })
      })
        .then((res) => res.json())
        .then((data) => {
          btn.disabled = false;
          btn.textContent = "Add";
          if (data.success) {
            showAlert("biometricAlert", `Biometric record #${data.biometric_id} added successfully.`, "success");
            addBioForm.reset();
            loadBiometricsTable();
          } else {
            showAlert("biometricAlert", `Error: ${data.message || "Failed to add biometric record."}`, "error");
          }
        })
        .catch(() => {
          btn.disabled = false;
          btn.textContent = "Add";
          showAlert("biometricAlert", "Failed to connect to backend server.", "error");
        });
    });
  }

  const delBioForm = document.getElementById("deleteBiometricForm");
  if (delBioForm) {
    delBioForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("deleteBioSelect").value;
      if (!id) return;
      window.quickDeleteBiometric(id);
    });
  }

  const editBioSelect = document.getElementById("editBioSelect");
  if (editBioSelect) {
    editBioSelect.addEventListener("change", function () {
      const id = this.value;
      if (!id) {
        document.getElementById("editBioFingerprint").value = "";
        document.getElementById("editBioIris").value = "";
        return;
      }
      populateEditBiometricForm(id);
    });
  }

  const editBioForm = document.getElementById("editBiometricForm");
  if (editBioForm) {
    editBioForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("editBioSelect").value;
      if (!id) {
        showAlert("biometricAlert", "Please select a record to edit.", "error");
        return;
      }

      const fp = document.getElementById("editBioFingerprint").value.trim();
      const iris = document.getElementById("editBioIris").value.trim();
      const btn = document.getElementById("btnUpdateBio");

      if (btn) {
        btn.disabled = true;
        btn.textContent = "Saving...";
      }

      fetch(`${API_BASE_URL}/biometrics/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint_hash: fp, iris_hash: iris })
      })
        .then((res) => res.json())
        .then((data) => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Save";
          }
          if (data.success) {
            showAlert("biometricAlert", `Biometric record #${id} updated successfully!`, "success");
            loadBiometricsTable(id);
          } else {
            showAlert("biometricAlert", `Error: ${data.message || "Update failed."}`, "error");
          }
        })
        .catch(() => {
          if (btn) {
            btn.disabled = false;
            btn.textContent = "Save";
          }
          showAlert("biometricAlert", "Network error while saving biometric update.", "error");
        });
    });
  }
}

// ====================================================
// 4. ACADEMIC CREDITS (TEACHER & 5 MEMBERS)
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
  const gridEl = document.getElementById("homeStudentsGrid");
  const countBadge = document.getElementById("teamCountBadge");

  if (teacherNameEl) teacherNameEl.textContent = credits.teacherName;
  if (teacherDeptEl) teacherDeptEl.textContent = credits.teacherDept;

  if (gridEl) {
    gridEl.innerHTML = credits.students
      .map((s, index) => {
        return `
          <div class="student-item">
            <strong>${index + 1}. ${escapeHtml(s.name || `Student ${index + 1}`)}</strong>
            <span class="scholar-badge">Scholar: ${escapeHtml(s.scholar || "-")}</span>
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

// ====================================================
// 5. HEALTH CHECK & CLOUD FALLBACK
// ====================================================
function checkBackendHealth() {
  const statusText = document.getElementById("backendStatusText");
  const statusContainer = document.querySelector(".status-right");

  if (statusText) statusText.textContent = "Backend: Connecting...";

  if (statusContainer && !statusContainer.dataset.configured) {
    statusContainer.dataset.configured = "true";
    statusContainer.addEventListener("click", () => {
      const current = localStorage.getItem("API_URL") || API_BASE_URL;
      const custom = prompt("Enter Backend API Base URL (leave blank for automatic):", current);
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
      if (data.success || data.status === "OK") {
        if (statusText) statusText.textContent = "Backend: Connected (Live DB)";
        if (statusContainer) statusContainer.classList.add("online");
      }
    })
    .catch(() => {
      // If local server is not running, seamlessly fallback to cloud backend!
      if (API_BASE_URL !== `${DEPLOYED_BACKEND_URL}/api`) {
        fetch(`${DEPLOYED_BACKEND_URL}/api/health`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success || data.status === "OK") {
              API_BASE_URL = `${DEPLOYED_BACKEND_URL}/api`;
              if (statusText) statusText.textContent = "Backend: Cloud Live (TiDB)";
              if (statusContainer) statusContainer.classList.add("online");
              loadAllData();
            }
          })
          .catch(() => {
            if (statusText) statusText.textContent = "Backend: Offline";
            if (statusContainer) statusContainer.classList.remove("online");
          });
      } else {
        if (statusText) statusText.textContent = "Backend: Offline";
        if (statusContainer) statusContainer.classList.remove("online");
      }
    });
}
