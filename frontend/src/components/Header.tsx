import React from 'react';
import { AcademicTerm, SystemSettings } from '../types';
import {
  School,
  Calendar,
  Lock,
  Unlock,
  FileText,
  History,
  RefreshCw,
  LayoutDashboard,
  Settings,
  Rocket
} from 'lucide-react';

interface HeaderProps {
  currentView: 'budget' | 'settings' | 'startup';
  onChangeView: (view: 'budget' | 'settings' | 'startup') => void;
  terms: AcademicTerm[];
  selectedTerm: AcademicTerm | null;
  onSelectTerm: (term: AcademicTerm) => void;
  onToggleTermStatus: () => void;
  onOpenAuditLogs: () => void;
  onDownloadPdf: () => void;
  onRefresh: () => void;
  loading: boolean;
  systemSettings?: SystemSettings | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onChangeView,
  terms,
  selectedTerm,
  onSelectTerm,
  onToggleTermStatus,
  onOpenAuditLogs,
  onDownloadPdf,
  onRefresh,
  loading,
  systemSettings
}) => {
  const isReadOnly = selectedTerm?.status !== 'OPEN';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="w-full px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Organization & Title */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/15 shrink-0">
            <School className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <span 
                className="text-[9px] sm:text-[10px] font-bold tracking-wider uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50 shrink-0"
                title={`รหัสย่อ: ${systemSettings?.college_code || 'CRIC'}`}
              >
                {systemSettings?.college_code || 'CRIC'}
              </span>
              <span className="text-[10px] sm:text-[11px] text-slate-700 font-semibold truncate max-w-[170px] xs:max-w-[240px] sm:max-w-none">
                {systemSettings?.college_name || 'วิทยาลัยการอาชีพเชียงราย'}
              </span>
              <span className="text-[11px] text-slate-300 hidden md:inline">•</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal hidden md:inline">
                {systemSettings?.department_name || 'งานวางแผนและงบประมาณ'}
              </span>
            </div>
            <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 leading-tight truncate sm:whitespace-normal">
              ระบบการคิดคำนวณและจัดสรรงบประมาณค่าวัสดุฝึก
            </h1>
          </div>
        </div>

        {/* Center: Main View Navigation Switcher */}
        <div className="w-full xl:w-auto flex items-center justify-center overflow-x-auto scrollbar-none py-0.5">
          <div className="inline-flex items-center p-0.5 sm:p-1 bg-slate-100/90 rounded-xl border border-slate-200 shadow-inner shrink-0">
            <button
              onClick={() => onChangeView('budget')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentView === 'budget'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="hidden sm:inline">จัดสรรงบประมาณ</span>
                <span className="sm:hidden">จัดสรรงบ</span>
              </span>
            </button>
            <button
              onClick={() => onChangeView('settings')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentView === 'settings'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span>
                <span className="hidden sm:inline">ตั้งค่าระบบ (Setup)</span>
                <span className="sm:hidden">ตั้งค่าระบบ</span>
              </span>
            </button>
            <button
              onClick={() => onChangeView('startup')}
              className={`flex items-center space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentView === 'startup'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Rocket className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>
                <span className="hidden sm:inline">Start Up Setting</span>
                <span className="sm:hidden">Start Up</span>
              </span>
            </button>
          </div>
        </div>

        {/* Right: Term Selector & Global Actions */}
        <div className="w-full xl:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0">
          {/* Term Selector */}
          <div className="flex-1 sm:flex-initial flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200 min-w-0 max-w-full sm:max-w-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5 sm:ml-2 mr-1 shrink-0" />
            <select
              value={selectedTerm?.id || ''}
              onChange={(e) => {
                const term = terms.find((t) => t.id === Number(e.target.value));
                if (term) onSelectTerm(term);
              }}
              className="w-full sm:w-auto bg-transparent text-[11px] sm:text-xs font-semibold text-slate-700 py-1 sm:py-1.5 pr-2 pl-0.5 focus:outline-none cursor-pointer truncate"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  ภาค {t.semester}/{t.academic_year} {t.is_current ? '(ปัจจุบัน)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Status Badge & Toggle */}
            {selectedTerm && (
              <button
                onClick={onToggleTermStatus}
                title="คลิกเพื่อสลับสถานะเปิด/ปิดงวด"
                className={`inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all border shadow-2xs cursor-pointer ${
                  selectedTerm.status === 'OPEN'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : selectedTerm.status === 'CLOSED'
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                {selectedTerm.status === 'OPEN' ? (
                  <>
                    <Unlock className="w-3 h-3 text-emerald-600" />
                    <span>เปิดงวด</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-rose-600" />
                    <span>ปิดงวด</span>
                  </>
                )}
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-1 sm:p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            {/* Audit Log Trigger */}
            <button
              onClick={onOpenAuditLogs}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="ดูประวัติการแก้ไข"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">ประวัติ</span>
            </button>

            {/* PDF Report Trigger */}
            <button
              onClick={onDownloadPdf}
              className="inline-flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>พิมพ์ PDF</span>
            </button>
          </div>
        </div>
      </div>

      {isReadOnly && (
        <div className="bg-amber-500/90 text-white text-[11px] px-4 py-1 text-center font-medium shadow-inner flex items-center justify-center space-x-2">
          <Lock className="w-3 h-3" />
          <span>ปีการศึกษานี้อยู่ในสถานะปิดงวด (Read-Only Mode) ข้อมูลถูกล็อกและไม่สามารถแก้ไขได้</span>
        </div>
      )}
    </header>
  );
};
