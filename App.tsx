
import React, { useState, useCallback } from 'react';
import { RouteItem, IconType } from './types';
import { DEFAULT_ROUTE } from './constants';
import SnakePath from './components/SnakePath';
import EditPanel from './components/EditPanel';
import { 
  Plus, Sparkles, MapPin, Download, Save, Wallet, TrendingUp, 
  ExternalLink, Banknote, UtensilsCrossed, Hotel as HotelIcon, Compass as CompassIcon, Car
} from 'lucide-react';
import { generateSmartItinerary } from './services/geminiService';

interface Recommendation { title: string; url: string; }
interface CostBreakdown { category: string; amount: string; }
interface CostReport { total: string; breakdown: CostBreakdown[]; }

const App: React.FC = () => {
  const [items, setItems] = useState<any[]>(DEFAULT_ROUTE.map(i => ({...i, type: 'location'})));
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [costReport, setCostReport] = useState<CostReport | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Added missing Car import from lucide-react to fix 'Cannot find name Car' error
  const getCostIcon = (category: string) => {
    if (category.includes('식비') || category.includes('음식')) return <UtensilsCrossed className="w-3 h-3" />;
    if (category.includes('숙박') || category.includes('호텔')) return <HotelIcon className="w-3 h-3" />;
    if (category.includes('교통') || category.includes('이동')) return <Car className="w-3 h-3" />;
    if (category.includes('액티비티') || category.includes('체험')) return <CompassIcon className="w-3 h-3" />;
    return <Banknote className="w-3 h-3" />;
  };

  const handleUpdateItem = useCallback((updatedItem: any) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setSelectedId(null);
  }, []);

  const addNewItem = () => {
    const newItem = {
      id: Math.random().toString(36).substr(2, 9),
      label: '새 장소',
      icon: 'map',
      type: 'location'
    };
    setItems(prev => [...prev, newItem]);
    setSelectedId(newItem.id);
  };

  const handleAiGeneration = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const result = await generateSmartItinerary(aiPrompt);
      if (result && result.itinerary) {
        const mappedResult = result.itinerary.map((item: any) => ({
          ...item,
          id: Math.random().toString(36).substr(2, 9),
        }));
        setItems(mappedResult);
        setRecommendations(result.recommendations || []);
        setCostReport(result.costReport || null);
      }
    } catch (err) {
      alert('AI 일정 생성 중 오류가 발생했습니다.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const selectedItem = items.find(i => i.id === selectedId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600">
            Snake Route Planner
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">
            <Download className="w-4 h-4" />
            이미지로 저장
          </button>
          <button className="flex items-center gap-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all font-semibold shadow-sm">
            <Save className="w-4 h-4" />
            저장하기
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-6 gap-6 relative">
        {/* Sidebar Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-120px)] pr-2 custom-scrollbar">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              AI 스마트 플래너
            </h2>
            <div className="space-y-3">
              <input 
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="예: 제주도 3박 4일 일정"
                className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-slate-700"
              />
              <button 
                onClick={handleAiGeneration}
                disabled={isAiLoading}
                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  isAiLoading ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                {isAiLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>AI 일정 생성</>
                )}
              </button>
            </div>
          </div>

          {costReport && (
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg border border-slate-800 animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" /> AI 예상 경비
                </h3>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mb-4">
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">총 예상 합계</p>
                <h2 className="text-2xl font-black text-emerald-400">{costReport.total}</h2>
              </div>
              <div className="space-y-3">
                {costReport.breakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-300">{item.category}</span>
                    </div>
                    <span className="text-[10px] font-black">{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
              <h3 className="text-xs font-black text-amber-600 uppercase mb-3 flex items-center gap-2">
                <ExternalLink className="w-3 h-3" /> 추천 여행 정보
              </h3>
              <div className="space-y-2">
                {recommendations.map((rec, i) => (
                  <a key={i} href={rec.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 hover:shadow-md transition-all group">
                    <span className="text-[11px] font-bold text-slate-700 truncate mr-2">{rec.title}</span>
                    <ExternalLink className="w-3 h-3 text-amber-400 group-hover:text-amber-500" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">전체 일정</h2>
              <span className="text-xs font-medium px-2 py-1 bg-slate-100 text-slate-600 rounded-full">
                {items.length}개 항목
              </span>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item, idx) => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    selectedId === item.id ? 'bg-emerald-50 border-emerald-200' : 'hover:bg-slate-50 border-transparent'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                  <div className={`flex-1 truncate font-medium ${item.type === 'day' ? 'font-black text-emerald-600' : 'text-slate-700'}`}>
                    {item.label}
                  </div>
                </div>
              ))}
              <button 
                onClick={addNewItem}
                className="w-full py-3 mt-4 border-2 border-dashed border-slate-200 text-slate-400 rounded-xl hover:border-emerald-300 hover:text-emerald-500 transition-all flex items-center justify-center gap-2 font-semibold"
              >
                <Plus className="w-4 h-4" />
                장소 추가
              </button>
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 min-h-[600px] relative">
          <SnakePath 
            items={items} 
            onItemClick={setSelectedId} 
            activeId={selectedId || undefined} 
          />
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-white/50 flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-xs font-semibold text-slate-600">이동 경로</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-dashed border-slate-300 rounded-full"></div>
              <span className="text-xs font-semibold text-slate-600">U-턴 구간</span>
            </div>
          </div>
        </div>

        {/* Edit Panel */}
        {selectedItem && (
          <EditPanel 
            item={selectedItem}
            onUpdate={handleUpdateItem}
            onDelete={handleDeleteItem}
            onClose={() => setSelectedId(null)}
          />
        )}
      </main>

      {/* Mobile Floating Action Button */}
      <button 
        onClick={addNewItem}
        className="lg:hidden fixed bottom-8 right-8 w-16 h-16 bg-emerald-500 rounded-full shadow-2xl flex items-center justify-center text-white z-40"
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
};

export default App;
