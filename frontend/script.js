// ====================================================
// Aadhaar Enrollment System — Frontend JavaScript
// Matching College DBMS Reference System (Traffic Challan Architecture)
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

const API_BASE_URL = getApiBaseUrl();

// Global caches for dropdowns and cross-table references
let allCitizens = [];
let allCenters = [];
let allApplications = [];
let allBiometrics = [];
let currentCardCitizen = null;

// ====================================================
// 1. INITIALIZATION & ROUTING
// ====================================================
document.addEventListener("DOMContentLoaded", function () {
  checkBackendHealth();
  setupRouting();
  setupAllForms();
  setupCardGenerator();
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
  // Listen for browser back/forward buttons
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
function loadCitizensTable() {
  const tbody = document.getElementById("citizensTableBody");

  fetch(`${API_BASE_URL}/citizens`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.citizens)) {
        allCitizens = data.citizens;
        renderCitizensTable(allCitizens);
        populateCitizenDropdowns();
        populateApplicationDropdowns();
        populateCardCitizenDropdown();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No citizen records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load citizens error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Failed to connect to backend server.</td></tr>';
    });
}

function renderCitizensTable(list) {
  const tbody = document.getElementById("citizensTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No records found.</td></tr>';
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
        </tr>
      `;
    })
    .join("");
}

function populateCitizenDropdowns() {
  const delSelect = document.getElementById("deleteCitizenSelect");
  const editSelect = document.getElementById("editCitizenSelect");

  let options = '<option value="">-- Select citizen --</option>';
  allCitizens.forEach((c) => {
    options += `<option value="${c.citizen_id}">${c.citizen_id} - ${escapeHtml(c.citizen_name)} (${c.mobile_number})</option>`;
  });

  if (delSelect) delSelect.innerHTML = options;
  if (editSelect) editSelect.innerHTML = options;
}

// ----------------------------------------------------
// TABLE 2: ENROLLMENT CENTERS
// ----------------------------------------------------
function loadCentersTable() {
  const tbody = document.getElementById("centersTableBody");

  fetch(`${API_BASE_URL}/centers`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.centers)) {
        allCenters = data.centers;
        renderCentersTable(allCenters);
        populateCenterDropdowns();
        populateApplicationDropdowns();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No center records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load centers error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">Failed to connect to backend server.</td></tr>';
    });
}

function renderCentersTable(list) {
  const tbody = document.getElementById("centersTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No records found.</td></tr>';
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
        </tr>
      `;
    })
    .join("");
}

function populateCenterDropdowns() {
  const delSelect = document.getElementById("deleteCenterSelect");
  const editSelect = document.getElementById("editCenterSelect");

  let options = '<option value="">-- Select center --</option>';
  allCenters.forEach((ctr) => {
    options += `<option value="${ctr.center_id}">${ctr.center_id} - ${escapeHtml(ctr.center_name)} (${escapeHtml(ctr.district)})</option>`;
  });

  if (delSelect) delSelect.innerHTML = options;
  if (editSelect) editSelect.innerHTML = options;
}

// ----------------------------------------------------
// TABLE 3: AADHAAR APPLICATIONS
// ----------------------------------------------------
function loadApplicationsTable() {
  const tbody = document.getElementById("applicationsTableBody");

  fetch(`${API_BASE_URL}/applications`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.applications)) {
        allApplications = data.applications;
        renderApplicationsTable(allApplications);
        populateApplicationDropdowns();
        populateBiometricDropdowns();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No application records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load applications error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">Failed to connect to backend server.</td></tr>';
    });
}

function renderApplicationsTable(list) {
  const tbody = document.getElementById("applicationsTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-cell">No records found.</td></tr>';
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
          <td>${escapeHtml(app.status || "Pending")}</td>
        </tr>
      `;
    })
    .join("");
}

function populateApplicationDropdowns() {
  const addCit = document.getElementById("appCitizenSelect");
  const addCtr = document.getElementById("appCenterSelect");
  const editCit = document.getElementById("editAppCitizen");
  const editCtr = document.getElementById("editAppCenter");
  const delApp = document.getElementById("deleteAppSelect");
  const editApp = document.getElementById("editAppSelect");

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
  let appOpts = '<option value="">-- Select application --</option>';
  allApplications.forEach((app) => {
    appOpts += `<option value="${app.application_id}">App #${app.application_id} - ${escapeHtml(app.citizen_name || "Citizen #" + app.citizen_id)} (${app.status})</option>`;
  });
  if (delApp) delApp.innerHTML = appOpts;
  if (editApp) editApp.innerHTML = appOpts;
}

