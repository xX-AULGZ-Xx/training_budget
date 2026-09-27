import React from 'react';
import { AcademicTerm } from '../types';
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
  loading
}) => {
  const isReadOnly = selectedTerm?.status !== 'OPEN';

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Left: Organization & Title */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/15">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200/50">
                วอศ.เชียงราย
              </span>
              <span className="text-[11px] text-slate-400 font-medium">งานวางแผนและงบประมาณ</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
              ระบบการคิดคำนวณและจัดสรรงบประมาณค่าวัสดุฝึก
            </h1>
          </div>
        </div>

        {/* Center: Main View Navigation Switcher */}
        <div className="flex items-center justify-center shrink-0">
          <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => onChangeView('budget')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'budget'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>จัดสรรงบประมาณ</span>
            </button>
            <button
              onClick={() => onChangeView('settings')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'settings'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>ตั้งค่าระบบ (Setup)</span>
            </button>
            <button
              onClick={() => onChangeView('startup')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentView === 'startup'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Rocket className="w-3.5 h-3.5 text-blue-600" />
              <span>Start Up Setting</span>
            </button>
          </div>
        </div>

        {/* Right: Term Selector & Global Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
          {/* Term Selector */}
          <div className="flex items-center bg-slate-50 rounded-lg p-0.5 border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1 shrink-0" />
            <select
              value={selectedTerm?.id || ''}
              onChange={(e) => {
                const term = terms.find((t) => t.id === Number(e.target.value));
                if (term) onSelectTerm(term);
              }}
              className="bg-transparent text-xs font-semibold text-slate-700 py-1.5 pr-2 pl-1 focus:outline-none cursor-pointer"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  ภาคเรียนที่ {t.semester}/{t.academic_year} {t.is_current ? '(ปัจจุบัน)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Badge & Toggle */}
          {selectedTerm && (
            <button
              onClick={onToggleTermStatus}
              title="คลิกเพื่อสลับสถานะเปิด/ปิดงวด"
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-2xs ${
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
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>

          {/* Audit Log Trigger */}
          <button
            onClick={onOpenAuditLogs}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">ประวัติย้อนหลัง</span>
          </button>

          {/* PDF Report Trigger */}
          <button
            onClick={onDownloadPdf}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20 transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>พิมพ์รายงาน PDF</span>
          </button>
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
