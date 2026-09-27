import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

const router = Router();

// GET /api/v1/terms
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT 
        t.id, 
        t.academic_year, 
        t.semester, 
        t.status, 
        t.is_current, 
        t.created_at, 
        t.updated_at,
        COUNT(b.id) AS allocation_count
      FROM academic_terms t
      LEFT JOIN budget_allocations b ON b.academic_term_id = t.id
      GROUP BY t.id
      ORDER BY t.academic_year DESC, t.semester DESC
    `);
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/terms (Create new academic term)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { academic_year, semester, status = 'OPEN', is_current = 0 } = req.body;

  const yearNum = Number(academic_year);
  const semNum = Number(semester);

  if (!yearNum || yearNum < 2500 || yearNum > 2700) {
    res.status(400).json({ success: false, message: 'กรุณาระบุปีการศึกษาให้ถูกต้อง (เช่น 2567, 2568)' });
    return;
  }

  if (!semNum || ![1, 2, 3].includes(semNum)) {
    res.status(400).json({ success: false, message: 'กรุณาระบุภาคเรียน (1, 2 หรือ 3)' });
    return;
  }

  if (!['OPEN', 'CLOSED', 'ARCHIVED'].includes(status)) {
    res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง (OPEN, CLOSED, ARCHIVED)' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check duplicate
    const [existing] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM academic_terms WHERE academic_year = ? AND semester = ?',
      [yearNum, semNum]
    );

    if (existing.length > 0) {
      await conn.rollback();
      res.status(400).json({
        success: false,
        message: `ภาคเรียนที่ ${semNum}/${yearNum} มีอยู่ในระบบแล้ว`
      });
      return;
    }

    const currentFlag = is_current ? 1 : 0;
    if (currentFlag === 1) {
      await conn.query('UPDATE academic_terms SET is_current = 0');
    }

    const [result] = await conn.query<ResultSetHeader>(
      'INSERT INTO academic_terms (academic_year, semester, status, is_current) VALUES (?, ?, ?, ?)',
      [yearNum, semNum, status, currentFlag]
    );

    await conn.commit();
    res.status(201).json({
      success: true,
      message: `สร้างปีการศึกษา ${semNum}/${yearNum} สำเร็จ`,
      data: { id: result.insertId, academic_year: yearNum, semester: semNum, status, is_current: currentFlag }
    });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/terms/:id (Update term)
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { academic_year, semester, status, is_current } = req.body;

  const yearNum = Number(academic_year);
  const semNum = Number(semester);

  if (!yearNum || yearNum < 2500 || yearNum > 2700) {
    res.status(400).json({ success: false, message: 'กรุณาระบุปีการศึกษาให้ถูกต้อง' });
    return;
  }

  if (!semNum || ![1, 2, 3].includes(semNum)) {
    res.status(400).json({ success: false, message: 'กรุณาระบุภาคเรียน (1, 2 หรือ 3)' });
    return;
  }

  if (status && !['OPEN', 'CLOSED', 'ARCHIVED'].includes(status)) {
    res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Check duplicate
    const [existing] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM academic_terms WHERE academic_year = ? AND semester = ? AND id != ?',
      [yearNum, semNum, id]
    );

    if (existing.length > 0) {
      await conn.rollback();
      res.status(400).json({
        success: false,
        message: `ภาคเรียนที่ ${semNum}/${yearNum} ซ้ำกับรายการอื่นในระบบ`
      });
      return;
    }

    const currentFlag = is_current ? 1 : 0;
    if (currentFlag === 1) {
      await conn.query('UPDATE academic_terms SET is_current = 0 WHERE id != ?', [id]);
    }

    await conn.query(
      'UPDATE academic_terms SET academic_year = ?, semester = ?, status = COALESCE(?, status), is_current = ? WHERE id = ?',
      [yearNum, semNum, status, currentFlag, id]
    );

    await conn.commit();
    res.json({ success: true, message: `อัปเดตข้อมูลภาคเรียนที่ ${semNum}/${yearNum} สำเร็จ` });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// PATCH /api/v1/terms/:id/status (Toggle/Change status: OPEN, CLOSED, ARCHIVED)
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['OPEN', 'CLOSED', 'ARCHIVED'].includes(status)) {
    res.status(400).json({ success: false, message: 'Invalid status' });
    return;
  }

  try {
    await pool.query('UPDATE academic_terms SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: `Term status updated to ${status}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/v1/terms/:id/current (Set this term as active current term)
router.patch('/:id/current', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('UPDATE academic_terms SET is_current = 0');
    await conn.query('UPDATE academic_terms SET is_current = 1 WHERE id = ?', [id]);
    await conn.commit();
    res.json({ success: true, message: 'ตั้งเป็นภาคเรียนปัจจุบันสำเร็จ' });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/terms/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    // Check if term exists
    const [terms] = await pool.query<RowDataPacket[]>(
      'SELECT academic_year, semester, is_current FROM academic_terms WHERE id = ?',
      [id]
    );

    if (terms.length === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบข้อมูลภาคเรียน' });
      return;
    }

    // Check if allocations exist
    const [allocations] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM budget_allocations WHERE academic_term_id = ?',
      [id]
    );

    const allocCount = allocations[0]?.count || 0;
    if (allocCount > 0) {
      res.status(400).json({
        success: false,
        message: `ไม่สามารถลบภาคเรียนที่ ${terms[0].semester}/${terms[0].academic_year} ได้ เนื่องจากมีข้อมูลการจัดสรรงบประมาณอยู่ ${allocCount} รายการ กรุณาลบรายการจัดสรรก่อน`
      });
      return;
    }

    await pool.query('DELETE FROM academic_terms WHERE id = ?', [id]);
    res.json({ success: true, message: `ลบภาคเรียนที่ ${terms[0].semester}/${terms[0].academic_year} สำเร็จ` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

