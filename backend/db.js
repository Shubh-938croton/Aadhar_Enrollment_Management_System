// ====================================================
// Database Connection Configuration (Connection Pool)
// Connects Express backend to MySQL database using mysql2
// Supports local development and serverless deployments (Vercel, Render, Railway, Aiven, TiDB)
// ====================================================

const mysql = require("mysql2");
const path = require("path");

// Load environment variables from .env file (supports root or backend folder)
require("dotenv").config({ path: path.join(__dirname, ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Auto-detect if connecting to a cloud database (TiDB Cloud, Aiven, PlanetScale, etc.)
const host = process.env.DB_HOST || "localhost";
const isCloudDatabase =
  process.env.DB_SSL === "true" ||
  host.includes("tidbcloud.com") ||
  host.includes("aivencloud.com") ||
  host.includes("psdb.cloud") ||
  host.includes("clever-cloud.com");

// Create a MySQL Connection Pool (safe for both long-running servers and serverless functions)
const db = mysql.createPool({
  host: host,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "Aadhar",
  ssl: isCloudDatabase ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
db.getConnection(function (error, connection) {
  if (error) {
    console.error("❌ Database connection failed:");
    console.error("Error Code:", error.code);
    console.error("Please verify your MySQL credentials in backend/.env or Cloud environment variables.");
    return;
  }
  console.log("✅ MySQL Database connected successfully! (Database: " + (process.env.DB_NAME || "Aadhar") + ")");
  connection.release();
});

module.exports = db;