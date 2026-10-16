// ====================================================
// Aadhaar Enrollment Management System - Backend Server
// Built with Node.js, Express.js, and MySQL (mysql2)
// Educational Demonstration Project
// ====================================================

const express = require("express");
const cors = require("cors");
const db = require("./db");

const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON bodies & enable CORS
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  })
);

// Serve frontend static files
app.use(express.static(path.join(__dirname, "../frontend")));

// Health check API routes (supports both /api/health and /health)
app.get(["/api/health", "/health"], function (req, res) {
  res.json({ success: true, message: "Aadhaar Enrollment Management System Backend is running!" });
});

// Root API response
app.get(["/api", "/api/"], function (req, res) {
  res.json({ success: true, message: "Aadhaar Enrollment Management System API is running!" });
});

// Database connectivity diagnostic route
app.get(["/api/db-status", "/db-status"], function (req, res) {
  db.getConnection(function (err, connection) {
    if (err) {
      return res.status(500).json({
        success: false,
        connected: false,
        message: "Database connection failed",
        error: err.message,
        code: err.code,
        host: process.env.DB_HOST ? process.env.DB_HOST.substring(0, 20) + "..." : "localhost (default)",
        database: process.env.DB_NAME || "Aadhar",
      });
    }
    connection.release();
    res.json({
      success: true,
      connected: true,
      message: "Database connected successfully!",
      database: process.env.DB_NAME || "Aadhar",
    });
  });
});

// ====================================================
// 1. CITIZENS APIs
// ====================================================

// POST /api/citizens - Register a new citizen
app.post(["/api/citizens", "/citizens"], function (req, res) {
  const { citizen_name, dob, gender, mobile_number } = req.body;

  // Basic server-side validation
  if (!citizen_name || citizen_name.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Citizen name is required.",
    });
  }

  if (!dob) {
    return res.status(400).json({
      success: false,
      message: "Date of birth is required.",
    });
  }

  const validGenders = ["Male", "Female", "Others"];
  if (!gender || !validGenders.includes(gender)) {
    return res.status(400).json({
      success: false,
      message: "Gender must be 'Male', 'Female', or 'Others'.",
    });
  }

  const mobileRegex = /^[0-9]{10}$/;
  if (!mobile_number || !mobileRegex.test(mobile_number.trim())) {
    return res.status(400).json({
      success: false,
      message: "Mobile number must be exactly 10 digits.",
    });
  }

  const sql = `
    INSERT INTO Citizens (citizen_name, dob, gender, mobile_number)
    VALUES (?, ?, ?, ?)
  `;
  const values = [citizen_name.trim(), dob, gender, mobile_number.trim()];

  db.query(sql, values, function (error, result) {
    if (error) {
      console.error("Error inserting citizen:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save citizen data.",
        error: error.message || error.code,
      });
    }

    console.log("Citizen saved successfully! ID:", result.insertId);
    res.status(201).json({
      success: true,
      message: "Citizen registered successfully",
      citizen_id: result.insertId,
    });
  });
});

// GET /api/citizens - Retrieve all citizens
app.get(["/api/citizens", "/citizens"], function (req, res) {
  const sql = "SELECT * FROM Citizens ORDER BY citizen_id DESC";

  db.query(sql, function (error, results) {
    if (error) {
      console.error("Error fetching citizens:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve citizens.",
        error: error.message || error.code,
      });
    }

    res.status(200).json({
      success: true,
      citizens: results,
    });
  });
});

// GET /api/citizens/:id - Retrieve single citizen by ID
app.get(["/api/citizens/:id", "/citizens/:id"], function (req, res) {
  const citizenId = req.params.id;
  const sql = "SELECT * FROM Citizens WHERE citizen_id = ?";

  db.query(sql, [citizenId], function (error, results) {
    if (error) {
      console.error("Error fetching citizen by ID:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve citizen.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Citizen not found.",
      });
    }

    res.status(200).json({
      success: true,
      citizen: results[0],
    });
  });
});

