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
