import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { z } from 'zod';

const router = Router();

const shareSchema = z.object({
  target_department_id: z.number().int().positive(),
  share_amount: z.number().nonnegative(),
  remark: z.string().optional().nullable()
});

const allocationSchema = z.object({
  term_id: z.number().int().positive(),
  class_group_id: z.number().int().positive(),
  student_count: z.number().int().nonnegative(),
  total_practice_hours: z.number().nonnegative().default(0),
  rate_per_head: z.number().positive().default(350),
  created_by: z.string().default('เจ้าหน้าที่แผนงาน'),
  shares: z.array(shareSchema).default([])
});

// GET /api/v1/allocations?term_id={id}&department_id={id|all}
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { term_id, department_id } = req.query;

  if (!term_id) {
    res.status(400).json({ success: false, message: 'term_id is required' });
    return;
  }

  try {
    let query = `
      SELECT 
        ba.id,
        ba.academic_term_id,
        ba.class_group_id,
        ba.student_count,
        ba.total_practice_hours,
        ba.rate_per_head,
        ba.base_budget,
        ba.created_by,
        ba.created_at,
        cg.group_name,
        cg.department_id,
        d.name as department_name,
        d.code as department_code,
        el.id as education_level_id,
        el.name as education_level_name,
        el.code as education_level_code
      FROM budget_allocations ba
      JOIN class_groups cg ON ba.class_group_id = cg.id
      JOIN departments d ON cg.department_id = d.id
      JOIN education_levels el ON cg.education_level_id = el.id
      WHERE ba.academic_term_id = ?
    `;
    const params: any[] = [term_id];

    if (department_id && department_id !== 'all') {
      query += ' AND cg.department_id = ?';
      params.push(department_id);
    }

    query += ' ORDER BY ba.id DESC';

    const [allocations] = await pool.query<RowDataPacket[]>(query, params);

    // Fetch shares for these allocations
    if (allocations.length > 0) {
      const allocIds = allocations.map((a) => a.id);
      const [shares] = await pool.query<RowDataPacket[]>(
        `
        SELECT 
          s.id,
          s.allocation_id,
          s.source_department_id,
          s.target_department_id,
          s.share_amount,
          s.remark,
          td.name as target_department_name,
          td.code as target_department_code
        FROM inter_department_shares s
        JOIN departments td ON s.target_department_id = td.id
        WHERE s.allocation_id IN (?)
      `,
        [allocIds]
      );

      const sharesByAlloc: Record<number, any[]> = {};
      shares.forEach((s) => {
        if (!sharesByAlloc[s.allocation_id]) {
          sharesByAlloc[s.allocation_id] = [];
        }
        sharesByAlloc[s.allocation_id].push(s);
      });

      allocations.forEach((a) => {
        a.shares = sharesByAlloc[a.id] || [];
        a.total_shares = (a.shares as any[]).reduce((sum, s) => sum + Number(s.share_amount), 0);
        a.remaining_budget = Number(a.base_budget) - a.total_shares;
      });
    }

    res.json({ success: true, data: allocations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/allocations
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const parsed = allocationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, errors: parsed.error.format() });
    return;
  }

  const { term_id, class_group_id, student_count, total_practice_hours, rate_per_head, created_by, shares } = parsed.data;

  const conn = await pool.getConnection();
  try {
    // 1. Validation Guard: Academic term must be OPEN
    const [terms] = await conn.query<RowDataPacket[]>(
      'SELECT status FROM academic_terms WHERE id = ?',
      [term_id]
    );

    if (terms.length === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบงวดปีการศึกษานี้' });
      return;
    }

    if (terms[0].status !== 'OPEN') {
      res.status(403).json({
        success: false,
        message: `ไม่สามารถบันทึกได้ เนื่องจากปีการศึกษานี้อยู่ในสถานะ ${terms[0].status} (ปิดงวดแล้ว)`
      });
      return;
    }

    // 2. Fetch class group details to determine source department
    const [groupRows] = await conn.query<RowDataPacket[]>(
      'SELECT id, department_id, group_name FROM class_groups WHERE id = ?',
      [class_group_id]
    );

    if (groupRows.length === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบข้อมูลกลุ่มเรียน' });
      return;
    }

    const sourceDepartmentId = groupRows[0].department_id;
    const baseBudget = student_count * rate_per_head;
    const totalShareAmount = shares.reduce((acc, curr) => acc + curr.share_amount, 0);

    if (totalShareAmount > baseBudget) {
      res.status(400).json({
        success: false,
        message: `ยอดปันส่วน (${totalShareAmount.toLocaleString()} บาท) เกินกว่างบตั้งต้น (${baseBudget.toLocaleString()} บาท)`
      });
      return;
    }

    // 3. Start Transaction
    await conn.beginTransaction();

    // Check if an allocation already exists for this term & group
    const [existing] = await conn.query<RowDataPacket[]>(
      'SELECT id FROM budget_allocations WHERE academic_term_id = ? AND class_group_id = ?',
      [term_id, class_group_id]
    );

    let allocationId: number;
    let actionType: 'CREATE' | 'UPDATE' = 'CREATE';

    if (existing.length > 0) {
      allocationId = existing[0].id;
      actionType = 'UPDATE';
      await conn.query(
        `UPDATE budget_allocations 
         SET student_count = ?, total_practice_hours = ?, rate_per_head = ?, created_by = ?
         WHERE id = ?`,
        [student_count, total_practice_hours, rate_per_head, created_by, allocationId]
      );
      // Remove old shares to replace with new set
      await conn.query('DELETE FROM inter_department_shares WHERE allocation_id = ?', [allocationId]);
    } else {
      const [insertResult] = await conn.query<ResultSetHeader>(
        `INSERT INTO budget_allocations 
         (academic_term_id, class_group_id, student_count, total_practice_hours, rate_per_head, created_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [term_id, class_group_id, student_count, total_practice_hours, rate_per_head, created_by]
      );
      allocationId = insertResult.insertId;
    }

    // Insert inter-department shares
    for (const share of shares) {
      if (share.share_amount > 0) {
        await conn.query(
          `INSERT INTO inter_department_shares 
           (allocation_id, source_department_id, target_department_id, share_amount, remark)
           VALUES (?, ?, ?, ?, ?)`,
          [allocationId, sourceDepartmentId, share.target_department_id, share.share_amount, share.remark || null]
        );
      }
    }

    // 4. Audit Trail Log Snapshot
    const snapshot = {
      action: actionType,
      allocation_id: allocationId,
      academic_term_id: term_id,
      class_group_id,
      group_name: groupRows[0].group_name,
      student_count,
      total_practice_hours,
      rate_per_head,
      base_budget: baseBudget,
      shares,
      timestamp: new Date().toISOString()
    };

    await conn.query(
      `INSERT INTO allocation_logs 
       (academic_term_id, allocation_id, action_type, snapshot_payload, executed_by)
       VALUES (?, ?, ?, ?, ?)`,
      [term_id, allocationId, actionType, JSON.stringify(snapshot), created_by]
    );

    // Commit Transaction
    await conn.commit();

    res.status(201).json({
      success: true,
      message: actionType === 'CREATE' ? 'บันทึกจัดสรรงบประมาณสำเร็จ' : 'ปรับปรุงจัดสรรงบประมาณสำเร็จ',
      data: {
        allocation_id: allocationId,
        base_budget: baseBudget,
        net_budget: baseBudget - totalShareAmount
      }
    });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// PUT /api/v1/allocations/:id
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const parsed = allocationSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, errors: parsed.error.format() });
    return;
  }

  const { student_count, total_practice_hours, rate_per_head, created_by, shares } = req.body;
  const conn = await pool.getConnection();

  try {
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT ba.id, ba.academic_term_id, ba.class_group_id, cg.department_id, cg.group_name, t.status
       FROM budget_allocations ba
       JOIN class_groups cg ON ba.class_group_id = cg.id
       JOIN academic_terms t ON ba.academic_term_id = t.id
       WHERE ba.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบรายการที่ต้องการแก้ไข' });
      return;
    }

    if (rows[0].status !== 'OPEN') {
      res.status(403).json({
        success: false,
        message: 'ไม่สามารถแก้ไขได้เนื่องจากงวดปีการศึกษาถูกปิดแล้ว'
      });
      return;
    }

    const currentAlloc = rows[0];
    const finalStudentCount = student_count !== undefined ? Number(student_count) : currentAlloc.student_count;
    const finalRate = rate_per_head !== undefined ? Number(rate_per_head) : currentAlloc.rate_per_head;
    const finalHours = total_practice_hours !== undefined ? Number(total_practice_hours) : currentAlloc.total_practice_hours;
    const finalCreatedBy = created_by || 'เจ้าหน้าที่แผนงาน';
    const finalShares = shares || [];

    const baseBudget = finalStudentCount * finalRate;
    const totalShareAmount = finalShares.reduce((acc: number, curr: any) => acc + (Number(curr.share_amount) || 0), 0);

    if (totalShareAmount > baseBudget) {
      res.status(400).json({
        success: false,
        message: `ยอดปันส่วน (${totalShareAmount.toLocaleString()} บาท) เกินกว่างบตั้งต้น (${baseBudget.toLocaleString()} บาท)`
      });
      return;
    }

    await conn.beginTransaction();

    await conn.query(
      `UPDATE budget_allocations 
       SET student_count = ?, total_practice_hours = ?, rate_per_head = ?, created_by = ?
       WHERE id = ?`,
      [finalStudentCount, finalHours, finalRate, finalCreatedBy, id]
    );

    // Replace shares
    await conn.query('DELETE FROM inter_department_shares WHERE allocation_id = ?', [id]);
    for (const share of finalShares) {
      if (Number(share.share_amount) > 0) {
        await conn.query(
          `INSERT INTO inter_department_shares 
           (allocation_id, source_department_id, target_department_id, share_amount, remark)
           VALUES (?, ?, ?, ?, ?)`,
          [id, currentAlloc.department_id, share.target_department_id, share.share_amount, share.remark || null]
        );
      }
    }

    // Audit log
    const snapshot = {
      action: 'UPDATE',
      allocation_id: Number(id),
      academic_term_id: currentAlloc.academic_term_id,
      class_group_id: currentAlloc.class_group_id,
      group_name: currentAlloc.group_name,
      student_count: finalStudentCount,
      total_practice_hours: finalHours,
      rate_per_head: finalRate,
      base_budget: baseBudget,
      shares: finalShares,
      timestamp: new Date().toISOString()
    };

    await conn.query(
      `INSERT INTO allocation_logs 
       (academic_term_id, allocation_id, action_type, snapshot_payload, executed_by)
       VALUES (?, ?, 'UPDATE', ?, ?)`,
      [currentAlloc.academic_term_id, id, JSON.stringify(snapshot), finalCreatedBy]
    );

    await conn.commit();

    res.json({
      success: true,
      message: 'ปรับปรุงข้อมูลจัดสรรสำเร็จ',
      data: {
        allocation_id: Number(id),
        base_budget: baseBudget,
        net_budget: baseBudget - totalShareAmount
      }
    });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

// DELETE /api/v1/allocations/:id
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const conn = await pool.getConnection();

  try {
    // Check allocation and term
    const [rows] = await conn.query<RowDataPacket[]>(
      `SELECT ba.id, ba.academic_term_id, t.status 
       FROM budget_allocations ba
       JOIN academic_terms t ON ba.academic_term_id = t.id
       WHERE ba.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบรายการที่ต้องการลบ' });
      return;
    }

    if (rows[0].status !== 'OPEN') {
      res.status(403).json({
        success: false,
        message: 'ไม่สามารถลบได้เนื่องจากงวดปีการศึกษาถูกปิดแล้ว'
      });
      return;
    }

    await conn.beginTransaction();

    // Audit log before delete
    const snapshot = {
      action: 'DELETE',
      allocation_id: Number(id),
      academic_term_id: rows[0].academic_term_id,
      timestamp: new Date().toISOString()
    };

    await conn.query(
      `INSERT INTO allocation_logs 
       (academic_term_id, allocation_id, action_type, snapshot_payload, executed_by)
       VALUES (?, ?, 'DELETE', ?, ?)`,
      [rows[0].academic_term_id, id, JSON.stringify(snapshot), 'เจ้าหน้าที่แผนงาน']
    );

    await conn.query('DELETE FROM budget_allocations WHERE id = ?', [id]);

    await conn.commit();
    res.json({ success: true, message: 'ลบรายการสำเร็จ' });
  } catch (error: any) {
    await conn.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    conn.release();
  }
});

export default router;
