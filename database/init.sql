-- Create database
CREATE DATABASE IF NOT EXISTS attendance_system;
USE attendance_system;

-- Teachers table
CREATE TABLE teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ethereum_address VARCHAR(42) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subjects table
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance records table
CREATE TABLE attendance_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    blockchain_id INT UNIQUE NOT NULL,
    student_name VARCHAR(100) NOT NULL,  -- Store actual name from blockchain
    subject_name VARCHAR(100) NOT NULL,  -- Store actual subject from blockchain
    teacher_address VARCHAR(42) NOT NULL, -- Store teacher's ethereum address
    is_present BOOLEAN NOT NULL,
    blockchain_timestamp TIMESTAMP NOT NULL,
    transaction_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blockchain_id (blockchain_id),
    INDEX idx_teacher_address (teacher_address),
    INDEX idx_student_name (student_name)
);