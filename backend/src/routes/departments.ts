import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';

const router = Router();

const departmentSchema = z.object({
  code: z.string().min(1, 'กรุณาระบุรหัสแผนกวิชา').max(20),
  name: z.string().min(1, 'กรุณาระบุชื่อแผนกวิชา').max(100),
  is_service_department: z.union([z.boolean(), z.number()]).transform((val) => (val ? 1 : 0)).default(0)
});

// GET /api/v1/departments
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT 
         d.id, 
         d.code, 
         d.name, 
         d.is_service_department,
         (SELECT COUNT(*) FROM class_groups cg WHERE cg.department_id = d.id) as group_count
       FROM departments d 
       ORDER BY d.id ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/departments/levels
router.get('/levels', async (_req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT id, code, name FROM education_levels ORDER BY id ASC'
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/departments
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = departmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง', errors: parsed.error.format() });
    return;
  }

  const { code, name, is_service_department } = parsed.data;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO departments (code, name, is_service_department) VALUES (?, ?, ?)',
      [code.trim(), name.trim(), is_service_department]
    );

    res.status(201).json({
      success: true,
      message: 'เพิ่มแผนกวิชาสำเร็จ',
      data: { id: result.insertId, code, name, is_service_department }
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'รหัสแผนกวิชานี้มีอยู่ในระบบแล้ว' });
      return;
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/departments/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const parsed = departmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง', errors: parsed.error.format() });
    return;
  }

  const { code, name, is_service_department } = parsed.data;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE departments SET code = ?, name = ?, is_service_department = ? WHERE id = ?',
      [code.trim(), name.trim(), is_service_department, id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบแผนกวิชาที่ต้องการแก้ไข' });
      return;
    }

    res.json({
      success: true,
      message: 'ปรับปรุงแผนกวิชาสำเร็จ',
      data: { id: Number(id), code, name, is_service_department }
    });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      res.status(400).json({ success: false, message: 'รหัสแผนกวิชานี้มีอยู่ในระบบแล้ว' });
      return;
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/departments/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Check if department is used in class groups
    const [groups] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM class_groups WHERE department_id = ?',
      [id]
    );
    if (groups[0].count > 0) {
      res.status(400).json({
        success: false,
        message: `ไม่สามารถลบได้ เนื่องจากมีกลุ่มเรียนผูกอยู่กับแผนกนี้ ${groups[0].count} กลุ่ม`
      });
      return;
    }

    // Check if used in inter-department shares
    const [shares] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM inter_department_shares WHERE source_department_id = ? OR target_department_id = ?',
      [id, id]
    );
    if (shares[0].count > 0) {
      res.status(400).json({
        success: false,
        message: 'ไม่สามารถลบได้ เนื่องจากมีรายการปันส่วนงบประมาณสอนช่วยผูกพันอยู่'
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM departments WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบแผนกวิชาที่ต้องการลบ' });
      return;
    }

    res.json({ success: true, message: 'ลบแผนกวิชาสำเร็จ' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
