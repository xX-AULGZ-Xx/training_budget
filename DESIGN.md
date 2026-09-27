# System Design Document (design.md)

**Project:** ระบบการคิดคำนวณและจัดสรรงบประมาณค่าวัสดุฝึก (Training Materials Budget Allocation System)

**Target Organization:** วิทยาลัยอาชีวศึกษาเชียงราย

**Architecture Pattern:** Client-Server / Modular Monolith (or Microservices-ready)

**Database Engine:** MySQL 8.0+ (InnoDB)

**Status:** Approved for Implementation

---

## 1. System Overview & Objectives

ระบบถูกออกแบบเพื่อใช้คำนวณ ตรวจสอบ และจัดสรรงบประมาณค่าวัสดุฝึกอบรมรายภาคเรียน/ปีการศึกษา จัดการปัญหาความซับซ้อนของการโอนย้ายงบประมาณข้ามแผนกวิชาเมื่อมีวิชาสอนช่วย (Inter-department Service Courses) พร้อมระบบรายงานผลแบบ Real-time และการสืบค้นข้อมูลย้อนหลัง (Historical Term Audit)

---

## 2. Core Business Logic & Calculation Formula

### 2.1 Base Budget Calculation (การคิดงบตั้งต้นรายกลุ่มเรียน)

$$\text{Base Budget} = \text{student\_count} \times \text{rate\_per\_head}$$

* ค่าเริ่มต้นของอัตราจัดสรร: 350.00 บาท/คน


* คำนวณแบบ Reactive ทันทีที่มีการกรอกจำนวนนักเรียนหรือปรับอัตราต่อหัว



### 2.2 Inter-Department Allocation (การปันส่วนงบแผนกสอนช่วย)

* **แผนกต้นทาง (Source Department):** ถูกบันทึกเป็นรายการ **หักจ่าย (-)**

* **แผนกปลายทาง (Target / Service Department):** ถูกบันทึกเป็นรายการ **รับโอน (+)**


### 2.3 Net Budget Reconciliation (การกระทบยอดสุทธิรายแผนก)

สำหรับแต่ละแผนก $D$:


$$\text{Net Budget}(D) = \text{Base Budget}(D) - \sum \text{Deductions}(D) + \sum \text{TransfersIn}(D)$$

---

## 3. Database Architecture (MySQL 8.0 DDL)

ระบบใช้ความสามารถของ MySQL InnoDB เพื่อความถูกต้องแบบ ACID, รองรับ Generated Columns, JSON Data Type และ Indexing สำหรับข้อมูลย้อนหลัง

```sql
-- -------------------------------------------------------------
-- 1. Academic Terms Master (จัดการงวดปีการศึกษา และประวัติย้อนหลัง)
-- -------------------------------------------------------------
CREATE TABLE `academic_terms` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `academic_year` SMALLINT UNSIGNED NOT NULL, -- เช่น 2568, 2569
    `semester` TINYINT UNSIGNED NOT NULL,       -- 1, 2, 3
    `status` ENUM('OPEN', 'CLOSED', 'ARCHIVED') NOT NULL DEFAULT 'OPEN',
    `is_current` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_term_year_sem` (`academic_year`, `semester`),
    INDEX `idx_term_status` (`status`, `is_current`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 2. Departments Master (แผนกวิชา)
-- -------------------------------------------------------------
CREATE TABLE `departments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE,
    `name` VARCHAR(100) NOT NULL,
    `is_service_department` TINYINT(1) DEFAULT 0,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 3. Education Levels Master (ระดับการศึกษา)
-- -------------------------------------------------------------
CREATE TABLE `education_levels` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `code` VARCHAR(20) NOT NULL UNIQUE, -- 'VOCATIONAL' (ปวช.), 'HIGH_VOCATIONAL' (ปวส.), 'SPECIAL_PRISON' (เรือนจำ)
    `name` VARCHAR(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 4. Class Groups (กลุ่มเรียน)
-- -------------------------------------------------------------
CREATE TABLE `class_groups` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `department_id` INT UNSIGNED NOT NULL,
    `education_level_id` INT UNSIGNED NOT NULL,
    `group_name` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_cg_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`),
    CONSTRAINT `fk_cg_level` FOREIGN KEY (`education_level_id`) REFERENCES `education_levels` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- 5. Budget Allocations (ธุรกรรมตั้งงบประมาณรายกลุ่มเรียน)
