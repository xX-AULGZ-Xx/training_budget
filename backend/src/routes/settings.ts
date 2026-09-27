import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';

const router = Router();

// Ensure system_settings table exists and populate defaults
async function ensureSettingsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const defaults: Record<string, string> = {
    college_name: 'วิทยาลัยอาชีวศึกษาเชียงราย',
    college_code: 'CVC',
    affiliation: 'สำนักงานคณะกรรมการการอาชีวศึกษา กระทรวงศึกษาธิการ',
    department_name: 'งานวางแผนและงบประมาณ ฝ่ายแผนงานและความร่วมมือ',
    director_name: 'นายผู้อำนวยการ วิทยาลัยอาชีวศึกษาเชียงราย',
    planner_name: 'หัวหน้างานวางแผนและงบประมาณ',
    default_operator: 'เจ้าหน้าที่แผนงาน',
    default_rate_voc: '350',
    default_rate_high_voc: '350',
    default_rate_prison: '350',
    default_practice_hours: '18',
    fiscal_year_start_month: '10'
  };

  for (const [key, value] of Object.entries(defaults)) {
    await pool.query(
      'INSERT IGNORE INTO system_settings (setting_key, setting_value) VALUES (?, ?)',
      [key, value]
    );
  }
}

// Initialize on module load
ensureSettingsTable().catch(console.error);

