import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'training_budget_db',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});

export async function ensureDatabaseSchema(): Promise<void> {
  try {
    // 1. Check budget_allocations columns
    const [allocCols]: any = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'budget_allocations'
    `);
    const allocColNames = allocCols.map((c: any) => c.COLUMN_NAME);

    if (allocColNames.length > 0) {
      await pool.query('ALTER TABLE budget_allocations MODIFY COLUMN class_group_id INT UNSIGNED NULL');

      if (!allocColNames.includes('department_id')) {
        await pool.query('ALTER TABLE budget_allocations ADD COLUMN department_id INT UNSIGNED NULL AFTER class_group_id');
        try {
          await pool.query('ALTER TABLE budget_allocations ADD CONSTRAINT fk_alloc_dept FOREIGN KEY (department_id) REFERENCES departments(id)');
        } catch { /* ignore if constraint exists */ }
      }

      if (!allocColNames.includes('calculation_type')) {
        await pool.query("ALTER TABLE budget_allocations ADD COLUMN calculation_type ENUM('REGULAR', 'SPECIAL_SUPPLEMENTARY', 'DUAL_EDUCATION', 'SHORT_COURSE') NOT NULL DEFAULT 'REGULAR' AFTER department_id");
      }
      if (!allocColNames.includes('batch_name')) {
        await pool.query('ALTER TABLE budget_allocations ADD COLUMN batch_name VARCHAR(150) NULL AFTER calculation_type');
      }
      if (!allocColNames.includes('step_level')) {
        await pool.query('ALTER TABLE budget_allocations ADD COLUMN step_level VARCHAR(100) NULL AFTER batch_name');
      }
      if (!allocColNames.includes('school_name')) {
        await pool.query('ALTER TABLE budget_allocations ADD COLUMN school_name VARCHAR(255) NULL AFTER step_level');
      }
      if (!allocColNames.includes('course_name')) {
        await pool.query('ALTER TABLE budget_allocations ADD COLUMN course_name VARCHAR(255) NULL AFTER school_name');
      }
    }

    // 2. Check inter_department_shares columns
    const [shareCols]: any = await pool.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'inter_department_shares' AND COLUMN_NAME = 'teaching_hours'
    `);
    if (shareCols.length === 0) {
      await pool.query('ALTER TABLE inter_department_shares ADD COLUMN teaching_hours DECIMAL(6, 2) NULL DEFAULT 0.00 AFTER share_amount');
    }
  } catch (err: any) {
    console.warn('Auto schema check warning:', err.message);
  }
}