// PUT /api/citizens/:id - Update an existing citizen's demographic details
app.put(["/api/citizens/:id", "/citizens/:id"], function (req, res) {
  const citizenId = req.params.id;
  const { citizen_name, dob, gender, mobile_number } = req.body;

  if (!citizen_name || citizen_name.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Citizen name is required.",
    });
  }

  if (!dob) {
    return res.status(400).json({
      success: false,
      message: "Date of birth is required.",
    });
  }

  const validGenders = ["Male", "Female", "Others"];
  if (!gender || !validGenders.includes(gender)) {
    return res.status(400).json({
      success: false,
      message: "Gender must be 'Male', 'Female', or 'Others'.",
    });
  }

  const mobileRegex = /^[0-9]{10}$/;
  if (!mobile_number || !mobileRegex.test(mobile_number.trim())) {
    return res.status(400).json({
      success: false,
      message: "Mobile number must be exactly 10 digits.",
    });
  }

  const sql = `
    UPDATE Citizens
    SET citizen_name = ?, dob = ?, gender = ?, mobile_number = ?
    WHERE citizen_id = ?
  `;
  const values = [citizen_name.trim(), dob, gender, mobile_number.trim(), citizenId];

  db.query(sql, values, function (error, result) {
    if (error) {
      console.error("Error updating citizen:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update citizen record in database.",
        error: error.message || error.code,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Citizen record not found.",
      });
    }

    console.log(`Citizen #${citizenId} updated successfully!`);
    res.status(200).json({
      success: true,
      message: "Citizen demographic details updated successfully.",
      citizen_id: parseInt(citizenId),
    });
  });
});

// ====================================================
// 2. ENROLLMENT CENTER APIs
// ====================================================

// POST /api/centers - Register a new enrollment center
app.post(["/api/centers", "/centers"], function (req, res) {
  const { center_name, district, state } = req.body;

  if (!center_name || !district || !state) {
    return res.status(400).json({
      success: false,
      message: "Center name, district, and state are all required.",
    });
  }

  const sql = `
    INSERT INTO EnrollmentCenter (center_name, district, state)
    VALUES (?, ?, ?)
  `;
  const values = [center_name.trim(), district.trim(), state.trim()];

  db.query(sql, values, function (error, result) {
    if (error) {
      console.error("Error inserting center:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to save the center data.",
        error: error.message || error.code,
      });
    }

    console.log("Center saved successfully! ID:", result.insertId);
    res.status(201).json({
      success: true,
      message: "Enrollment center registered successfully",
      center_id: result.insertId,
    });
  });
});

// GET /api/centers - Retrieve all enrollment centers
app.get(["/api/centers", "/centers"], function (req, res) {
  const sql = "SELECT * FROM EnrollmentCenter ORDER BY center_id DESC";

  db.query(sql, function (error, results) {
    if (error) {
      console.error("Error fetching enrollment centers:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve enrollment centers.",
        error: error.message || error.code,
      });
    }

    res.status(200).json({
      success: true,
      centers: results,
    });
  });
});

// GET /api/centers/:id - Retrieve single enrollment center by ID
app.get(["/api/centers/:id", "/centers/:id"], function (req, res) {
  const centerId = req.params.id;
  const sql = "SELECT * FROM EnrollmentCenter WHERE center_id = ?";

  db.query(sql, [centerId], function (error, results) {
    if (error) {
      console.error("Error fetching center by ID:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve center.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Enrollment center not found.",
      });
    }

    res.status(200).json({
      success: true,
      center: results[0],
    });
  });
});

// PUT /api/centers/:id - Update an existing enrollment center
app.put(["/api/centers/:id", "/centers/:id"], function (req, res) {
  const centerId = req.params.id;
  const { center_name, district, state } = req.body;

  if (!center_name || !district || !state) {
    return res.status(400).json({
      success: false,
      message: "Center name, district, and state are all required.",
    });
  }

  const sql = `
    UPDATE EnrollmentCenter
    SET center_name = ?, district = ?, state = ?
    WHERE center_id = ?
  `;
  const values = [center_name.trim(), district.trim(), state.trim(), centerId];

  db.query(sql, values, function (error, result) {
    if (error) {
      console.error("Error updating center:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update center data.",
        error: error.message || error.code,
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Enrollment center not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Enrollment center updated successfully.",
      center_id: parseInt(centerId),
    });
  });
});

// ====================================================
// 3. AADHAAR APPLICATION APIs
// ====================================================

