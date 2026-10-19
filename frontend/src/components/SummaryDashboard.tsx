import React, { useState, useEffect } from 'react';
import {
  DepartmentSummary,
  LevelSummary,
  SummaryKPIs,
  Department,
  Allocation,
  CalculationType,
  CALCULATION_TYPE_LABELS
} from '../types';
import {
  Users,
  Coins,
  ArrowRightLeft,
  Wallet,
  Building2,
  GraduationCap,
  Layers,
  Trash2,
  FileSpreadsheet,
  Edit3,
  Filter
} from 'lucide-react';

interface SummaryDashboardProps {
  kpis: SummaryKPIs;
  departments: DepartmentSummary[];
  levels: LevelSummary[];
  allDepartments: Department[];
  allocations: Allocation[];
  selectedDepartmentId: string;
  onSelectDepartmentId: (deptId: string) => void;
  calculationType: CalculationType | 'ALL';
  onChangeCalculationType?: (type: CalculationType | 'ALL') => void;
  onEditAllocation: (allocation: Allocation) => void;
  onDeleteAllocation: (id: number) => void;
  isReadOnly: boolean;
}

export const SummaryDashboard: React.FC<SummaryDashboardProps> = ({
  kpis,
  departments,
  levels,
  allDepartments,
  allocations,
  selectedDepartmentId,
  onSelectDepartmentId,
  calculationType,
  onChangeCalculationType,
  onEditAllocation,
  onDeleteAllocation,
  isReadOnly
}) => {
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'allocations' | 'levels'>('reconciliation');

  // เมื่อเลือกประเภทการคำนวณ ให้สลับมาแสดงตารางรายการจัดสรรตามประเภทนั้นอัตโนมัติ
  useEffect(() => {
    if (calculationType !== 'ALL') {
      setActiveTab('allocations');
    }
  }, [calculationType]);

  const getAllocationsTabTitle = () => {
    if (calculationType === 'SPECIAL_SUPPLEMENTARY') return `ตารางภาคสมทบ (${allocations.length})`;
    if (calculationType === 'DUAL_EDUCATION') return `ตารางทวิศึกษา (${allocations.length})`;
    if (calculationType === 'SHORT_COURSE') return `ตารางระยะสั้น (${allocations.length})`;
    if (calculationType === 'REGULAR') return `ตารางภาคปกติ (${allocations.length})`;
    return `รายการจัดสรรทั้งหมด (${allocations.length})`;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 1. Global KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Card 1: Total Students */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                นร./นศ. รวม
              </div>
              <div className="text-base sm:text-2xl font-black text-slate-900 tracking-tight tabular-nums truncate">
                {kpis.total_students.toLocaleString()} <span className="text-[10px] sm:text-xs font-semibold text-slate-500">คน</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Total Base Budget */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                งบตั้งต้นรวม
              </div>
              <div className="text-base sm:text-2xl font-black text-indigo-900 tracking-tight tabular-nums truncate">
                {kpis.total_base_budget.toLocaleString('en-US', { minimumFractionDigits: 0 })}{' '}
                <span className="text-[10px] sm:text-xs font-semibold text-indigo-500">฿</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Inter-dept Transfer Volume */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                ปันส่วนสอนช่วย
              </div>
              <div className="text-base sm:text-2xl font-black text-amber-900 tracking-tight tabular-nums truncate">
                {kpis.total_inter_shares.toLocaleString('en-US', { minimumFractionDigits: 0 })}{' '}
                <span className="text-[10px] sm:text-xs font-semibold text-amber-500">฿</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Net Budget */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center space-x-2.5 sm:space-x-3.5">
            <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider truncate">
                งบสุทธิคงเหลือ
              </div>
              <div className="text-base sm:text-2xl font-black text-emerald-900 tracking-tight tabular-nums truncate">
                {kpis.net_budget.toLocaleString('en-US', { minimumFractionDigits: 0 })}{' '}
                <span className="text-[10px] sm:text-xs font-semibold text-emerald-500">฿</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Tabs Bar */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xs border border-slate-200/90 p-2 sm:p-2.5 flex flex-col gap-2.5">
        {/* Calculation Type Switcher Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-[11px] font-bold text-slate-500 mr-1 whitespace-nowrap">ประเภทงบ:</span>
            {(['ALL', 'REGULAR', 'SPECIAL_SUPPLEMENTARY', 'DUAL_EDUCATION', 'SHORT_COURSE'] as const).map((type) => {
              const isActive = calculationType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    if (onChangeCalculationType) onChangeCalculationType(type);
                    if (type !== 'ALL') setActiveTab('allocations');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  {type === 'ALL' ? 'ทุกประเภทงบ' : CALCULATION_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>

          {/* Scope Filter Dropdown (Department) */}
          <div className="flex items-center space-x-2 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">แผนก:</span>
            <select
              value={selectedDepartmentId}
              onChange={(e) => onSelectDepartmentId(e.target.value)}
              className="w-full sm:w-52 bg-slate-50 border border-slate-300 rounded-lg text-xs py-1 px-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="all">-- ทุกแผนกวิชา --</option>
              {allDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('reconciliation')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'reconciliation'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>กระทบยอดรายแผนก</span>
            </button>
            <button
              onClick={() => setActiveTab('allocations')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'allocations'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{getAllocationsTabTitle()}</span>
            </button>
            <button
              onClick={() => setActiveTab('levels')}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                activeTab === 'levels'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>ตามระดับการศึกษา</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Data Table Container */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xs border border-slate-200/90 overflow-hidden">
        {/* Tab 1: Reconciliation Table */}
        {activeTab === 'reconciliation' && (
          <div>
            <div className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
                    ตารางสรุปผลต่างสุทธิรายแผนก (แยกงบสุทธิตามประเภทการคำนวณ)
                  </h3>
                  {calculationType in CALCULATION_TYPE_LABELS && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {CALCULATION_TYPE_LABELS[calculationType as CalculationType]}
                    </span>
                  )}
                </div>
                <p className="text-[10px] sm:text-[11px] text-slate-500">
                  แสดงการปันส่วนงบประมาณค่าวัสดุฝึก รายละเอียดนักเรียน และงบสุทธิแยกตามประเภทการคำนวณ (ภาคปกติ / ภาคสมทบ / ภาคทวิศึกษา / ระยะสั้น)
                </p>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-[10px] text-slate-400 sm:hidden flex items-center gap-1">
                  👉 เลื่อนซ้าย-ขวา
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono font-medium text-slate-500 bg-white px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md border border-slate-200">
                  หน่วย: บาท / คน
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              {calculationType !== 'ALL' && calculationType !== 'REGULAR' ? (
                /* Dedicated Tab 1 for Specific Calculation Types (ภาคสมทบ / ทวิศึกษา / ระยะสั้น) */
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="select-none text-slate-700 bg-slate-100/90 border-b border-slate-300">
                    <tr>
                      <th className="py-3 px-4 text-left font-bold border-r border-slate-300 min-w-[170px] whitespace-nowrap">
                        แผนกวิชา
                      </th>
                      <th className="py-3 px-3 text-right font-bold border-r border-slate-300 min-w-[80px] whitespace-nowrap">
                        จำนวนคน (คน)
                      </th>
                      <th className="py-3 px-3 text-right font-bold border-r border-slate-300 min-w-[95px] whitespace-nowrap">
                        งบตั้งต้น (+)
                      </th>
                      <th className="py-3 px-3 text-right font-bold border-r border-slate-300 min-w-[85px] text-rose-700 whitespace-nowrap">
                        หักจ่าย (-)
                      </th>
                      <th className="py-3 px-3 text-right font-bold border-r border-slate-300 min-w-[85px] text-emerald-700 whitespace-nowrap">
                        รับโอน (+)
                      </th>
                      <th className="py-3 px-4 text-right font-extrabold bg-blue-100/70 text-blue-950 border-l border-blue-200 min-w-[110px] whitespace-nowrap">
                        งบสุทธิ {CALCULATION_TYPE_LABELS[calculationType]}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/80 text-xs">
                    {departments.map((dept, index) => {
                      const base = Number(dept.base_budget);
                      const deducted = Number(dept.total_deducted);
                      const transferred = Number(dept.total_transferred);
                      const net = Number(dept.net_budget);
                      const students = Number(dept.student_count || 0);
                      const isEven = index % 2 === 0;

                      return (
                        <tr
                          key={dept.department_id}
                          className={`${isEven ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50 transition-colors`}
                        >
                          <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <span>{dept.department_name}</span>
                              {dept.is_service_department === 1 && (
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                  สอนช่วย
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-800 border-r border-slate-200 font-semibold tabular-nums">
                            {students > 0 ? students.toLocaleString() : <span className="text-slate-400 font-normal">0</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-800 border-r border-slate-200 font-medium tabular-nums">
                            {base.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-slate-200 tabular-nums">
                            {deducted > 0 ? (
                              <span className="text-rose-600 font-medium">
                                ({deducted.toLocaleString('en-US', { maximumFractionDigits: 2 })})
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">(0)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-slate-200 tabular-nums">
                            {transferred > 0 ? (
                              <span className="text-emerald-700 font-medium">
                                {transferred.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right font-black bg-blue-50/70 text-blue-900 border-l border-blue-200 text-sm tabular-nums">
                            {net > 0 ? (
                              net.toLocaleString('en-US', { maximumFractionDigits: 2 })
                            ) : (
                              <span className="text-slate-400 font-normal text-xs">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {departments.length > 0 && (
                    <tfoot className="bg-slate-100 font-extrabold border-t-2 border-slate-300 text-xs">
                      <tr>
                        <td className="py-3 px-4 text-slate-900 border-r border-slate-300 whitespace-nowrap">
                          รวมทั้งสิ้น ({departments.length} แผนก)
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 border-r border-slate-300 font-bold tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.student_count || 0), 0)
                            .toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 border-r border-slate-300 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.base_budget), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-700 border-r border-slate-300 tabular-nums">
                          ({departments
                            .reduce((sum, d) => sum + Number(d.total_deducted), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })})
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700 border-r border-slate-300 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.total_transferred), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-blue-900 bg-blue-100/90 border-l border-blue-300 text-sm tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.net_budget), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              ) : (
                /* Full Multi-Column Tab 1 for ALL / REGULAR */
                <table className="w-full text-left border-collapse text-xs">
                  {/* Two-tier Table Header */}
                  <thead className="select-none text-slate-700">
                    <tr className="bg-slate-100/90 border-b border-slate-300">
                      <th rowSpan={2} className="py-3 px-4 text-left font-bold border-r border-slate-300 min-w-[170px] whitespace-nowrap">
                        แผนกวิชา
                      </th>
                      <th rowSpan={2} className="py-3 px-3 text-right font-bold border-r border-slate-300 min-w-[90px] whitespace-nowrap">
                        งบตั้งต้น (+)
                      </th>
                      <th rowSpan={2} className="py-3 px-3 text-right font-bold border-r border-slate-300 min-w-[85px] text-rose-700 whitespace-nowrap">
                        หักจ่าย (-)
                      </th>
                      <th rowSpan={2} className="py-3 px-3 text-right font-bold border-r border-slate-300 min-w-[85px] text-emerald-700 whitespace-nowrap">
                        รับโอน (+)
                      </th>
                      <th colSpan={3} className="py-2 px-3 text-center font-bold border-r border-slate-300 border-b border-slate-300 bg-blue-50/70 text-blue-900 whitespace-nowrap">
                        จำนวนนักเรียนรายระดับ
                      </th>
                      <th colSpan={4} className="py-2 px-3 text-center font-bold border-r border-slate-300 border-b border-slate-300 bg-emerald-50/70 text-emerald-900 whitespace-nowrap">
                        งบประมาณสุทธิแยกตามประเภทการคำนวณ
                      </th>
                      <th rowSpan={2} className="py-3 px-4 text-right font-extrabold bg-blue-100/70 text-blue-950 border-l border-blue-200 min-w-[105px] whitespace-nowrap">
                        งบสุทธิรวม
                      </th>
                    </tr>
                    <tr className="border-b border-slate-300 text-[11px] font-bold">
                      {/* Students by level subheaders */}
                      <th className="py-2 px-3 text-right border-r border-slate-300 bg-blue-50/40 text-blue-800 min-w-[55px]">ปวช.</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300 bg-blue-50/40 text-blue-800 min-w-[55px]">ปวส.</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300 bg-blue-50/40 text-blue-800 min-w-[55px]">เรือนจำ</th>
                      {/* Net budget by calculation type subheaders */}
                      <th className="py-2 px-3 text-right border-r border-slate-300 bg-emerald-50/40 text-emerald-800 min-w-[75px]">ภาคปกติ</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300 bg-emerald-50/40 text-emerald-800 min-w-[75px]">ภาคสมทบ</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300 bg-emerald-50/40 text-emerald-800 min-w-[75px]">ภาคทวิศึกษา</th>
                      <th className="py-2 px-3 text-right border-r border-slate-300 bg-emerald-50/40 text-emerald-800 min-w-[75px]">ระยะสั้น</th>
                    </tr>
                  </thead>

                  {/* Table Body */}
                  <tbody className="divide-y divide-slate-200/80 text-xs">
                    {departments.map((dept, index) => {
                      const base = Number(dept.base_budget);
                      const deducted = Number(dept.total_deducted);
                      const transferred = Number(dept.total_transferred);
                      const net = Number(dept.net_budget);

                      const sVoc = Number(dept.students_voc || 0);
                      const sHighVoc = Number(dept.students_high_voc || 0);
                      const sPrison = Number(dept.students_prison || 0);

                      const nRegular = Number(dept.net_regular || 0);
                      const nSpecial = Number(dept.net_special_supplementary || 0);
                      const nDual = Number(dept.net_dual_education || 0);
                      const nShort = Number(dept.net_short_course || 0);

                      const isEven = index % 2 === 0;

                      return (
                        <tr
                          key={dept.department_id}
                          className={`${isEven ? 'bg-white' : 'bg-slate-50/40'} hover:bg-blue-50/50 transition-colors`}
                        >
                          <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                            <div className="flex items-center space-x-1.5">
                              <span>{dept.department_name}</span>
                              {dept.is_service_department === 1 && (
                                <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">
                                  สอนช่วย
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-800 border-r border-slate-200 font-medium tabular-nums">
                            {base.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-slate-200 tabular-nums">
                            {deducted > 0 ? (
                              <span className="text-rose-600 font-medium">
                                ({deducted.toLocaleString('en-US', { maximumFractionDigits: 2 })})
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">(0)</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right border-r border-slate-200 tabular-nums">
                            {transferred > 0 ? (
                              <span className="text-emerald-700 font-medium">
                                {transferred.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal">0</span>
                            )}
                          </td>

                          {/* Students columns */}
                          <td className="py-2.5 px-3 text-right text-slate-700 border-r border-slate-200 bg-blue-50/15 tabular-nums">
                            {sVoc > 0 ? sVoc.toLocaleString() : <span className="text-slate-400 font-normal">0</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 border-r border-slate-200 bg-blue-50/15 tabular-nums">
                            {sHighVoc > 0 ? sHighVoc.toLocaleString() : <span className="text-slate-400 font-normal">0</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-700 border-r border-slate-200 bg-blue-50/15 tabular-nums">
                            {sPrison > 0 ? sPrison.toLocaleString() : <span className="text-slate-400 font-normal">0</span>}
                          </td>

                          {/* Net budget by calculation type columns */}
                          <td className="py-2.5 px-3 text-right font-bold border-r border-slate-200 bg-emerald-50/15 tabular-nums">
                            {nRegular > 0 ? (
                              <span className="text-slate-900">{nRegular.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold border-r border-slate-200 bg-emerald-50/15 tabular-nums">
                            {nSpecial > 0 ? (
                              <span className="text-slate-900">{nSpecial.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold border-r border-slate-200 bg-emerald-50/15 tabular-nums">
                            {nDual > 0 ? (
                              <span className="text-slate-900">{nDual.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold border-r border-slate-200 bg-emerald-50/15 tabular-nums">
                            {nShort > 0 ? (
                              <span className="text-slate-900">{nShort.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-slate-400 font-normal">0</span>
                            )}
                          </td>

                          {/* Total Net column */}
                          <td className="py-2.5 px-4 text-right font-black bg-blue-50/70 text-blue-900 border-l border-blue-200 text-sm tabular-nums">
                            {net > 0 ? (
                              net.toLocaleString('en-US', { maximumFractionDigits: 2 })
                            ) : (
                              <span className="text-slate-400 font-normal text-xs">0</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Total Summary Row (tfoot) */}
                  {departments.length > 0 && (
                    <tfoot className="bg-slate-100 font-extrabold border-t-2 border-slate-300 text-xs">
                      <tr>
                        <td className="py-3 px-4 text-slate-900 border-r border-slate-300 whitespace-nowrap">
                          รวมทั้งสิ้น ({departments.length} แผนก)
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 border-r border-slate-300 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.base_budget), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-700 border-r border-slate-300 tabular-nums">
                          ({departments
                            .reduce((sum, d) => sum + Number(d.total_deducted), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })})
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-700 border-r border-slate-300 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.total_transferred), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 border-r border-slate-300 bg-blue-50/40 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.students_voc || 0), 0)
                            .toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 border-r border-slate-300 bg-blue-50/40 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.students_high_voc || 0), 0)
                            .toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-900 border-r border-slate-300 bg-blue-50/40 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.students_prison || 0), 0)
                            .toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 border-r border-slate-300 bg-emerald-50/40 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.net_regular || 0), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 border-r border-slate-300 bg-emerald-50/40 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.net_special_supplementary || 0), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 border-r border-slate-300 bg-emerald-50/40 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.net_dual_education || 0), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900 border-r border-slate-300 bg-emerald-50/40 tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.net_short_course || 0), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-blue-900 bg-blue-100/90 border-l border-blue-300 text-sm tabular-nums">
                          {departments
                            .reduce((sum, d) => sum + Number(d.net_budget), 0)
                            .toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Class Groups Allocation List */}
        {activeTab === 'allocations' && (
          <div>
            <div className="px-3.5 sm:px-5 py-2 sm:py-2.5 border-b border-slate-200/80 bg-slate-50/50 flex items-center justify-between sm:hidden">
              <span className="text-[10px] text-slate-400">👉 เลื่อนซ้าย-ขวาเพื่อดูข้อมูลเต็ม</span>
              <span className="text-[10px] text-slate-500 font-semibold">{allocations.length} รายการ</span>
            </div>
            <div className="overflow-x-auto">
              {allocations.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-slate-400 text-xs">
                  ยังไม่มีข้อมูลการจัดสรรงบประมาณในงวดนี้
                </div>
              ) : (
                <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      {calculationType === 'SPECIAL_SUPPLEMENTARY' && (
                        <>
                          <th className="py-2.5 sm:py-3 px-3 sm:px-4">แผนก</th>
                          <th className="py-2.5 sm:py-3 px-3">ชื่อรุ่น</th>
                          <th className="py-2.5 sm:py-3 px-2.5 text-right">จำนวนคน</th>
                          <th className="py-2.5 sm:py-3 px-2.5 text-right">เงินต่อหัว</th>
                          <th className="py-2.5 sm:py-3 px-3 text-right">รวม (งบตั้งต้น)</th>
                        </>
                      )}
                      {calculationType === 'DUAL_EDUCATION' && (
                        <>
                          <th className="py-2.5 sm:py-3 px-3 sm:px-4">แผนก</th>
                          <th className="py-2.5 sm:py-3 px-2.5 text-center">ขั้น</th>
                          <th className="py-2.5 sm:py-3 px-3">โรงเรียน</th>
                          <th className="py-2.5 sm:py-3 px-2.5 text-right">จำนวนคน</th>
                          <th className="py-2.5 sm:py-3 px-2.5 text-right">เงินต่อหัว</th>
                          <th className="py-2.5 sm:py-3 px-3 text-right">รวม (งบตั้งต้น)</th>
                        </>
                      )}
                      {calculationType === 'SHORT_COURSE' && (
                        <>
                          <th className="py-2.5 sm:py-3 px-3 sm:px-4">แผนก</th>
                          <th className="py-2.5 sm:py-3 px-3">โรงเรียน / หน่วยงาน</th>
                          <th className="py-2.5 sm:py-3 px-3">รายวิชา</th>
                          <th className="py-2.5 sm:py-3 px-2.5 text-right">จำนวนคน</th>
                          <th className="py-2.5 sm:py-3 px-2.5 text-right">เงินต่อหัว</th>
                          <th className="py-2.5 sm:py-3 px-3 text-right">รวม (งบตั้งต้น)</th>
                        </>
                      )}
                      {calculationType === 'REGULAR' && (
                        <>
                          <th className="py-2.5 sm:py-3 px-3 sm:px-4">กลุ่มเรียน / แผนก</th>
                          <th className="py-2.5 sm:py-3 px-2.5 text-center">ระดับ</th>
                          <th className="py-2.5 sm:py-3 px-2 text-right">จำนวน นร.</th>
                          <th className="py-2.5 sm:py-3 px-2 text-right">ชม.ฝึก</th>
                          <th className="py-2.5 sm:py-3 px-2.5 text-right">เงินต่อหัว</th>
                          <th className="py-2.5 sm:py-3 px-3 text-right">รวม (งบตั้งต้น)</th>
                        </>
                      )}
                      {calculationType === 'ALL' && (
                        <>
                          <th className="py-2.5 sm:py-3 px-3 sm:px-4">รายการ / แผนก</th>
                          <th className="py-2.5 sm:py-3 px-2 text-center">ประเภท</th>
                          <th className="py-2.5 sm:py-3 px-3">ข้อมูลจำเพาะ</th>
                          <th className="py-2.5 sm:py-3 px-2 text-right">จำนวนคน</th>
                          <th className="py-2.5 sm:py-3 px-2.5 text-right">เงินต่อหัว</th>
                          <th className="py-2.5 sm:py-3 px-3 text-right">รวม (งบตั้งต้น)</th>
                        </>
                      )}
                      <th className="py-2.5 sm:py-3 px-3">การปันส่วนสอนช่วย</th>
                      <th className="py-2.5 sm:py-3 px-3 text-right font-bold">งบคงเหลือ</th>
                      {!isReadOnly && <th className="py-2.5 sm:py-3 px-2 text-center w-20">จัดการ</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allocations.map((alloc) => {
                      const allocType = alloc.calculation_type || 'REGULAR';
                      return (
                        <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* ภาคสมทบ: แผนก, ชื่อรุ่น, จำนวนคน, เงินต่อหัว, รวม */}
                          {calculationType === 'SPECIAL_SUPPLEMENTARY' && (
                            <>
                              <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-slate-900">
                                {alloc.department_name}
                              </td>
                              <td className="py-2.5 sm:py-3 px-3 font-semibold text-indigo-700">
                                {alloc.batch_name || alloc.group_name || '-'}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2.5 text-right text-slate-800 font-semibold tabular-nums">
                                {Number(alloc.student_count).toLocaleString()}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2.5 text-right text-slate-700 tabular-nums">
                                {Number(alloc.rate_per_head).toLocaleString()}
                              </td>
                              <td className="py-2.5 sm:py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                                {Number(alloc.base_budget).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </>
                          )}

                          {/* ทวิศึกษา: แผนก, ขั้น, โรงเรียน, จำนวนคน, เงินต่อหัว, รวม */}
                          {calculationType === 'DUAL_EDUCATION' && (
                            <>
                              <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-slate-900">
                                {alloc.department_name}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2.5 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-semibold">
                                  {alloc.step_level || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 sm:py-3 px-3 font-medium text-slate-800">
                                {alloc.school_name || '-'}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2.5 text-right text-slate-800 font-semibold tabular-nums">
                                {Number(alloc.student_count).toLocaleString()}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2.5 text-right text-slate-700 tabular-nums">
                                {Number(alloc.rate_per_head).toLocaleString()}
                              </td>
                              <td className="py-2.5 sm:py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                                {Number(alloc.base_budget).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </>
                          )}

                          {/* ระยะสั้น: แผนก, โรงเรียน, รายวิชา, จำนวนคน, เงินต่อหัว, รวม */}
                          {calculationType === 'SHORT_COURSE' && (
                            <>
                              <td className="py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-slate-900">
                                {alloc.department_name}
                              </td>
                              <td className="py-2.5 sm:py-3 px-3 text-slate-700">
                                {alloc.school_name || '-'}
                              </td>
                              <td className="py-2.5 sm:py-3 px-3 font-semibold text-indigo-700">
                                {alloc.course_name || '-'}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2.5 text-right text-slate-800 font-semibold tabular-nums">
                                {Number(alloc.student_count).toLocaleString()}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2.5 text-right text-slate-700 tabular-nums">
                                {Number(alloc.rate_per_head).toLocaleString()}
                              </td>
                              <td className="py-2.5 sm:py-3 px-3 text-right font-bold text-slate-900 tabular-nums">
                                {Number(alloc.base_budget).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </>
                          )}

                          {/* ภาคปกติ: กลุ่มเรียน / แผนก, ระดับ, จำนวน นร., ชม.ฝึก, เงินต่อหัว, รวม */}
                          {calculationType === 'REGULAR' && (
                            <>
                              <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                                <div className="font-bold text-slate-900">{alloc.group_name}</div>
                                <div className="text-[11px] text-slate-500 font-medium">{alloc.department_name}</div>
                              </td>
                              <td className="py-2.5 sm:py-3 px-2.5 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50 text-[10px] font-semibold">
                                  {alloc.education_level_name || '-'}
                                </span>
                              </td>
                              <td className="py-2.5 sm:py-3 px-2 text-right text-slate-800 font-semibold tabular-nums">
                                {Number(alloc.student_count).toLocaleString()}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2 text-right text-slate-500 tabular-nums">
                                {alloc.total_practice_hours}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2.5 text-right text-slate-700 tabular-nums">
                                {Number(alloc.rate_per_head).toLocaleString()}
                              </td>
                              <td className="py-2.5 sm:py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">
                                {Number(alloc.base_budget).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </>
                          )}

                          {/* รวมทั้งหมด (ALL) */}
                          {calculationType === 'ALL' && (
                            <>
                              <td className="py-2.5 sm:py-3 px-3 sm:px-4">
                                <div className="font-bold text-slate-900">
                                  {alloc.group_name || alloc.batch_name || alloc.course_name || 'รายการจัดสรร'}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium">{alloc.department_name}</div>
                              </td>
                              <td className="py-2.5 sm:py-3 px-2 text-center">
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  {CALCULATION_TYPE_LABELS[allocType]}
                                </span>
                              </td>
                              <td className="py-2.5 sm:py-3 px-3 text-slate-700">
                                {allocType === 'REGULAR' && (
                                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50 text-[10px] font-semibold">
                                    {alloc.education_level_name || '-'}
                                  </span>
                                )}
                                {allocType === 'SPECIAL_SUPPLEMENTARY' && (
                                  <span className="font-medium text-slate-800">{alloc.batch_name || '-'}</span>
                                )}
                                {allocType === 'DUAL_EDUCATION' && (
                                  <span className="text-[11px]">
                                    {alloc.school_name || '-'} {alloc.step_level ? `(${alloc.step_level})` : ''}
                                  </span>
                                )}
                                {allocType === 'SHORT_COURSE' && (
                                  <span className="text-[11px]">
                                    {alloc.course_name || '-'} {alloc.school_name ? `(${alloc.school_name})` : ''}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2 text-right text-slate-800 font-semibold tabular-nums">
                                {Number(alloc.student_count).toLocaleString()}
                              </td>
                              <td className="py-2.5 sm:py-3 px-2.5 text-right text-slate-700 tabular-nums">
                                {Number(alloc.rate_per_head).toLocaleString()}
                              </td>
                              <td className="py-2.5 sm:py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">
                                {Number(alloc.base_budget).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                              </td>
                            </>
                          )}

                          {/* Common Shared Columns */}
                          <td className="py-2.5 sm:py-3 px-3">
                            {alloc.shares && alloc.shares.length > 0 ? (
                              <div className="space-y-1">
                                {alloc.shares.map((s, idx) => (
                                  <div key={idx} className="text-[11px] flex items-center justify-between text-slate-700 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60">
                                    <span>{s.target_department_name} ({s.remark || 'สอนช่วย'}):</span>
                                    <span className="font-bold text-amber-900 ml-2 tabular-nums">
                                      {Number(s.share_amount).toLocaleString()} ฿
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">ไม่มีการปันส่วน</span>
                            )}
                          </td>
                          <td className="py-2.5 sm:py-3 px-3 text-right font-black text-emerald-700 tabular-nums">
                            {Number(alloc.remaining_budget).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          {!isReadOnly && (
                            <td className="py-2.5 sm:py-3 px-2 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => onEditAllocation(alloc)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="แก้ไขรายการ"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDeleteAllocation(alloc.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="ลบรายการ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Education Level Summary */}
        {activeTab === 'levels' && (
          <div className="p-4 sm:p-6">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 mb-3 sm:mb-4 flex items-center space-x-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>สรุปงบประมาณแยกตามระดับการศึกษา (ปวช. / ปวส. / โครงการพิเศษเรือนจำ)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              {levels.map((lvl) => (
                <div key={lvl.id} className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 bg-slate-50/50 shadow-2xs">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {lvl.name} ({lvl.code})
                  </div>
                  <div className="mt-2.5 sm:mt-3 flex justify-between items-baseline">
                    <span className="text-xs text-slate-600 font-medium">นักเรียน/นักศึกษา:</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                      {Number(lvl.student_count).toLocaleString()} คน
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between items-baseline pt-2 border-t border-slate-200">
                    <span className="text-xs text-slate-600 font-medium">งบจัดสรร:</span>
                    <span className="text-lg sm:text-xl font-black text-blue-700 tabular-nums">
                      {Number(lvl.base_budget).toLocaleString('en-US', { minimumFractionDigits: 2 })} ฿
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
