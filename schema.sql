-- Database initialization script for Training Materials Budget Allocation System
CREATE DATABASE IF NOT EXISTS `training_budget_db` 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE `training_budget_db`;

-- 1. Academic Terms Master
CREATE TABLE IF NOT EXISTS `academic_terms` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `academic_year` SMALLINT UNSIGNED NOT NULL,
    `semester` TINYINT UNSIGNED NOT NULL,
    `status` ENUM('OPEN', 'CLOSED', 'ARCHIVED') NOT NULL DEFAULT 'OPEN',
    `is_current` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_term_year_sem` (`academic_year`, `semester`),
    INDEX `idx_term_status` (`status`, `is_current`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Departments Master
CREATE TABLE IF NOT EXISTS `departments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `is_service_department` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Education Levels Master
CREATE TABLE IF NOT EXISTS `education_levels` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Class Groups
CREATE TABLE IF NOT EXISTS `class_groups` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `department_id` INT UNSIGNED NOT NULL,
    `education_level_id` INT UNSIGNED NOT NULL,
    `group_name` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cg_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
    CONSTRAINT `fk_cg_level` FOREIGN KEY (`education_level_id`) REFERENCES `education_levels` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Budget Allocations
CREATE TABLE IF NOT EXISTS `budget_allocations` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `academic_term_id` INT UNSIGNED NOT NULL,
    `class_group_id` INT UNSIGNED NOT NULL,
    `student_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `total_practice_hours` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `rate_per_head` DECIMAL(8, 2) NOT NULL DEFAULT 350.00,
    `base_budget` DECIMAL(12, 2) GENERATED ALWAYS AS (`student_count` * `rate_per_head`) STORED,
    `created_by` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_alloc_term` FOREIGN KEY (`academic_term_id`) REFERENCES `academic_terms` (`id`),
    CONSTRAINT `fk_alloc_group` FOREIGN KEY (`class_group_id`) REFERENCES `class_groups` (`id`),
    INDEX `idx_term_alloc` (`academic_term_id`, `class_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Inter-Department Shares
CREATE TABLE IF NOT EXISTS `inter_department_shares` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `allocation_id` INT UNSIGNED NOT NULL,
    `source_department_id` INT UNSIGNED NOT NULL,
    `target_department_id` INT UNSIGNED NOT NULL,
    `share_amount` DECIMAL(12, 2) NOT NULL,
    `remark` VARCHAR(255) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_share_alloc` FOREIGN KEY (`allocation_id`) REFERENCES `budget_allocations` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_share_src` FOREIGN KEY (`source_department_id`) REFERENCES `departments` (`id`),
    CONSTRAINT `fk_share_tgt` FOREIGN KEY (`target_department_id`) REFERENCES `departments` (`id`),
    INDEX `idx_share_src_tgt` (`source_department_id`, `target_department_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Allocation Logs (Audit Trail & Snapshots)
CREATE TABLE IF NOT EXISTS `allocation_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `academic_term_id` INT UNSIGNED NOT NULL,
    `allocation_id` INT UNSIGNED NULL,
    `action_type` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    `snapshot_payload` JSON NOT NULL,
    `executed_by` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_term_logs` (`academic_term_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initial Seed Data
INSERT IGNORE INTO `academic_terms` (`id`, `academic_year`, `semester`, `status`, `is_current`) VALUES
(1, 2568, 1, 'OPEN', 1),
(2, 2567, 2, 'CLOSED', 0),
(3, 2567, 1, 'ARCHIVED', 0);

INSERT IGNORE INTO `education_levels` (`id`, `code`, `name`) VALUES
(1, 'VOCATIONAL', 'ระดับ ปวช.'),
(2, 'HIGH_VOCATIONAL', 'ระดับ ปวส.'),
(3, 'SPECIAL_PRISON', 'โครงการพิเศษเรือนจำ');

INSERT IGNORE INTO `departments` (`id`, `code`, `name`, `is_service_department`) VALUES
(1, 'AUTO', 'ช่างยนต์', 0),
(2, 'MECH', 'ช่างกลโรงงาน', 0),
(3, 'ELEC', 'ช่างไฟฟ้ากำลัง', 0),
(4, 'AC', 'การบัญชี', 0),
(5, 'MK', 'การตลาด', 0),
(6, 'IT', 'เทคโนโลยีสารสนเทศ (สอนช่วย)', 1),
(7, 'FD', 'อาหารและโภชนาการ', 0),
(8, 'HT', 'การโรงแรมและการท่องเที่ยว', 0),
(9, 'GEN', 'แผนกวิชาสามัญสัมพันธ์ (สอนช่วย)', 1);

INSERT IGNORE INTO `class_groups` (`id`, `department_id`, `education_level_id`, `group_name`) VALUES
(1, 1, 1, 'ปวช.1 ช่างยนต์ 1'),
(2, 1, 2, 'ปวส.1 ช่างยนต์ 1'),
(3, 1, 3, 'โครงการเรือนจำ ช่างยนต์'),
(4, 2, 1, 'ปวช.1 ช่างกลโรงงาน 1'),
(5, 2, 2, 'ปวส.1 ช่างกลโรงงาน 1'),
(6, 3, 1, 'ปวช.1 ช่างไฟฟ้า 1'),
(7, 4, 1, 'ปวช.1 การบัญชี 1'),
(8, 4, 2, 'ปวส.1 การบัญชี 1'),
(9, 6, 1, 'ปวช.1 เทคโนโลยีสารสนเทศ 1'),
(10, 7, 3, 'โครงการเรือนจำ อาหารและโภชนาการ');