// POST /api/applications - Create a new Aadhaar application
app.post(["/api/applications", "/applications"], function (req, res) {
  const { citizen_id, center_id } = req.body;

  if (!citizen_id || !center_id) {
    return res.status(400).json({
      success: false,
      message: "Both citizen_id and center_id are required.",
    });
  }

  // Automatic assignment: current date and status = 'Pending'
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const initialStatus = "Pending";

  const sql = `
    INSERT INTO AadharApplication (citizen_id, center_id, application_date, status)
    VALUES (?, ?, ?, ?)
  `;
  const values = [parseInt(citizen_id), parseInt(center_id), today, initialStatus];

  db.query(sql, values, function (error, result) {
    if (error) {
      console.error("Error creating application:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create application. Check if citizen and center exist.",
        error: error.message || error.code,
      });
    }

    const applicationId = result.insertId;
    console.log("Application created successfully! ID:", applicationId);

    // Optional demo insertion into BiometricRecord to demonstrate database relationship
    const bioSql = `
      INSERT INTO BiometricRecord (application_id, fingerprint_hash, iris_hash)
      VALUES (?, ?, ?)
    `;
    const demoFingerprintHash = "DEMO-SHA256-FP-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const demoIrisHash = "DEMO-SHA256-IRIS-" + Math.random().toString(36).substring(2, 10).toUpperCase();

    db.query(bioSql, [applicationId, demoFingerprintHash, demoIrisHash], function (bioError) {
      if (bioError) {
        // Log demonstration warning without blocking application creation
        console.log("Note: BiometricRecord demo record skipped or table not initialized yet.");
      }

      res.status(201).json({
        success: true,
        message: "Application registered successfully",
        application_id: applicationId,
        application_date: today,
        status: initialStatus,
      });
    });
  });
});

// GET /api/applications - Retrieve all applications with Citizen and Center details (SQL JOIN)
app.get(["/api/applications", "/applications"], function (req, res) {
  const sql = `
    SELECT
      a.application_id,
      a.citizen_id,
      a.center_id,
      c.citizen_name,
      c.mobile_number,
      e.center_name,
      e.district,
      e.state,
      DATE_FORMAT(a.application_date, '%Y-%m-%d') AS application_date,
      a.status
    FROM AadharApplication a
    JOIN Citizens c
      ON a.citizen_id = c.citizen_id
    JOIN EnrollmentCenter e
      ON a.center_id = e.center_id
    ORDER BY a.application_id DESC
  `;

  db.query(sql, function (error, results) {
    if (error) {
      console.error("Error fetching applications:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve applications.",
        error: error.message || error.code,
      });
    }

    res.status(200).json({
      success: true,
      applications: results,
    });
  });
});

// GET /api/applications/:id - Retrieve a single application with Citizen and Center details (SQL JOIN)
app.get(["/api/applications/:id", "/applications/:id"], function (req, res) {
  const applicationId = req.params.id;

  const sql = `
    SELECT
      a.application_id,
      a.citizen_id,
      a.center_id,
      c.citizen_name,
      DATE_FORMAT(c.dob, '%Y-%m-%d') AS dob,
      c.gender,
      c.mobile_number,
      e.center_name,
      e.district,
      e.state,
      DATE_FORMAT(a.application_date, '%Y-%m-%d') AS application_date,
      a.status
    FROM AadharApplication a
    JOIN Citizens c
      ON a.citizen_id = c.citizen_id
    JOIN EnrollmentCenter e
      ON a.center_id = e.center_id
    WHERE a.application_id = ?
  `;

  db.query(sql, [applicationId], function (error, results) {
    if (error) {
      console.error("Error fetching application by ID:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to retrieve application.",
      });
    }

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    res.status(200).json({
      success: true,
      application: results[0],
    });
  });
});

// PUT /api/applications/:id/status - Update application status (Pending / Complete)
app.put(["/api/applications/:id/status", "/applications/:id/status"], function (req, res) {
  const applicationId = req.params.id;
  const { status } = req.body;

  const allowedStatuses = ["Pending", "Complete"];
  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be either 'Pending' or 'Complete'.",
    });
  }

  const sql = `
    UPDATE AadharApplication
    SET status = ?
    WHERE application_id = ?
  `;

  db.query(sql, [status, applicationId], function (error, result) {
    if (error) {
      console.error("Error updating application status:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to update application status.",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Application not found.",
      });
    }

    console.log(`Application #${applicationId} status updated to: ${status}`);
    res.status(200).json({
      success: true,
      message: "Application status updated successfully",
      status: status,
    });
  });
});

// Start the server if running standalone (local development / Render / Railway)
if (!process.env.VERCEL) {
  app.listen(PORT, function () {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

// Export app for serverless platforms like Vercel
module.exports = app;
