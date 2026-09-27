import React, { useState, useEffect } from 'react';
import { Department, ClassGroup, EducationLevel, ShareItem, Allocation } from '../types';
import { Plus, Trash2, Calculator, AlertCircle, Save, CheckCircle2, RotateCcw } from 'lucide-react';

interface AllocationFormProps {
  termId: number;
  isReadOnly: boolean;
  departments: Department[];
  classGroups: ClassGroup[];
  educationLevels?: EducationLevel[];
  allocations: Allocation[];
  onSuccess: () => void;
}

export const AllocationForm: React.FC<AllocationFormProps> = ({
  termId,
  isReadOnly,
  departments,
  classGroups,
  educationLevels = [],
  allocations,
  onSuccess
}) => {
  // Cascaded Selection States (Matching user design: แผนกวิชา -> [ระดับ] [เลือกกลุ่ม])
  const [selectedDeptId, setSelectedDeptId] = useState<number | ''>('');
  const [selectedLevelId, setSelectedLevelId] = useState<number | 'all'>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');

  // Calculation Inputs
  const [studentCount, setStudentCount] = useState<number | ''>('');
  const [practiceHours, setPracticeHours] = useState<number | ''>('');
  const [ratePerHead, setRatePerHead] = useState<number | ''>('');
  const [createdBy, setCreatedBy] = useState<string>('เจ้าหน้าที่แผนงาน');
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Auto-populate form when selecting an existing class group or clear when empty/new
  useEffect(() => {
    if (!selectedGroupId) {
      setStudentCount('');
      setPracticeHours('');
      setRatePerHead('');
      setShares([]);
      return;
    }
    const existing = allocations.find((a) => a.class_group_id === Number(selectedGroupId));
    if (existing) {
      setStudentCount(existing.student_count);
      setPracticeHours(existing.total_practice_hours);
      setRatePerHead(existing.rate_per_head);
      setCreatedBy(existing.created_by || 'เจ้าหน้าที่แผนงาน');
      setShares(
        existing.shares?.map((s) => ({
          target_department_id: s.target_department_id,
          share_amount: Number(s.share_amount),
          remark: s.remark || ''
        })) || []
      );
    } else {
      setStudentCount('');
      setPracticeHours('');
      setRatePerHead('');
      setShares([]);
    }
  }, [selectedGroupId, allocations]);

  // Handle cascaded filter changes
  const handleDepartmentChange = (deptId: number | '') => {
    setSelectedDeptId(deptId);
    // If the currently selected group doesn't belong to the new department, reset group
    if (selectedGroupId && deptId !== '') {
      const curGroup = classGroups.find((g) => g.id === Number(selectedGroupId));
      if (curGroup && curGroup.department_id !== Number(deptId)) {
        setSelectedGroupId('');
      }
    }
  };

  const handleLevelChange = (levelId: number | 'all') => {
    setSelectedLevelId(levelId);
    if (selectedGroupId && levelId !== 'all') {
      const curGroup = classGroups.find((g) => g.id === Number(selectedGroupId));
      if (curGroup && curGroup.education_level_id !== Number(levelId)) {
        setSelectedGroupId('');
      }
    }
  };

  const handleGroupChange = (groupId: number | '') => {
    setSelectedGroupId(groupId);
    if (groupId) {
      const group = classGroups.find((g) => g.id === Number(groupId));
      if (group) {
        if (!selectedDeptId || selectedDeptId !== group.department_id) {
          setSelectedDeptId(group.department_id);
        }
        if (selectedLevelId !== group.education_level_id) {
          setSelectedLevelId(group.education_level_id);
        }
      }
    }
  };

  // Filter groups by selected department and selected education level
  const availableGroups = classGroups.filter((g) => {
    const matchDept = !selectedDeptId || g.department_id === Number(selectedDeptId);
    const matchLevel = selectedLevelId === 'all' || g.education_level_id === Number(selectedLevelId);
    return matchDept && matchLevel;
  });

  // Clean numerical conversion
  const studentNum = typeof studentCount === 'number' ? studentCount : (parseInt(studentCount as any) || 0);
  const practiceNum = typeof practiceHours === 'number' ? practiceHours : (parseFloat(practiceHours as any) || 0);
  const rateNum = typeof ratePerHead === 'number' ? ratePerHead : (parseFloat(ratePerHead as any) || 0);

  // Reactive Base Budget Calculation
  const baseBudget = Math.max(0, studentNum * rateNum);
  const totalShares = shares.reduce((acc, curr) => acc + (Number(curr.share_amount) || 0), 0);
  const netDepartmentBudget = baseBudget - totalShares;
  const isOverBudget = totalShares > baseBudget;

  // Selected Group's Department
  const selectedGroup = classGroups.find((g) => g.id === Number(selectedGroupId));

  // Available service departments (exclude group's own department)
  const availableTargetDepts = departments.filter(
    (d) => d.id !== selectedGroup?.department_id
  );

  const handleResetForm = () => {
    setSelectedDeptId('');
    setSelectedLevelId('all');
    setSelectedGroupId('');
    setStudentCount('');
    setPracticeHours('');
    setRatePerHead('');
    setShares([]);
    setErrorMessage(null);
  };

  const handleAddShare = () => {
    if (availableTargetDepts.length === 0) return;
    setShares([
      ...shares,
      {
        target_department_id: availableTargetDepts[0].id,
        share_amount: 0,
        remark: ''
      }
    ]);
  };

  const handleRemoveShare = (index: number) => {
    setShares(shares.filter((_, idx) => idx !== index));
  };

  const handleShareChange = (index: number, field: keyof ShareItem, value: any) => {
    const updated = [...shares];
    updated[index] = { ...updated[index], [field]: value };
    setShares(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!selectedGroupId) {
      setErrorMessage('กรุณาเลือกกลุ่มเรียนที่ต้องการจัดสรร');
      return;
    }
    if (studentNum <= 0) {
      setErrorMessage('กรุณาระบุจำนวนนักเรียน (คน)');
      return;
    }
    if (rateNum <= 0) {
      setErrorMessage('กรุณาระบุอัตราต่อหัว (บาท)');
      return;
    }
    if (isOverBudget) {
      setErrorMessage('ยอดปันส่วนให้แผนกสอนช่วย เกินกว่างบตั้งต้น');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/v1/allocations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          term_id: termId,
          class_group_id: Number(selectedGroupId),
          student_count: studentNum,
          total_practice_hours: practiceNum,
          rate_per_head: rateNum,
          created_by: createdBy,
          shares: shares.filter((s) => s.share_amount > 0)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'บันทึกข้อมูลล้มเหลว');
      }

      setSuccessMessage('บันทึกข้อมูลและคำนวณงบประมาณสำเร็จ');
      onSuccess();
      handleResetForm();
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasFormContent =
    selectedDeptId !== '' ||
    selectedGroupId !== '' ||
    studentCount !== '' ||
    practiceHours !== '' ||
    ratePerHead !== '' ||
    shares.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-2xs border border-slate-200/90 overflow-hidden flex flex-col h-full">
      {/* Panel Header */}
      <div className="bg-slate-50/70 border-b border-slate-200/80 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              แบบฟอร์มจัดสรรงบประมาณ
            </h2>
            <p className="text-[11px] text-slate-500">บันทึกงบตั้งต้นและปันส่วนสอนช่วย</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasFormContent && !isReadOnly && (
            <button
              type="button"
              onClick={handleResetForm}
              className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center space-x-1 px-2 py-0.5 rounded border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
              title="ล้างค่าทั้งหมดในฟอร์ม"
            >
              <RotateCcw className="w-3 h-3" />
              <span>ล้างค่า</span>
            </button>
          )}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 uppercase tracking-wider">
            Reactive
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* 1. Cascaded Department & Class Group Selection (Matching user image request) */}
          <div className="space-y-3">
            {/* 1.1 แผนกวิชา */}
            <div>
              <label className="block text-xs font-bold text-indigo-600 mb-1.5">
                แผนกวิชา
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) =>
                  handleDepartmentChange(e.target.value === '' ? '' : Number(e.target.value))
                }
                disabled={isReadOnly}
                className="w-full bg-slate-50/80 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
              >
                <option value="">--- เลือกแผนกวิชา ---</option>
                {departments
                  .filter((d) => !d.is_service_department || classGroups.some((g) => g.department_id === d.id))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
              </select>
            </div>

            {/* 1.2 ชื่อกลุ่มเรียน */}
            <div>
              <label className="block text-xs font-bold text-indigo-600 mb-1.5">
                ชื่อกลุ่มเรียน
              </label>
              <div className="grid grid-cols-[96px_1fr] sm:grid-cols-[105px_1fr] gap-2">
                {/* เลือกระดับ (ปวช./ปวส./เรือนจำ/เลือก) */}
                <select
                  value={selectedLevelId}
                  onChange={(e) =>
                    handleLevelChange(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  }
                  disabled={isReadOnly}
                  className="w-full bg-slate-50/80 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="all">เลือก</option>
                  {educationLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      {lvl.name}
                    </option>
                  ))}
                </select>

                {/* เลือกกลุ่ม */}
                <select
                  value={selectedGroupId}
                  onChange={(e) =>
                    handleGroupChange(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  disabled={isReadOnly}
                  className="w-full bg-slate-50/80 border border-slate-300 text-slate-800 text-xs rounded-xl p-2.5 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="">เลือกกลุ่ม</option>
                  {availableGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.group_name} {!selectedDeptId ? `(${g.department_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGroup && (
                <p className="mt-1.5 text-[11px] text-slate-500">
                  สังกัด: <span className="font-semibold text-slate-800">{selectedGroup.department_name}</span> • ระดับ: <span className="font-semibold text-indigo-700">{selectedGroup.education_level_name}</span>
                </p>
              )}
            </div>
          </div>

          {/* 2. Numeric Inputs (Grid) */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                จำนวน นร. (คน) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2 text-right font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                ชม.ฝึกปฏิบัติ
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                placeholder="0"
                value={practiceHours}
                onChange={(e) => setPracticeHours(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs rounded-xl p-2 text-right font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                อัตราต่อหัว (บาท) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={ratePerHead}
                onChange={(e) => setRatePerHead(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-full bg-slate-50 border border-slate-300 text-blue-700 text-xs rounded-xl p-2 text-right font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          {/* 3. Reactive Calculation Summary Box */}
          <div className="p-3.5 bg-gradient-to-br from-blue-50/80 via-slate-50 to-indigo-50/50 rounded-2xl border border-blue-200/90 shadow-2xs">
            <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1">
              <span>สูตรงบตั้งต้น (Base Budget) :</span>
              <span className="font-semibold text-slate-700 font-mono">
                {studentNum} คน × {rateNum.toLocaleString()} บ.
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-2 pb-2 border-b border-blue-200/60">
              <span className="text-xs font-bold text-slate-800">งบจัดสรรตั้งต้น :</span>
              <span className="text-lg font-black text-blue-700 tabular-nums">
                {baseBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">บาท</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">หักปันส่วนแผนกสอนช่วย :</span>
              <span className={`font-semibold tabular-nums ${isOverBudget ? 'text-red-600' : 'text-slate-700'}`}>
                - {totalShares.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>
            <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-blue-200/60">
              <span className="text-xs font-bold text-slate-900">งบสุทธิคงเหลือให้แผนก :</span>
              <span
                className={`text-base font-bold tabular-nums ${
                  isOverBudget ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {netDepartmentBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span className="text-xs font-normal text-slate-500">บาท</span>
              </span>
            </div>
          </div>

          {/* 4. Inter-Department Shares Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  ปันส่วนงบประมาณให้แผนกสอนช่วย (INTER-DEPT SHARES)
                </h3>
                <p className="text-[10px] text-slate-500">
                  แผนกต้นทางจะถูกหักจ่าย (-) และแผนกปลายทางจะได้รับโอน (+)
                </p>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAddShare}
                  disabled={availableTargetDepts.length === 0}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors border border-blue-200/80 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มแผนก</span>
                </button>
              )}
            </div>

            {shares.length === 0 ? (
              <div className="text-center py-4 px-2 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs">
                ไม่มีรายการปันส่วนวิชาสอนช่วยสำหรับกลุ่มนี้
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {shares.map((share, index) => (
                  <div
                    key={index}
                    className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <select
                        value={share.target_department_id}
                        onChange={(e) =>
                          handleShareChange(
                            index,
                            'target_department_id',
                            Number(e.target.value)
                          )
                        }
                        disabled={isReadOnly}
                        className="flex-1 bg-white border border-slate-300 rounded p-1.5 text-xs text-slate-800 font-medium"
                      >
                        {availableTargetDepts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.is_service_department ? '(แผนกบริการ)' : ''}
                          </option>
                        ))}
                      </select>

                      <div className="w-28 relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={share.share_amount || ''}
                          onChange={(e) =>
                            handleShareChange(
                              index,
                              'share_amount',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          disabled={isReadOnly}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-right font-semibold text-slate-800 tabular-nums text-xs"
                        />
                      </div>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveShare(index)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded transition-colors"
                          title="ลบรายการปันส่วน"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="หมายเหตุ / รหัสหรือชื่อวิชาสอนช่วย เช่น งานเชื่อมเบื้องต้น"
                      value={share.remark || ''}
                      onChange={(e) => handleShareChange(index, 'remark', e.target.value)}
                      disabled={isReadOnly}
                      className="text-xs bg-white border border-slate-300 rounded p-1.5 w-full text-slate-700"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-4 border-t border-slate-200">
          {!isReadOnly ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetForm}
                disabled={submitting}
                className="py-2.5 px-3.5 rounded-xl border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0"
                title="ล้างค่าในฟอร์ม"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>ล้างค่า</span>
              </button>
              <button
                type="submit"
                disabled={submitting || isOverBudget}
                className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center space-x-2 transition-all shadow-sm ${
                  isOverBudget
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'กำลังบันทึกข้อมูล...' : 'บันทึกจัดสรรงบประมาณ'}</span>
              </button>
            </div>
          ) : (
            <div className="text-center py-2 text-xs text-slate-400 bg-slate-100 rounded-lg">
              แบบฟอร์มถูกระงับการแก้ไข (Read-Only Mode)
            </div>
          )}
        </div>
      </form>
    </div>
  );
};
