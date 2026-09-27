import { Router, Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket } from 'mysql2';
import PDFDocument from 'pdfkit';

const router = Router();

// GET /api/v1/reports/pdf?term_id={id}&department_id={id|all}
router.get('/pdf', async (req: Request, res: Response): Promise<void> => {
  const { term_id, department_id } = req.query;

  if (!term_id) {
    res.status(400).json({ success: false, message: 'term_id is required' });
    return;
  }

  try {
    // 1. Fetch term info
    const [terms] = await pool.query<RowDataPacket[]>(
      'SELECT academic_year, semester, status FROM academic_terms WHERE id = ?',
      [term_id]
    );

    if (terms.length === 0) {
      res.status(404).json({ success: false, message: 'ไม่พบปีการศึกษา' });
      return;
    }
    const term = terms[0];

    // 2. Fetch Department Summary
    let deptQuery = `
      SELECT 
          d.id AS department_id,
          d.code AS department_code,
          d.name AS department_name,
          COALESCE(base.student_count, 0) AS student_count,
          COALESCE(base.total_base_budget, 0.00) AS base_budget,
          COALESCE(deduct.total_deducted, 0.00) AS total_deducted,
          COALESCE(trans.total_transferred, 0.00) AS total_transferred,
          (COALESCE(base.total_base_budget, 0.00) 
           - COALESCE(deduct.total_deducted, 0.00) 
           + COALESCE(trans.total_transferred, 0.00)) AS net_budget
      FROM departments d
      LEFT JOIN (
          SELECT cg.department_id, SUM(ba.student_count) as student_count, SUM(ba.base_budget) AS total_base_budget
          FROM budget_allocations ba
          JOIN class_groups cg ON ba.class_group_id = cg.id
          WHERE ba.academic_term_id = ?
          GROUP BY cg.department_id
      ) base ON d.id = base.department_id
      LEFT JOIN (
          SELECT s.source_department_id, SUM(s.share_amount) AS total_deducted
          FROM inter_department_shares s
          JOIN budget_allocations ba ON s.allocation_id = ba.id
          WHERE ba.academic_term_id = ?
          GROUP BY s.source_department_id
      ) deduct ON d.id = deduct.source_department_id
      LEFT JOIN (
          SELECT s.target_department_id, SUM(s.share_amount) AS total_transferred
          FROM inter_department_shares s
          JOIN budget_allocations ba ON s.allocation_id = ba.id
          WHERE ba.academic_term_id = ?
          GROUP BY s.target_department_id
      ) trans ON d.id = trans.target_department_id
    `;
    const deptParams: any[] = [term_id, term_id, term_id];

    if (department_id && department_id !== 'all') {
      deptQuery += ' WHERE d.id = ?';
      deptParams.push(department_id);
    }
    deptQuery += ' ORDER BY d.id ASC';

    const [departments] = await pool.query<RowDataPacket[]>(deptQuery, deptParams);

    // Create PDF Document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="training_budget_report_term_${term.semester}_${term.academic_year}.pdf"`
    );

    doc.pipe(res);

    // Header Title
    doc.fontSize(18).text('Chiang Rai Vocational College', { align: 'center' });
    doc.fontSize(14).text('Training Materials Budget Allocation Report', { align: 'center' });
    doc.fontSize(11).text(
      `Academic Term: Semester ${term.semester} / Year ${term.academic_year}  |  Status: ${term.status}`,
      { align: 'center' }
    );
    doc.moveDown(1.5);

    // Table Header
    const tableTop = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Dept Code', 40, tableTop);
    doc.text('Department Name', 105, tableTop);
    doc.text('Students', 250, tableTop, { width: 50, align: 'right' });
    doc.text('Base Budget', 310, tableTop, { width: 70, align: 'right' });
    doc.text('Deducted (-)', 385, tableTop, { width: 65, align: 'right' });
    doc.text('Transfer (+)', 455, tableTop, { width: 65, align: 'right' });
    doc.text('Net Budget', 525, tableTop, { width: 70, align: 'right' });

    doc.moveTo(40, tableTop + 14).lineTo(595, tableTop + 14).stroke('#cccccc');

    let currentY = tableTop + 20;
    doc.font('Helvetica');

    let totalStudents = 0;
    let totalBase = 0;
    let totalDeduct = 0;
    let totalTrans = 0;
    let totalNet = 0;

    departments.forEach((dept) => {
      if (currentY > 750) {
        doc.addPage();
        currentY = 40;
      }

      const students = Number(dept.student_count);
      const base = Number(dept.base_budget);
      const deducted = Number(dept.total_deducted);
      const transferred = Number(dept.total_transferred);
      const net = Number(dept.net_budget);

      totalStudents += students;
      totalBase += base;
      totalDeduct += deducted;
      totalTrans += transferred;
      totalNet += net;

      doc.fontSize(8);
      doc.text(dept.department_code || '', 40, currentY);
      doc.text(dept.department_name || '', 105, currentY, { width: 140, ellipsis: true });
      doc.text(students.toLocaleString(), 250, currentY, { width: 50, align: 'right' });
      doc.text(base.toLocaleString('en-US', { minimumFractionDigits: 2 }), 310, currentY, { width: 70, align: 'right' });
      doc.text(deducted.toLocaleString('en-US', { minimumFractionDigits: 2 }), 385, currentY, { width: 65, align: 'right' });
      doc.text(transferred.toLocaleString('en-US', { minimumFractionDigits: 2 }), 455, currentY, { width: 65, align: 'right' });
      doc.text(net.toLocaleString('en-US', { minimumFractionDigits: 2 }), 525, currentY, { width: 70, align: 'right' });

      currentY += 18;
    });

    // Total Line
    doc.moveTo(40, currentY).lineTo(595, currentY).stroke('#333333');
    currentY += 6;
    doc.font('Helvetica-Bold').fontSize(8.5);
    doc.text('TOTAL SUMMARY', 105, currentY);
    doc.text(totalStudents.toLocaleString(), 250, currentY, { width: 50, align: 'right' });
    doc.text(totalBase.toLocaleString('en-US', { minimumFractionDigits: 2 }), 310, currentY, { width: 70, align: 'right' });
    doc.text(totalDeduct.toLocaleString('en-US', { minimumFractionDigits: 2 }), 385, currentY, { width: 65, align: 'right' });
    doc.text(totalTrans.toLocaleString('en-US', { minimumFractionDigits: 2 }), 455, currentY, { width: 65, align: 'right' });
    doc.text(totalNet.toLocaleString('en-US', { minimumFractionDigits: 2 }), 525, currentY, { width: 70, align: 'right' });

    // Footer Signatures
    currentY += 60;
    if (currentY > 720) {
      doc.addPage();
      currentY = 60;
    }
    doc.fontSize(9).font('Helvetica');
    doc.text('Prepared by: ............................................', 60, currentY);
    doc.text('Approved by: ............................................', 350, currentY);
    currentY += 15;
    doc.text('( Planning & Budgeting Officer )', 80, currentY);
    doc.text('( College Director / Vice Director )', 370, currentY);

    doc.end();
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
