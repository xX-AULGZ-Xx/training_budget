import React from 'react';
import { AuditLog } from '../types';
import { X, Clock, FileJson } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLog[];
  termTitle: string;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  termTitle
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <Clock className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-800">
                ประวัติการแก้ไขและ Audit Snapshot
              </h3>
              <p className="text-xs text-slate-500">สำหรับ {termTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              ยังไม่มีประวัติการบันทึกหรือปรับปรุงข้อมูลในงวดนี้
            </div>
          ) : (
            logs.map((log) => {
              const payload =
                typeof log.snapshot_payload === 'string'
                  ? JSON.parse(log.snapshot_payload)
                  : log.snapshot_payload;

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          log.action_type === 'CREATE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action_type === 'UPDATE'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {log.action_type}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {payload?.group_name || `Allocation #${log.allocation_id}`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {new Date(log.created_at).toLocaleString('th-TH')}
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 mb-2">
                    ผู้ดำเนินการ: <span className="font-medium text-slate-800">{log.executed_by}</span>
                  </div>

                  {/* JSON Snapshot Viewer Accordion/Box */}
                  <div className="bg-slate-900 rounded-lg p-3 text-[11px] font-mono text-emerald-400 overflow-x-auto">
                    <div className="flex items-center space-x-1 text-slate-400 mb-1 text-[10px]">
                      <FileJson className="w-3 h-3" />
                      <span>Snapshot Payload:</span>
                    </div>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