// GET /api/v1/settings
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    await ensureSettingsTable();

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT setting_key, setting_value FROM system_settings'
    );

    const settingsObj: Record<string, string> = {};
    rows.forEach((r) => {
      settingsObj[r.setting_key] = r.setting_value;
    });

    // Also get system metrics
    const [terms] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as c FROM academic_terms');
    const [depts] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as c FROM departments');
    const [groups] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as c FROM class_groups');
    const [allocs] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as c FROM budget_allocations');
    const [version] = await pool.query<RowDataPacket[]>('SELECT VERSION() as v');

    res.json({
      success: true,
      data: settingsObj,
      db_status: {
        status: 'connected',
        server_version: version[0]?.v || 'MariaDB 11.4',
        terms_count: terms[0]?.c || 0,
        departments_count: depts[0]?.c || 0,
        groups_count: groups[0]?.c || 0,
        allocations_count: allocs[0]?.c || 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/settings (Save/update settings)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const settings = req.body;
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ success: false, message: 'Invalid payload' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const [key, value] of Object.entries(settings)) {
      if (typeof key === 'string' && value !== undefined && value !== null) {
        await conn.query(
          `INSERT INTO system_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, String(value)]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว' });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// GET /api/v1/settings/db-details (Detailed database status, latency, and table metrics)
router.get('/db-details', async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    const [versionRows] = await pool.query<RowDataPacket[]>('SELECT VERSION() as v');
    const latency = Date.now() - startTime;

    const [tables] = await pool.query<RowDataPacket[]>(`
      SELECT 
        table_name AS name, 
        table_rows AS rows_count,
        ROUND(((data_length + index_length) / 1024), 2) AS size_kb,
        engine,
        table_collation AS collation,
        create_time
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      ORDER BY table_name ASC
    `);

    res.json({
      success: true,
      data: {
        status: 'connected',
        host: process.env.DB_HOST || 'db',
        port: process.env.DB_PORT || '3306',
        host_port: process.env.DB_PORT_HOST || '3307',
        database: process.env.DB_NAME || 'training_budget_db',
        user: process.env.DB_USER || 'root',
        engine: 'MariaDB InnoDB',
        server_version: versionRows[0]?.v || 'MariaDB 11.4',
        latency_ms: latency,
        tables
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/settings/db-ping (Measure database roundtrip ping latency)
router.post('/db-ping', async (_req: Request, res: Response): Promise<void> => {
  const startTime = Date.now();
  try {
    await pool.query('SELECT 1');
    const latency = Date.now() - startTime;
    res.json({ success: true, latency_ms: latency, message: `Ping MariaDB สำเร็จ (${latency} ms)` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/settings/db-export-sql (Generate raw SQL dump for backup/migration)
router.get('/db-export-sql', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [tables] = await pool.query<RowDataPacket[]>('SHOW TABLES');
    const dbName = process.env.DB_NAME || 'training_budget_db';
    const tableKey = `Tables_in_${dbName}`;

    let sqlDump = `-- =============================================================\n`;
    sqlDump += `-- Training Materials Budget Allocation System (SQL Dump)\n`;
    sqlDump += `-- วิทยาลัยอาชีวศึกษาเชียงราย\n`;
    sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
    sqlDump += `-- =============================================================\n\n`;
    sqlDump += `SET FOREIGN_KEY_CHECKS=0;\nSET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";\n\n`;

    for (const t of tables) {
      const tableName = t[tableKey] || Object.values(t)[0];
      const [createRes] = await pool.query<RowDataPacket[]>(`SHOW CREATE TABLE \`${tableName}\``);
      const createSql = (createRes[0] as any)['Create Table'];

      sqlDump += `-- -------------------------------------------------------------\n`;
      sqlDump += `-- Table structure for table \`${tableName}\`\n`;
      sqlDump += `-- -------------------------------------------------------------\n`;
      sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlDump += `${createSql};\n\n`;

      // Dump rows
      const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM \`${tableName}\``);
      if (rows.length > 0) {
        sqlDump += `-- Dumping data for table \`${tableName}\` (${rows.length} rows)\n`;
        for (const row of rows) {
          const keys = Object.keys(row).map((k) => `\`${k}\``).join(', ');
          const values = Object.values(row)
            .map((val) => {
              if (val === null || val === undefined) return 'NULL';
              if (typeof val === 'number') return val;
              if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
              return `'${String(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
            })
            .join(', ');
          sqlDump += `INSERT INTO \`${tableName}\` (${keys}) VALUES (${values});\n`;
        }
        sqlDump += `\n`;
      }
    }

    sqlDump += `SET FOREIGN_KEY_CHECKS=1;\n-- Dump completed successfully.\n`;

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cvc_budget_dump_${new Date().toISOString().slice(0, 10)}.sql"`
    );
    res.send(sqlDump);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/settings/export (Export full system backup JSON)
router.get('/export', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [settings] = await pool.query<RowDataPacket[]>('SELECT * FROM system_settings');
    const [terms] = await pool.query<RowDataPacket[]>('SELECT * FROM academic_terms');
    const [departments] = await pool.query<RowDataPacket[]>('SELECT * FROM departments');
    const [levels] = await pool.query<RowDataPacket[]>('SELECT * FROM education_levels');
    const [groups] = await pool.query<RowDataPacket[]>('SELECT * FROM class_groups');
    const [allocations] = await pool.query<RowDataPacket[]>('SELECT * FROM budget_allocations');
    const [shares] = await pool.query<RowDataPacket[]>('SELECT * FROM inter_department_shares');

    const backupData = {
      system: 'Training Materials Budget Allocation System (CVC)',
      exported_at: new Date().toISOString(),
      data: {
        settings,
        terms,
        departments,
        levels,
        groups,
        allocations,
        shares
      }
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="cvc_budget_backup_${new Date().toISOString().slice(0, 10)}.json"`
    );
    res.json(backupData);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/settings/clear-allocations (Clear only allocations and shares for fresh start)
router.post('/clear-allocations', async (_req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM inter_department_shares');
    await conn.query('DELETE FROM budget_allocations');
    await conn.query('DELETE FROM allocation_logs');
    await conn.commit();
    res.json({ success: true, message: 'ล้างข้อมูลรายการจัดสรรและบันทึกประวัติเรียบร้อยแล้ว' });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// POST /api/v1/settings/reset-demo (Reset and seed demo data)
router.post('/reset-demo', async (_req: Request, res: Response): Promise<void> => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Clear allocations
    await conn.query('DELETE FROM inter_department_shares');
    await conn.query('DELETE FROM budget_allocations');
    await conn.query('DELETE FROM allocation_logs');

    // 2. Ensure current term exists
    const [terms] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM academic_terms WHERE academic_year = 2568 AND semester = 1'
    );
    let termId: number;
    if (terms.length > 0) {
      termId = terms[0].id;
      await conn.query('UPDATE academic_terms SET is_current = 0');
      await conn.query('UPDATE academic_terms SET is_current = 1, status = "OPEN" WHERE id = ?', [termId]);
    } else {
      await conn.query('UPDATE academic_terms SET is_current = 0');
      const [newTerm] = await conn.query<any>(
        'INSERT INTO academic_terms (academic_year, semester, status, is_current) VALUES (2568, 1, "OPEN", 1)'
      );
      termId = newTerm.insertId;
    }

    // 3. Find groups
    const [groups] = await conn.query<RowDataPacket[]>('SELECT id, department_id FROM class_groups LIMIT 3');
    const [serviceDept] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM departments WHERE is_service_department = 1 LIMIT 1'
    );

    if (groups.length > 0) {
      // Create a sample allocation
      const firstGroup = groups[0];
      const [allocResult] = await conn.query<any>(
        'INSERT INTO budget_allocations (academic_term_id, class_group_id, student_count, total_practice_hours, rate_per_head, created_by) VALUES (?, ?, 25, 18, 350.00, "เจ้าหน้าที่แผนงาน")',
        [termId, firstGroup.id]
      );

      if (serviceDept.length > 0) {
        await conn.query(
          'INSERT INTO inter_department_shares (allocation_id, source_department_id, target_department_id, share_amount, remark) VALUES (?, ?, ?, 486.11, "วิชาสัมพันธ์พื้นฐาน")',
          [allocResult.insertId, firstGroup.department_id, serviceDept[0].id]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, message: 'รีเซ็ตและโหลดข้อมูลตัวอย่างสำเร็จ' });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// POST /api/v1/settings/startup (Execute initial system setup wizard)
router.post('/startup', async (req: Request, res: Response): Promise<void> => {
  const {
    settings = {},
    initial_term = {},
    seed_departments = true,
    preset_type = 'full',
    seed_demo_allocations = false
  } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Save all settings
    for (const [key, value] of Object.entries(settings)) {
      if (typeof key === 'string' && value !== undefined && value !== null) {
        await conn.query(
          `INSERT INTO system_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, String(value)]
        );
      }
    }

    // Mark startup completed
    await conn.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES ('startup_completed', '1')
       ON DUPLICATE KEY UPDATE setting_value = '1'`
    );

    // 2. Setup initial academic term
    const year = Number(initial_term.academic_year) || 2568;
    const semester = Number(initial_term.semester) || 1;

    const [existingTerms] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM academic_terms WHERE academic_year = ? AND semester = ?',
      [year, semester]
    );

    await conn.query('UPDATE academic_terms SET is_current = 0');

    let termId: number;
    if (existingTerms.length > 0) {
      termId = existingTerms[0].id;
      await conn.query('UPDATE academic_terms SET is_current = 1, status = "OPEN" WHERE id = ?', [termId]);
    } else {
      const [termRes] = await conn.query<any>(
        'INSERT INTO academic_terms (academic_year, semester, status, is_current) VALUES (?, ?, "OPEN", 1)',
        [year, semester]
      );
      termId = termRes.insertId;
    }

    // 3. Seed Education Levels
    const levels = [
      ['VOC', 'ปวช.'],
      ['HIGH_VOC', 'ปวส.'],
      ['PRISON', 'ปวช.เรือนจำ']
    ];
    for (const [code, name] of levels) {
      await conn.query(
        'INSERT IGNORE INTO education_levels (code, name) VALUES (?, ?)',
        [code, name]
      );
    }

    // 4. Seed Departments by preset
    if (seed_departments && preset_type !== 'none') {
      let deptList: [string, string, number][] = [];

      if (preset_type === 'tech') {
        deptList = [
          ['IT', 'แผนกวิชาเทคโนโลยีสารสนเทศ', 0],
          ['AUTO', 'แผนกวิชาช่างยนต์', 0],
          ['ELEC', 'แผนกวิชาช่างไฟฟ้ากำลัง', 0],
          ['ELECT', 'แผนกวิชาช่างอิเล็กทรอนิกส์', 0],
          ['GEN', 'แผนกวิชาสามัญสัมพันธ์ (วิชาพื้นฐาน)', 1],
          ['LANG', 'แผนกวิชาภาษาต่างประเทศ (สอนช่วย)', 1]
        ];
      } else if (preset_type === 'commerce') {
        deptList = [
          ['ACCT', 'แผนกวิชาการบัญชี', 0],
          ['MKT', 'แผนกวิชาการตลาด', 0],
          ['HOTEL', 'แผนกวิชาการโรงแรมและการท่องเที่ยว', 0],
          ['SEC', 'แผนกวิชาการเลขานุการ', 0],
          ['FOOD', 'แผนกวิชาอาหารและโภชนาการ', 0],
          ['GEN', 'แผนกวิชาสามัญสัมพันธ์ (วิชาพื้นฐาน)', 1],
          ['LANG', 'แผนกวิชาภาษาต่างประเทศ (สอนช่วย)', 1]
        ];
      } else {
        // full (default)
        deptList = [
          ['IT', 'แผนกวิชาเทคโนโลยีสารสนเทศ', 0],
          ['AUTO', 'แผนกวิชาช่างยนต์', 0],
          ['ELEC', 'แผนกวิชาช่างไฟฟ้ากำลัง', 0],
          ['ELECT', 'แผนกวิชาช่างอิเล็กทรอนิกส์', 0],
          ['ACCT', 'แผนกวิชาการบัญชี', 0],
          ['MKT', 'แผนกวิชาการตลาด', 0],
          ['HOTEL', 'แผนกวิชาการโรงแรมและการท่องเที่ยว', 0],
          ['SEC', 'แผนกวิชาการเลขานุการ', 0],
          ['FOOD', 'แผนกวิชาอาหารและโภชนาการ', 0],
          ['CLOTH', 'แผนกวิชาแฟชั่นและสิ่งทอ', 0],
          ['ART', 'แผนกวิชาวิจิตรศิลป์และการออกแบบ', 0],
          ['GEN', 'แผนกวิชาสามัญสัมพันธ์ (วิชาพื้นฐาน)', 1],
          ['LANG', 'แผนกวิชาภาษาต่างประเทศ (สอนช่วย)', 1]
        ];
      }

      for (const [code, name, isService] of deptList) {
        await conn.query(
          'INSERT IGNORE INTO departments (code, name, is_service_department) VALUES (?, ?, ?)',
          [code, name, isService]
        );
      }

      // Check if class groups exist, if 0 seed sample groups
      const [groupsCount] = await conn.query<RowDataPacket[]>('SELECT COUNT(*) as c FROM class_groups');
      if (groupsCount[0].c === 0) {
        const [vocLevel] = await conn.query<RowDataPacket[]>('SELECT id FROM education_levels WHERE code = "VOC" LIMIT 1');
        const [highVocLevel] = await conn.query<RowDataPacket[]>('SELECT id FROM education_levels WHERE code = "HIGH_VOC" LIMIT 1');

        const [depts] = await conn.query<RowDataPacket[]>('SELECT id, code, name FROM departments WHERE is_service_department = 0 LIMIT 4');
        for (const dept of depts) {
          if (vocLevel.length > 0) {
            await conn.query(
              'INSERT INTO class_groups (department_id, education_level_id, group_name) VALUES (?, ?, ?)',
              [dept.id, vocLevel[0].id, `6620${dept.id}01 (ปวช.1 ${dept.name.replace('แผนกวิชา', '')})`]
            );
          }
          if (highVocLevel.length > 0) {
            await conn.query(
              'INSERT INTO class_groups (department_id, education_level_id, group_name) VALUES (?, ?, ?)',
              [dept.id, highVocLevel[0].id, `6630${dept.id}01 (ปวส.1 ${dept.name.replace('แผนกวิชา', '')})`]
            );
          }
        }
      }
    }

    // 5. Seed Demo Allocations if requested
    if (seed_demo_allocations) {
      const [groups] = await conn.query<RowDataPacket[]>('SELECT id, department_id FROM class_groups LIMIT 3');
      const [serviceDept] = await conn.query<RowDataPacket[]>('SELECT id FROM departments WHERE is_service_department = 1 LIMIT 1');

      if (groups.length > 0) {
        const firstGroup = groups[0];
        const [allocRes] = await conn.query<any>(
          `INSERT INTO budget_allocations (academic_term_id, class_group_id, student_count, total_practice_hours, rate_per_head, created_by)
           VALUES (?, ?, 25, 18, 350.00, ?)`,
          [termId, firstGroup.id, settings.default_operator || 'เจ้าหน้าที่แผนงาน']
        );

        if (serviceDept.length > 0) {
          await conn.query(
            `INSERT INTO inter_department_shares (allocation_id, source_department_id, target_department_id, share_amount, remark)
             VALUES (?, ?, ?, 486.11, "วิชาสามัญสัมพันธ์พื้นฐาน")`,
            [allocRes.insertId, firstGroup.department_id, serviceDept[0].id]
          );
        }
      }
    }

    await conn.commit();
    res.json({
      success: true,
      message: 'เริ่มต้นระบบ (Start Up Setup) และตั้งค่างวดปีการศึกษาสำเร็จแล้ว',
      data: { term_id: termId }
    });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

export default router;