// ----------------------------------------------------
// TABLE 4: BIOMETRIC RECORDS
// ----------------------------------------------------
function loadBiometricsTable() {
  const tbody = document.getElementById("biometricsTableBody");

  fetch(`${API_BASE_URL}/biometrics`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.biometrics)) {
        allBiometrics = data.biometrics;
        renderBiometricsTable(allBiometrics);
        populateBiometricDropdowns();
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No biometric records found.</td></tr>';
      }
    })
    .catch((err) => {
      console.error("Load biometrics error:", err);
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">Failed to connect to backend server.</td></tr>';
    });
}

function renderBiometricsTable(list) {
  const tbody = document.getElementById("biometricsTableBody");
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-cell">No records found.</td></tr>';
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
        </tr>
      `;
    })
    .join("");
}

function populateBiometricDropdowns() {
  const bioAppSelect = document.getElementById("bioAppSelect");
  const delBioSelect = document.getElementById("deleteBioSelect");
  const editBioSelect = document.getElementById("editBioSelect");

  let appOpts = '<option value="">-- Select application --</option>';
  allApplications.forEach((app) => {
    appOpts += `<option value="${app.application_id}">App #${app.application_id} - ${escapeHtml(app.citizen_name || "Citizen #" + app.citizen_id)}</option>`;
  });
  if (bioAppSelect) bioAppSelect.innerHTML = appOpts;

  let bioOpts = '<option value="">-- Select biometric record --</option>';
  allBiometrics.forEach((b) => {
    bioOpts += `<option value="${b.biometric_id}">Record #${b.biometric_id} (App #${b.application_id})</option>`;
  });
  if (delBioSelect) delBioSelect.innerHTML = bioOpts;
  if (editBioSelect) editBioSelect.innerHTML = bioOpts;
}

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
        .catch((err) => {
          btn.disabled = false;
          btn.textContent = "Add";
          showAlert("citizenAlert", "Failed to connect to backend.", "error");
        });
    });
  }

  const delCitForm = document.getElementById("deleteCitizenForm");
  if (delCitForm) {
    delCitForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("deleteCitizenSelect").value;
      if (!id) return;

      if (!confirm(`Are you sure you want to delete Citizen #${id}? Any related applications will also be deleted.`)) {
        return;
      }

      fetch(`${API_BASE_URL}/citizens/${id}`, { method: "DELETE" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showAlert("citizenAlert", `Citizen #${id} deleted successfully.`, "success");
            loadCitizensTable();
            loadApplicationsTable();
            loadBiometricsTable();
          } else {
            showAlert("citizenAlert", `Error: ${data.message || "Could not delete."}`, "error");
          }
        })
        .catch(() => showAlert("citizenAlert", "Failed to delete.", "error"));
    });
  }

  const editCitSelect = document.getElementById("editCitizenSelect");
  if (editCitSelect) {
    editCitSelect.addEventListener("change", function () {
      const id = this.value;
      const citizen = allCitizens.find((c) => String(c.citizen_id) === String(id));
      if (citizen) {
        document.getElementById("editCitizenName").value = citizen.citizen_name || "";
        document.getElementById("editCitizenDob").value = citizen.dob ? citizen.dob.split("T")[0] : "";
        document.getElementById("editCitizenGender").value = citizen.gender || "";
        document.getElementById("editCitizenMobile").value = citizen.mobile_number || "";
      }
    });
  }

  const editCitForm = document.getElementById("editCitizenForm");
  if (editCitForm) {
    editCitForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("editCitizenSelect").value;
      if (!id) {
        showAlert("citizenAlert", "Please select a citizen to edit.", "error");
        return;
      }

      const name = document.getElementById("editCitizenName").value.trim();
      const dob = document.getElementById("editCitizenDob").value;
      const gender = document.getElementById("editCitizenGender").value;
      const mobile = document.getElementById("editCitizenMobile").value.trim();

      fetch(`${API_BASE_URL}/citizens/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizen_name: name, dob, gender, mobile_number: mobile })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showAlert("citizenAlert", `Citizen #${id} updated successfully.`, "success");
            loadCitizensTable();
          } else {
            showAlert("citizenAlert", `Error: ${data.message || "Update failed."}`, "error");
          }
        })
        .catch(() => showAlert("citizenAlert", "Update failed.", "error"));
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
          showAlert("centerAlert", "Failed to connect to backend.", "error");
        });
    });
  }

  const delCtrForm = document.getElementById("deleteCenterForm");
  if (delCtrForm) {
    delCtrForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("deleteCenterSelect").value;
      if (!id) return;

      if (!confirm(`Are you sure you want to delete Center #${id}?`)) return;

      fetch(`${API_BASE_URL}/centers/${id}`, { method: "DELETE" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showAlert("centerAlert", `Center #${id} deleted successfully.`, "success");
            loadCentersTable();
            loadApplicationsTable();
          } else {
            showAlert("centerAlert", `Error: ${data.message || "Could not delete center."}`, "error");
          }
        })
        .catch(() => showAlert("centerAlert", "Failed to delete.", "error"));
    });
  }

  const editCtrSelect = document.getElementById("editCenterSelect");
  if (editCtrSelect) {
    editCtrSelect.addEventListener("change", function () {
      const id = this.value;
      const ctr = allCenters.find((c) => String(c.center_id) === String(id));
      if (ctr) {
        document.getElementById("editCenterName").value = ctr.center_name || "";
        document.getElementById("editCenterDistrict").value = ctr.district || "";
        document.getElementById("editCenterState").value = ctr.state || "";
      }
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
      const district = document.getElementById("editCenterDistrict").value.trim();
      const state = document.getElementById("editCenterState").value.trim();

      fetch(`${API_BASE_URL}/centers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ center_name: name, district, state })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showAlert("centerAlert", `Center #${id} updated successfully.`, "success");
            loadCentersTable();
          } else {
            showAlert("centerAlert", `Error: ${data.message || "Update failed."}`, "error");
          }
        })
        .catch(() => showAlert("centerAlert", "Update failed.", "error"));
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
            showAlert("applicationAlert", `Application #${data.application_id} created successfully.`, "success");
            addAppForm.reset();
            loadApplicationsTable();
          } else {
            showAlert("applicationAlert", `Error: ${data.message || "Failed to create application."}`, "error");
          }
        })
        .catch(() => {
          btn.disabled = false;
          btn.textContent = "Add";
          showAlert("applicationAlert", "Failed to connect to backend.", "error");
        });
    });
  }

  const delAppForm = document.getElementById("deleteAppForm");
  if (delAppForm) {
    delAppForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("deleteAppSelect").value;
      if (!id) return;

      if (!confirm(`Are you sure you want to delete Application #${id}?`)) return;

      fetch(`${API_BASE_URL}/applications/${id}`, { method: "DELETE" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showAlert("applicationAlert", `Application #${id} deleted successfully.`, "success");
            loadApplicationsTable();
            loadBiometricsTable();
          } else {
            showAlert("applicationAlert", `Error: ${data.message || "Could not delete."}`, "error");
          }
        })
        .catch(() => showAlert("applicationAlert", "Failed to delete.", "error"));
    });
  }

  const editAppSelect = document.getElementById("editAppSelect");
  if (editAppSelect) {
    editAppSelect.addEventListener("change", function () {
      const id = this.value;
      const app = allApplications.find((a) => String(a.application_id) === String(id));
      if (app) {
        document.getElementById("editAppCitizen").value = app.citizen_id || "";
        document.getElementById("editAppCenter").value = app.center_id || "";
        document.getElementById("editAppStatus").value = app.status || "Pending";
      }
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

      fetch(`${API_BASE_URL}/applications/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ citizen_id, center_id, status })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showAlert("applicationAlert", `Application #${id} updated successfully.`, "success");
            loadApplicationsTable();
          } else {
            showAlert("applicationAlert", `Error: ${data.message || "Update failed."}`, "error");
          }
        })
        .catch(() => showAlert("applicationAlert", "Update failed.", "error"));
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
          showAlert("biometricAlert", "Failed to connect to backend.", "error");
        });
    });
  }

  const delBioForm = document.getElementById("deleteBiometricForm");
  if (delBioForm) {
    delBioForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const id = document.getElementById("deleteBioSelect").value;
      if (!id) return;

      if (!confirm(`Are you sure you want to delete Biometric Record #${id}?`)) return;

      fetch(`${API_BASE_URL}/biometrics/${id}`, { method: "DELETE" })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showAlert("biometricAlert", `Biometric record #${id} deleted successfully.`, "success");
            loadBiometricsTable();
          } else {
            showAlert("biometricAlert", `Error: ${data.message || "Could not delete."}`, "error");
          }
        })
        .catch(() => showAlert("biometricAlert", "Failed to delete.", "error"));
    });
  }

  const editBioSelect = document.getElementById("editBioSelect");
  if (editBioSelect) {
    editBioSelect.addEventListener("change", function () {
      const id = this.value;
      const b = allBiometrics.find((item) => String(item.biometric_id) === String(id));
      if (b) {
        document.getElementById("editBioFingerprint").value = b.fingerprint_hash || "";
        document.getElementById("editBioIris").value = b.iris_hash || "";
      }
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

      fetch(`${API_BASE_URL}/biometrics/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint_hash: fp, iris_hash: iris })
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            showAlert("biometricAlert", `Biometric record #${id} updated successfully.`, "success");
            loadBiometricsTable();
          } else {
            showAlert("biometricAlert", `Error: ${data.message || "Update failed."}`, "error");
          }
        })
        .catch(() => showAlert("biometricAlert", "Update failed.", "error"));
    });
  }
}

