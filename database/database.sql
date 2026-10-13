CREATE DATABASE IF NOT EXISTs Aadhar
CHARACTER SET utf8mb4                       
COLLATE utf8mb4_unicode_ci;

USE  Aadhar;

CREATE TABLE Citizens(
    citizen_id INT AUTO_INCREMENT PRIMARY KEY,
    citizen_name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    gender ENUM('Male' , 'Female', 'Others') NOT NULL,
    mobile_number CHAR(10) NOT NULL
);

CREATE TABLE EnrollmentCenter(
    center_id INT  AUTO_INCREMENT PRIMARY KEY,
    center_name VARCHAR(60) NOT NULL,
    district VARCHAR(60) NOT NULL,
    state VARCHAR(60) NOT NULL
);

CREATE TABLE AadharApplication(
    application_id INT AUTO_INCREMENT PRIMARY KEY ,
    
    citizen_id INT NOT NULL,
    center_id INT NOT NULL,

    application_date DATE NOT NULL,
    status ENUM ('Complete','Pending') NOT NULL,

    FOREIGN KEY(citizen_id)
    REFERENCES Citizens(citizen_id),

    FOREIGN KEY(center_id)
    REFERENCES EnrollmentCenter(center_id)
);

CREATE TABLE BiometricsRecord(
    biometric_id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    
    fingerprint_hasd VARCHAR(255),
    iris_hash VARCHAR(255),

    FOREIGN KEY (application_id)
    REFERENCES AadharApplication(application_id)
);