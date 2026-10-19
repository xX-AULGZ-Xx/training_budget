import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';

const router = Router();

// GET /api/v1/summary?term_id={id}&department_id={id|all}&calculation_type={type|all}
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { term_id, department_id, calculation_type } = req.query;

  if (!term_id) {
    res.status(400).json({ success: false, message: 'term_id is required' });
    return;
  }

  const hasCalcType = calculation_type && calculation_type !== 'all';
  const calcCondition = hasCalcType ? ' AND ba.calculation_type = ?' : '';

  try {
    // 1. Department Summary Query (Reconciliation + Level & Calculation Type Breakdown)
    let deptQuery = `
      SELECT 
          d.id AS department_id,
          d.code AS department_code,
          d.name AS department_name,
          d.is_service_department,
          COALESCE(base.student_count, 0) AS student_count,
          COALESCE(base.students_voc, 0) AS students_voc,
          COALESCE(base.students_high_voc, 0) AS students_high_voc,
          COALESCE(base.students_prison, 0) AS students_prison,
          COALESCE(base.total_base_budget, 0.00) AS base_budget,
          COALESCE(base.base_voc, 0.00) AS base_voc,
          COALESCE(base.base_high_voc, 0.00) AS base_high_voc,
          COALESCE(base.base_prison, 0.00) AS base_prison,
          COALESCE(deduct.total_deducted, 0.00) AS total_deducted,
          COALESCE(deduct.deduct_voc, 0.00) AS deduct_voc,
          COALESCE(deduct.deduct_high_voc, 0.00) AS deduct_high_voc,
          COALESCE(deduct.deduct_prison, 0.00) AS deduct_prison,
          COALESCE(trans.total_transferred, 0.00) AS total_transferred,
          COALESCE(trans.trans_voc, 0.00) AS trans_voc,
          COALESCE(trans.trans_high_voc, 0.00) AS trans_high_voc,
          COALESCE(trans.trans_prison, 0.00) AS trans_prison,
          (COALESCE(base.total_base_budget, 0.00) 
           - COALESCE(deduct.total_deducted, 0.00) 
           + COALESCE(trans.total_transferred, 0.00)) AS net_budget,
          (COALESCE(base.base_voc, 0.00)
           - COALESCE(deduct.deduct_voc, 0.00) 
           + COALESCE(trans.trans_voc, 0.00)) AS net_voc,
          (COALESCE(base.base_high_voc, 0.00)
           - COALESCE(deduct.deduct_high_voc, 0.00) 
           + COALESCE(trans.trans_high_voc, 0.00)) AS net_high_voc,
          (COALESCE(base.base_prison, 0.00)
           - COALESCE(deduct.deduct_prison, 0.00) 
           + COALESCE(trans.trans_prison, 0.00)) AS net_prison,
          (COALESCE(base.base_regular, 0.00)
           - COALESCE(deduct.deduct_regular, 0.00) 
           + COALESCE(trans.trans_regular, 0.00)) AS net_regular,
          (COALESCE(base.base_special_supplementary, 0.00)
           - COALESCE(deduct.deduct_special_supplementary, 0.00) 
           + COALESCE(trans.trans_special_supplementary, 0.00)) AS net_special_supplementary,
          (COALESCE(base.base_dual_education, 0.00)
           - COALESCE(deduct.deduct_dual_education, 0.00) 
           + COALESCE(trans.trans_dual_education, 0.00)) AS net_dual_education,
          (COALESCE(base.base_short_course, 0.00)
           - COALESCE(deduct.deduct_short_course, 0.00) 
           + COALESCE(trans.trans_short_course, 0.00)) AS net_short_course
      FROM departments d
      LEFT JOIN (
          SELECT 
            cg.department_id, 
            SUM(ba.student_count) as student_count, 
            SUM(CASE WHEN cg.education_level_id = 1 THEN ba.student_count ELSE 0 END) AS students_voc,
            SUM(CASE WHEN cg.education_level_id = 2 THEN ba.student_count ELSE 0 END) AS students_high_voc,
            SUM(CASE WHEN cg.education_level_id = 3 THEN ba.student_count ELSE 0 END) AS students_prison,
            SUM(ba.base_budget) AS total_base_budget,
            SUM(CASE WHEN cg.education_level_id = 1 THEN ba.base_budget ELSE 0 END) AS base_voc,
            SUM(CASE WHEN cg.education_level_id = 2 THEN ba.base_budget ELSE 0 END) AS base_high_voc,
            SUM(CASE WHEN cg.education_level_id = 3 THEN ba.base_budget ELSE 0 END) AS base_prison,
            SUM(CASE WHEN ba.calculation_type = 'REGULAR' OR ba.calculation_type IS NULL THEN ba.base_budget ELSE 0 END) AS base_regular,
            SUM(CASE WHEN ba.calculation_type = 'SPECIAL_SUPPLEMENTARY' THEN ba.base_budget ELSE 0 END) AS base_special_supplementary,
            SUM(CASE WHEN ba.calculation_type = 'DUAL_EDUCATION' THEN ba.base_budget ELSE 0 END) AS base_dual_education,
            SUM(CASE WHEN ba.calculation_type = 'SHORT_COURSE' THEN ba.base_budget ELSE 0 END) AS base_short_course
          FROM budget_allocations ba
          JOIN class_groups cg ON ba.class_group_id = cg.id
          WHERE ba.academic_term_id = ? ${calcCondition}
          GROUP BY cg.department_id
      ) base ON d.id = base.department_id
      LEFT JOIN (
          SELECT 
            s.source_department_id, 
            SUM(s.share_amount) AS total_deducted,
            SUM(CASE WHEN cg.education_level_id = 1 THEN s.share_amount ELSE 0 END) AS deduct_voc,
            SUM(CASE WHEN cg.education_level_id = 2 THEN s.share_amount ELSE 0 END) AS deduct_high_voc,
            SUM(CASE WHEN cg.education_level_id = 3 THEN s.share_amount ELSE 0 END) AS deduct_prison,
            SUM(CASE WHEN ba.calculation_type = 'REGULAR' OR ba.calculation_type IS NULL THEN s.share_amount ELSE 0 END) AS deduct_regular,
            SUM(CASE WHEN ba.calculation_type = 'SPECIAL_SUPPLEMENTARY' THEN s.share_amount ELSE 0 END) AS deduct_special_supplementary,
            SUM(CASE WHEN ba.calculation_type = 'DUAL_EDUCATION' THEN s.share_amount ELSE 0 END) AS deduct_dual_education,
            SUM(CASE WHEN ba.calculation_type = 'SHORT_COURSE' THEN s.share_amount ELSE 0 END) AS deduct_short_course
          FROM inter_department_shares s
          JOIN budget_allocations ba ON s.allocation_id = ba.id
          JOIN class_groups cg ON ba.class_group_id = cg.id
          WHERE ba.academic_term_id = ? ${calcCondition}
          GROUP BY s.source_department_id
      ) deduct ON d.id = deduct.source_department_id
      LEFT JOIN (
          SELECT 
            s.target_department_id, 
            SUM(s.share_amount) AS total_transferred,
            SUM(CASE WHEN cg.education_level_id = 1 THEN s.share_amount ELSE 0 END) AS trans_voc,
            SUM(CASE WHEN cg.education_level_id = 2 THEN s.share_amount ELSE 0 END) AS trans_high_voc,
            SUM(CASE WHEN cg.education_level_id = 3 THEN s.share_amount ELSE 0 END) AS trans_prison,
            SUM(CASE WHEN ba.calculation_type = 'REGULAR' OR ba.calculation_type IS NULL THEN s.share_amount ELSE 0 END) AS trans_regular,
            SUM(CASE WHEN ba.calculation_type = 'SPECIAL_SUPPLEMENTARY' THEN s.share_amount ELSE 0 END) AS trans_special_supplementary,
            SUM(CASE WHEN ba.calculation_type = 'DUAL_EDUCATION' THEN s.share_amount ELSE 0 END) AS trans_dual_education,
            SUM(CASE WHEN ba.calculation_type = 'SHORT_COURSE' THEN s.share_amount ELSE 0 END) AS trans_short_course
          FROM inter_department_shares s
          JOIN budget_allocations ba ON s.allocation_id = ba.id
          JOIN class_groups cg ON ba.class_group_id = cg.id
          WHERE ba.academic_term_id = ? ${calcCondition}
          GROUP BY s.target_department_id
      ) trans ON d.id = trans.target_department_id
    `;

    const deptParams: any[] = [];
    if (hasCalcType) {
      deptParams.push(term_id, calculation_type, term_id, calculation_type, term_id, calculation_type);
    } else {
      deptParams.push(term_id, term_id, term_id);
    }

    if (department_id && department_id !== 'all') {
      deptQuery += ' WHERE d.id = ?';
      deptParams.push(department_id);
    }

    deptQuery += ' ORDER BY d.id ASC';

    const [deptRows] = await pool.query<RowDataPacket[]>(deptQuery, deptParams);

    // 2. Education Level Breakdown (ปวช. / ปวส. / เรือนจำ)
    const levelParams: any[] = [term_id];
    if (hasCalcType) levelParams.push(calculation_type);

    const [levelRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        el.id,
        el.code,
        el.name,
        COALESCE(SUM(ba.student_count), 0) as student_count,
        COALESCE(SUM(ba.base_budget), 0.00) as base_budget
      FROM education_levels el
      LEFT JOIN class_groups cg ON el.id = cg.education_level_id
      LEFT JOIN budget_allocations ba ON cg.id = ba.class_group_id AND ba.academic_term_id = ? ${calcCondition}
      GROUP BY el.id, el.code, el.name
      ORDER BY el.id ASC
    `,
      levelParams
    );

    // 3. Global KPI Calculations
    const kpiParams: any[] = [term_id];
    if (hasCalcType) kpiParams.push(calculation_type);

    const [kpiRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        COALESCE(COUNT(DISTINCT ba.id), 0) AS total_groups_allocated,
        COALESCE(SUM(ba.student_count), 0) AS total_students,
        COALESCE(SUM(ba.base_budget), 0.00) AS total_base_budget
      FROM budget_allocations ba
      WHERE ba.academic_term_id = ? ${calcCondition}
    `,
      kpiParams
    );

    const [transferKpi] = await pool.query<RowDataPacket[]>(
      `
      SELECT COALESCE(SUM(s.share_amount), 0.00) AS total_inter_shares
      FROM inter_department_shares s
      JOIN budget_allocations ba ON s.allocation_id = ba.id
      WHERE ba.academic_term_id = ? ${calcCondition}
    `,
      kpiParams
    );

    const kpis = {
      total_groups: Number(kpiRows[0]?.total_groups_allocated || 0),
      total_students: Number(kpiRows[0]?.total_students || 0),
      total_base_budget: Number(kpiRows[0]?.total_base_budget || 0),
      total_inter_shares: Number(transferKpi[0]?.total_inter_shares || 0),
      net_budget: Number(kpiRows[0]?.total_base_budget || 0)
    };

    res.json({
      success: true,
      data: {
        kpis,
        departments: deptRows,
        levels: levelRows
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/summary/logs?term_id={id}
router.get('/logs', async (req: Request, res: Response): Promise<void> => {
  const { term_id } = req.query;
  if (!term_id) {
    res.status(400).json({ success: false, message: 'term_id is required' });
    return;
  }

  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, academic_term_id, allocation_id, action_type, snapshot_payload, executed_by, created_at
       FROM allocation_logs 
       WHERE academic_term_id = ?
       ORDER BY id DESC LIMIT 50`,
      [term_id]
    );
    res.json({ success: true, data: rows });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