// ====================================================
// 4. IDENTITY CARD GENERATOR
// ====================================================
function populateCardCitizenDropdown() {
  const select = document.getElementById("cardCitizenSelect");
  if (!select) return;

  let opts = '<option value="">-- Select Citizen --</option>';
  allCitizens.forEach((c) => {
    opts += `<option value="${c.citizen_id}">#${c.citizen_id} - ${escapeHtml(c.citizen_name)} (${c.mobile_number})</option>`;
  });
  select.innerHTML = opts;
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

function setupCardGenerator() {
  const select = document.getElementById("cardCitizenSelect");
  if (select) {
    select.addEventListener("change", function () {
      const id = this.value;
      if (!id) return;
      const citizen = allCitizens.find((c) => String(c.citizen_id) === String(id));
      if (citizen) {
        const app = allApplications.find((a) => String(a.citizen_id) === String(id));
        const centerName = app ? `${app.center_name} (${app.district})` : "Central UIDAI Kendra";
        updateAadhaarCardUI(citizen, centerName);
        showAlert("cardAlert", `Generated ID Card for ${escapeHtml(citizen.citizen_name)}.`, "success");
      }
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
            showAlert("cardAlert", `Loaded Identity Card for ${escapeHtml(app.citizen_name)}.`, "success");
          } else {
            showAlert("cardAlert", `Application #${appId} not found in database.`, "error");
          }
        })
        .catch(() => showAlert("cardAlert", "Failed to retrieve application.", "error"));
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
    dob: document.getElementById("cardDOB")?.textContent || "2000-01-01",
    gender: document.getElementById("cardGender")?.textContent || "Citizen",
    mobile_number: (document.getElementById("cardMobile")?.textContent || "9876543210").replace(/\D/g, "")
  };

  const centerText = document.getElementById("cardCenter")?.textContent || "Central UIDAI Kendra";
  const aadhaarNumber = generateAadhaarNumber(citizen.citizen_id, citizen.mobile_number);

  const canvas = document.getElementById("offscreenCardCanvas") || document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");

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

  // Card Outer
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2.5;
  roundRect(ctx, 15, 15, 970, 600, 10, true, true);

  // Top Rule
  ctx.fillStyle = "#000000";
  ctx.fillRect(15, 15, 970, 6);

  // Header
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(15, 115);
  ctx.lineTo(985, 115);
  ctx.stroke();

  // Chakra
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

  // Titles
  ctx.textAlign = "center";
  ctx.fillStyle = "#000000";
  ctx.font = "bold 20px Arial, sans-serif";
  ctx.fillText("भारत सरकार", 500, 52);

  ctx.fillStyle = "#000000";
  ctx.font = "bold 15px Arial, sans-serif";
  ctx.fillText("GOVERNMENT OF INDIA", 500, 74);

  ctx.fillStyle = "#333333";
  ctx.font = "bold 12px Arial, sans-serif";
  ctx.fillText("भारतीय विशिष्ट पहचान प्राधिकरण | UIDAI", 500, 95);

  // Sun
  ctx.fillStyle = "#000000";
  ctx.font = "bold 18px Arial, sans-serif";
  ctx.fillText("आधार", 920, 80);
  ctx.font = "24px Arial";
  ctx.fillText("☀️", 920, 52);

  // Photo
  ctx.fillStyle = "#f7f7f7";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 50, 140, 170, 215, 4, true, true);

  // Avatar
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
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("✓ VERIFIED IDENTITY", 135, 345);

  // Details
  ctx.textAlign = "left";
  ctx.fillStyle = "#000000";
  ctx.font = "bold 24px Arial, sans-serif";
  ctx.fillText(citizen.citizen_name || "Citizen Full Name", 255, 175);

  ctx.fillStyle = "#333333";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("जन्म तिथि / DOB :", 255, 215);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText(citizen.dob ? formatDate(citizen.dob) : "01/01/2000", 410, 215);

  ctx.fillStyle = "#333333";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("लिंग / Gender :", 255, 250);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText(citizen.gender || "Citizen", 410, 250);

  ctx.fillStyle = "#333333";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("मोबाइल / Mobile :", 255, 285);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.fillText(`+91 XXXXXX${(citizen.mobile_number || "0000").slice(-4)}`, 410, 285);

  ctx.fillStyle = "#333333";
  ctx.font = "16px Arial, sans-serif";
  ctx.fillText("केंद्र / Center :", 255, 320);
  ctx.fillStyle = "#000000";
  ctx.font = "14px Arial, sans-serif";
  ctx.fillText(centerText, 410, 320);

  // QR
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

  // Aadhaar Number Box
  ctx.fillStyle = "#f5f5f5";
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.5;
  roundRect(ctx, 35, 415, 930, 110, 8, true, true);

  ctx.fillStyle = "#555555";
  ctx.font = "bold 13px Arial, sans-serif";
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
  ctx.font = "bold 16px Arial, sans-serif";
  ctx.fillText("मेरा आधार, मेरी पहचान", 50, 580);

  ctx.textAlign = "center";
  ctx.fillStyle = "#333333";
  ctx.font = "bold 13px Arial, sans-serif";
  ctx.fillText("My Aadhaar, My Identity", 500, 580);

  ctx.textAlign = "right";
  ctx.fillStyle = "#666666";
  ctx.font = "12px Arial, sans-serif";
  ctx.fillText("[DBMS Laboratory Evaluation Project]", 950, 580);

  // Download trigger
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
// 5. ACADEMIC CREDITS (TEACHER & 5 MEMBERS)
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
// 6. HEALTH CHECK
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
      if (data.status === "OK") {
        if (statusText) {
          const mode = data.database ? data.database.mode : "connected";
          statusText.textContent = `Backend: Connected (${mode})`;
        }
        if (statusContainer) statusContainer.classList.add("online");
      }
    })
    .catch(() => {
      if (statusText) statusText.textContent = "Backend: Offline";
      if (statusContainer) statusContainer.classList.remove("online");
    });
}
