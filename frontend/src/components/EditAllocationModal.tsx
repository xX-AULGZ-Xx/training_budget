import React, { useState, useEffect } from 'react';
import { Allocation, Department, ShareItem } from '../types';
import { X, Save, Plus, Trash2, AlertCircle, CheckCircle2, Edit3 } from 'lucide-react';
import { showSuccessToast, showErrorAlert } from '../utils/alerts';

interface EditAllocationModalProps {
  isOpen: boolean;
  allocation: Allocation | null;
  departments: Department[];
  isReadOnly: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditAllocationModal: React.FC<EditAllocationModalProps> = ({
  isOpen,
  allocation,
  departments,
  isReadOnly,
  onClose,
  onSuccess
}) => {
  const [studentCount, setStudentCount] = useState<number>(0);
  const [practiceHours, setPracticeHours] = useState<number>(0);
  const [ratePerHead, setRatePerHead] = useState<number>(350);
  const [createdBy, setCreatedBy] = useState<string>('เจ้าหน้าที่แผนงาน');
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (allocation) {
      setStudentCount(allocation.student_count);
      setPracticeHours(allocation.total_practice_hours);
      setRatePerHead(allocation.rate_per_head);
      setCreatedBy(allocation.created_by || 'เจ้าหน้าที่แผนงาน');
      setShares(
        allocation.shares?.map((s) => ({
          target_department_id: s.target_department_id,
          share_amount: Number(s.share_amount),
          remark: s.remark || ''
        })) || []
      );
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [allocation]);

  if (!isOpen || !allocation) return null;

  // Reactive calculations
  const baseBudget = Math.max(0, (studentCount || 0) * (ratePerHead || 0));
  const totalShares = shares.reduce((acc, curr) => acc + (Number(curr.share_amount) || 0), 0);
  const remainingBudget = baseBudget - totalShares;
  const isOverBudget = totalShares > baseBudget;

  // Available service departments (exclude group's department)
  const availableTargetDepts = departments.filter((d) => d.id !== allocation.department_id);

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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (isOverBudget) {
      setErrorMessage('ยอดปันส่วนให้แผนกสอนช่วย เกินกว่างบตั้งต้น');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/v1/allocations/${allocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_count: Number(studentCount),
          total_practice_hours: Number(practiceHours),
          rate_per_head: Number(ratePerHead),
          created_by: createdBy,
          shares: shares.filter((s) => s.share_amount > 0)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'ปรับปรุงข้อมูลล้มเหลว');
      }

      showSuccessToast('ปรับปรุงข้อมูลจัดสรรสำเร็จ');
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message);
      showErrorAlert('บันทึกไม่สำเร็จ', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">
                แก้ไขข้อมูลการจัดสรรงบประมาณ
              </h3>
              <p className="text-xs text-slate-500">
                {allocation.group_name} ({allocation.education_level_name}) - {allocation.department_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-2 text-xs text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Numeric Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                จำนวน นร./นศ. (คน) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={studentCount}
                onChange={(e) => setStudentCount(parseInt(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-2.5 text-right font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ชั่วโมงฝึกปฏิบัติ (ชม.)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={practiceHours}
                onChange={(e) => setPracticeHours(parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg p-2.5 text-right font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                อัตราต่อหัว (บาท/คน)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={ratePerHead}
                onChange={(e) => setRatePerHead(parseFloat(e.target.value) || 0)}
                disabled={isReadOnly}
                className="w-full bg-slate-50 border border-slate-300 text-blue-700 text-sm rounded-lg p-2.5 text-right font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Reactive Recalculation Summary Box */}
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl border border-blue-200 shadow-inner">
            <div className="flex justify-between items-center text-xs text-slate-600 mb-1">
              <span>งบตั้งต้นกลุ่มเรียน (Base Budget) :</span>
              <span className="font-semibold text-slate-800">
                {studentCount} คน × {ratePerHead.toLocaleString()} บาท
              </span>
            </div>
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-sm font-bold text-slate-800">งบจัดสรรตั้งต้น :</span>
              <span className="text-xl font-extrabold text-blue-700">
                {baseBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>
            <div className="pt-2 border-t border-blue-200 flex justify-between items-center text-xs">
              <span className="text-slate-600">หักปันส่วนแผนกสอนช่วย :</span>
              <span className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-slate-700'}`}>
                - {totalShares.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="font-semibold text-slate-700">งบสุทธิคงเหลือให้แผนก :</span>
              <span className={`font-bold ${remainingBudget < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                {remainingBudget.toLocaleString('en-US', { minimumFractionDigits: 2 })} บาท
              </span>
            </div>
          </div>

          {/* Inter-Department Shares */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                ปันส่วนงบประมาณให้แผนกสอนช่วย
              </h4>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleAddShare}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>เพิ่มแผนกสอนช่วย</span>
                </button>
              )}
            </div>

            {shares.length === 0 ? (
              <p className="text-center py-3 text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                ไม่มีรายการปันส่วนสอนช่วย
              </p>
            ) : (
              <div className="space-y-2">
                {shares.map((share, index) => (
                  <div
                    key={index}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <select
                          value={share.target_department_id}
                          onChange={(e) =>
                            handleShareChange(index, 'target_department_id', Number(e.target.value))
                          }
                          disabled={isReadOnly}
                          className="w-full text-xs bg-white border border-slate-300 rounded p-1.5 focus:ring-1 focus:ring-blue-500"
                        >
                          {availableTargetDepts.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.is_service_department ? '(สอนช่วย)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-32">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="จำนวนเงิน"
                          value={share.share_amount || ''}
                          onChange={(e) =>
                            handleShareChange(index, 'share_amount', parseFloat(e.target.value) || 0)
                          }
                          disabled={isReadOnly}
                          className="w-full text-xs text-right bg-white border border-slate-300 rounded p-1.5 font-medium text-slate-900"
                        />
                      </div>

                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemoveShare(index)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="หมายเหตุ / วิชาสอนช่วย"
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

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
            >
              ยกเลิก
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={submitting || isOverBudget}
                className={`px-5 py-2 text-xs font-semibold rounded-lg text-white flex items-center space-x-1.5 shadow-sm transition-all ${
                  isOverBudget
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <Save className="w-4 h-4" />
                <span>{submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
