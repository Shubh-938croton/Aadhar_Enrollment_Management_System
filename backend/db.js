// ====================================================
// Database Connection Configuration
// Connects Express backend to MySQL database using mysql2
// ====================================================

const mysql = require("mysql2");
const path = require("path");

// Load environment variables from .env file (supports root or backend folder)
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Create the MySQL connection using environment variables
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "Aadhar"
});

// Connect to the database
db.connect(function (error) {
  if (error) {
    console.error("❌ Database connection failed:");
    console.error("Error Code:", error.code);
    console.error("Please verify your MySQL credentials in backend/.env");
    return;
  }
  console.log("✅ MySQL Database connected successfully! (Database: " + (process.env.DB_NAME || "Aadhar") + ")");
});

module.exports = db;