-- ====================================================
-- Aadhaar Enrollment Management System
-- Database Creation & DDL with ON DELETE CASCADE
-- ====================================================

CREATE DATABASE IF NOT EXISTS Aadhar
CHARACTER SET utf8mb4                       
COLLATE utf8mb4_unicode_ci;

USE Aadhar;

-- TABLE 1: Citizens (Parent Table)
CREATE TABLE Citizens (
    citizen_id INT AUTO_INCREMENT PRIMARY KEY,
    citizen_name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    gender ENUM('Male', 'Female', 'Others') NOT NULL,
    mobile_number CHAR(10) NOT NULL
);

-- TABLE 2: EnrollmentCenter (Parent Table)
CREATE TABLE EnrollmentCenter (
    center_id INT AUTO_INCREMENT PRIMARY KEY,
    center_name VARCHAR(60) NOT NULL,
    district VARCHAR(60) NOT NULL,
    state VARCHAR(60) NOT NULL
);

-- TABLE 3: AadharApplication (Child Table - ON DELETE CASCADE)
CREATE TABLE AadharApplication (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    citizen_id INT NOT NULL,
    center_id INT NOT NULL,
    application_date DATE NOT NULL,
    status ENUM('Pending', 'Complete', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',

    CONSTRAINT fk_application_citizen
        FOREIGN KEY (citizen_id)
        REFERENCES Citizens(citizen_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_application_center
        FOREIGN KEY (center_id)
        REFERENCES EnrollmentCenter(center_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- TABLE 4: BiometricRecord (Child Table - ON DELETE CASCADE)
CREATE TABLE BiometricRecord (
    biometric_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    fingerprint_hash VARCHAR(255),
    iris_hash VARCHAR(255),

    CONSTRAINT fk_biometric_application
        FOREIGN KEY (application_id)
        REFERENCES AadharApplication(application_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
