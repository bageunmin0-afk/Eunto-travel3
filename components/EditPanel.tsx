
import React from 'react';
import { RouteItem, IconType } from '../types';
import { ICON_MAP } from '../constants';
import { Trash2, X, FileText } from 'lucide-react';

interface EditPanelProps {
  item: RouteItem;
  onUpdate: (updated: RouteItem) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const EditPanel: React.FC<EditPanelProps> = ({ item, onUpdate, onDelete, onClose }) => {
  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl border-l border-slate-200 p-6 z-50 animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-slate-800">장소 편집</h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">장소 명칭</label>
          <input
            type="text"
            value={item.label}
            onChange={(e) => onUpdate({ ...item, label: e.target.value })}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
            placeholder="장소 이름을 입력하세요"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4" /> 비고 (메모)
          </label>
          <textarea
            value={item.notes || ''}
            onChange={(e) => onUpdate({ ...item, notes: e.target.value })}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none text-sm"
            rows={3}
            placeholder="추가적인 정보를 입력하세요"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-600 mb-2">아이콘 선택</label>
          <div className="grid grid-cols-5 gap-2">
            {(Object.keys(ICON_MAP) as IconType[]).map((iconKey) => {
              const IconComp = ICON_MAP[iconKey];
              return (
                <button
                  key={iconKey}
                  onClick={() => onUpdate({ ...item, icon: iconKey })}
                  className={`flex items-center justify-center p-3 rounded-lg border-2 transition-all ${
                    item.icon === iconKey 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600' 
                      : 'border-slate-100 hover:border-slate-300 text-slate-500'
                  }`}
                >
                  <IconComp className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100">
          <button
            onClick={() => onDelete(item.id)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 text-rose-600 font-semibold rounded-xl hover:bg-rose-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            이 장소 삭제
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPanel;
