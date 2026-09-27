import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';

const router = Router();

const classGroupSchema = z.object({
  group_name: z.string().min(1, 'กรุณาระบุชื่อกลุ่มเรียน').max(50),
  department_id: z.number().int().positive('กรุณาเลือกแผนกวิชา'),
  education_level_id: z.number().int().positive('กรุณาเลือกระดับการศึกษา')
});

// GET /api/v1/groups?department_id={id}
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { department_id } = req.query;

  try {
    let query = `
      SELECT 
        cg.id, 
        cg.department_id, 
        cg.education_level_id, 
        cg.group_name,
        d.name as department_name,
        d.code as department_code,
        el.name as education_level_name,
        el.code as education_level_code,
        (SELECT COUNT(*) FROM budget_allocations ba WHERE ba.class_group_id = cg.id) as allocation_count
      FROM class_groups cg
      JOIN departments d ON cg.department_id = d.id
      JOIN education_levels el ON cg.education_level_id = el.id
    `;
    const params: any[] = [];

    if (department_id && department_id !== 'all') {
      query += ' WHERE cg.department_id = ?';
      params.push(department_id);
    }

    query += ' ORDER BY d.id ASC, cg.education_level_id ASC, cg.id ASC';

    const [rows] = await pool.query<RowDataPacket[]>(query, params);
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/groups
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = classGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง', errors: parsed.error.format() });
    return;
  }

  const { group_name, department_id, education_level_id } = parsed.data;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO class_groups (department_id, education_level_id, group_name) VALUES (?, ?, ?)',
      [department_id, education_level_id, group_name.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'เพิ่มกลุ่มเรียนสำเร็จ',
      data: { id: result.insertId, group_name, department_id, education_level_id }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/groups/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const parsed = classGroupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'ข้อมูลไม่ถูกต้อง', errors: parsed.error.format() });
    return;
  }

  const { group_name, department_id, education_level_id } = parsed.data;

  try {
    const [result] = await pool.query<ResultSetHeader>(
      'UPDATE class_groups SET department_id = ?, education_level_id = ?, group_name = ? WHERE id = ?',
      [department_id, education_level_id, group_name.trim(), id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบกลุ่มเรียนที่ต้องการแก้ไข' });
      return;
    }

    res.json({
      success: true,
      message: 'ปรับปรุงกลุ่มเรียนสำเร็จ',
      data: { id: Number(id), group_name, department_id, education_level_id }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/v1/groups/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    // Check if group is used in budget allocations
    const [allocs] = await pool.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM budget_allocations WHERE class_group_id = ?',
      [id]
    );

    if (allocs[0].count > 0) {
      res.status(400).json({
        success: false,
        message: `ไม่สามารถลบกลุ่มเรียนนี้ได้ เนื่องจากมีประวัติการจัดสรรงบประมาณ ${allocs[0].count} รายการ`
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      'DELETE FROM class_groups WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบกลุ่มเรียนที่ต้องการลบ' });
      return;
    }

    res.json({ success: true, message: 'ลบกลุ่มเรียนสำเร็จ' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