-- -------------------------------------------------------------
CREATE TABLE `budget_allocations` (
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

-- -------------------------------------------------------------
-- 6. Inter-Department Shares (การปันส่วนงบให้แผนกสอนช่วย)
-- -------------------------------------------------------------
CREATE TABLE `inter_department_shares` (
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

-- -------------------------------------------------------------
-- 7. Allocation Logs (Audit Trail & Snapshots)
-- -------------------------------------------------------------
CREATE TABLE `allocation_logs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `academic_term_id` INT UNSIGNED NOT NULL,
    `allocation_id` INT UNSIGNED NULL,
    `action_type` ENUM('CREATE', 'UPDATE', 'DELETE') NOT NULL,
    `snapshot_payload` JSON NOT NULL,
    `executed_by` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_term_logs` (`academic_term_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

```

---

## 4. Aggregation Query Architecture (กระทบยอด Real-time)

Query มาตรฐานสำหรับ Summary Dashboard โดยรับพารามิเตอร์ `:term_id` และ `:department_id` (Optional):

```sql
SELECT 
    d.id AS department_id,
    d.name AS department_name,
    COALESCE(base.total_base_budget, 0.00) AS base_budget,
    COALESCE(deduct.total_deducted, 0.00) AS total_deducted,
    COALESCE(trans.total_transferred, 0.00) AS total_transferred,
    (COALESCE(base.total_base_budget, 0.00) 
     - COALESCE(deduct.total_deducted, 0.00) 
     + COALESCE(trans.total_transferred, 0.00)) AS net_budget
FROM departments d
LEFT JOIN (
    SELECT cg.department_id, SUM(ba.base_budget) AS total_base_budget
    FROM budget_allocations ba
    JOIN class_groups cg ON ba.class_group_id = cg.id
    WHERE ba.academic_term_id = :term_id
    GROUP BY cg.department_id
) base ON d.id = base.department_id
LEFT JOIN (
    SELECT s.source_department_id, SUM(s.share_amount) AS total_deducted
    FROM inter_department_shares s
    JOIN budget_allocations ba ON s.allocation_id = ba.id
    WHERE ba.academic_term_id = :term_id
    GROUP BY s.source_department_id
) deduct ON d.id = deduct.source_department_id
LEFT JOIN (
    SELECT s.target_department_id, SUM(s.share_amount) AS total_transferred
    FROM inter_department_shares s
    JOIN budget_allocations ba ON s.allocation_id = ba.id
    WHERE ba.academic_term_id = :term_id
    GROUP BY s.target_department_id
) trans ON d.id = trans.target_department_id
ORDER BY d.id ASC;

```

---

## 5. API Interface Specifications

### 5.1 Terms & Meta Data

* **`GET /api/v1/terms`**
* คืนค่ารายการปีการศึกษาทั้งหมด สำหรับ Dropdown ตัวเลือกด้านบน


* **`GET /api/v1/departments`**
* คืนค่ารายชื่อแผนกวิชาทั้งหมด





### 5.2 Allocation Operations

* **`POST /api/v1/allocations`**
* **Payload:**
```json
{
  "term_id": 1,
  "class_group_id": 12,
  "student_count": 25,
  "total_practice_hours": 18.0,
  "rate_per_head": 350.00,
  "shares": [
    { "target_department_id": 3, "share_amount": 1500.00, "remark": "งานเชื่อมเบื้องต้น" }
  ]
}

```


* **Validation Guards:**
1. ตรวจสอบสถานะ `academic_terms.status == 'OPEN'` (ปฏิเสธด้วย `403 Forbidden` หากเทอมถูกปิดงวด)
2. ทำงานภายใต้ `START TRANSACTION` และ `COMMIT` เสมอ
3. บันทึกสำเนาลง `allocation_logs` พร้อม Payload





### 5.3 Reporting & Summary

* **`GET /api/v1/summary?term_id={id}&department_id={id|all}`**
* คืนค่า KPIs (งบรวมทั้งสิ้น, จำนวนนักเรียนรวม, ยอดปันส่วนภายนอก) และ Record Matrix จำแนกตามระดับ ปวช./ปวส./เรือนจำ




* **`GET /api/v1/reports/pdf?term_id={id}&department_id={id|all}`**
* Stream ไฟล์เอกสาร PDF ทางการสำหรับเปิดดูในแท็บใหม่





---

## 6. Frontend State & UI Architecture

```
                       +------------------------------+
                       | Global State (Term Context)  |
                       |  - selected_term_id          |
                       |  - is_read_only (Term Closed)|
                       +--------------+---------------+
                                      |
              +-----------------------+-----------------------+
              ▼                                               ▼
+-----------------------------+               +-------------------------------+
| Left: Input Form Panel      |               | Right: Summary Dashboard      |
+-----------------------------+               +-------------------------------+
| - Department / Group Select |[cite: 1]     | - Global KPI Summary Cards    |[cite: 1]
| - Headcount & Hours Input   |[cite: 1]     | - Scope Filter Dropdown       |[cite: 1]
| - Reactive Base Budget Box  |[cite: 1]     | - Multi-tier Summary Table    |[cite: 1]
| - Dynamic Share Form Array  |[cite: 1]     |   (ปวช. / ปวส. / เรือนจำ)     |[cite: 1]
| - Log History Accordion     |[cite: 1]     | - PDF Print Action Button     |[cite: 1]
|                             |               |                               |
| *If is_read_only:*          |               | *Data reactive update*        |
|   Disable all inputs        |               | *upon term switch*            |
|   Hide Submit button        |               |                               |
+-----------------------------+               +-------------------------------+

```

---

## 7. Security & Non-Functional Requirements

1. **Data Integrity:** บังคับใช้ Foreign Keys ทุกจุด ห้ามลบข้อมูลหลักแบบ Cascading หากมีรายการผูกพันทางการเงิน (`RESTRICT`)
2. **Financial Precision:** ทุกตัวเลขเงินต้องจัดเก็บด้วย `DECIMAL(12, 2)` ป้องกันปัญหา Floating-point precision error
3. **Idempotency & Concurrency:** รองรับการบันทึกพร้อมกันจากหลายแผนกด้วย Transaction Isolation Level: `READ COMMITTED`
4. **Auditability:** ทุกการทำธุรกรรม (Add/Edit) ต้องมี Snapshot เก็บในรูปแบบ JSON เพื่อการตรวจสอบย้อนหลังตามระเบียบพัสดุและงบประมาณ