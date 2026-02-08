
import React, { useState, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  MapPin, Plus, Sparkles, Download, Save, Trash2, X, Calendar, GripVertical, Palette, RotateCcw,
  Clock, Eye, EyeOff, Upload, ExternalLink, Wallet, Banknote, UtensilsCrossed, Hotel as HotelIcon, 
  Compass as CompassIcon, TrendingUp, Car, Plane, Train, Bus, Ship, Bike, Footprints, TramFront, 
  CableCar, Navigation, Globe, Truck, Landmark, Camera, Bed, Home, Building, Building2, Hospital, 
  Stethoscope, Bath, Wifi, Phone, BatteryCharging, Briefcase, Mountain, Waves, Tent, TreePine, 
  Trees, Sun, Moon, Star, Heart, Flame, Zap, Bell, CheckCircle, Info, Cloud, Umbrella, Ghost, 
  ArrowUpCircle, ArrowDownCircle, MoveVertical, FileText, Search, Globe2, ChevronRight, Ticket
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
type ItemType = 'location' | 'day';
type FontType = 'pretendard' | 'noto' | 'nanum' | 'gmarket' | 'suit' | 'ibm' | 'inter' | 'public';
type IconType = string;

interface Recommendation { title: string; url: string; }
interface CostBreakdown { category: string; amount: string; }
interface CostReport { total: string; breakdown: CostBreakdown[]; }
interface GroundingSource { title: string; uri: string; }

interface RouteItem { 
  id: string; 
  label: string; 
  notes?: string; 
  time?: string; 
  icon?: IconType; 
  imageUrl?: string; 
  type: ItemType; 
  color?: string; 
}

// --- Constants ---
const NODE_SPACING_X = 180;
const NODE_SPACING_Y = 180;
const MARGIN = 100;

const ICON_MAP: Record<string, any> = {
  car: Car, plane: Plane, train: Train, bus: Bus, ship: Ship, bike: Bike, walk: Footprints, tram: TramFront, cablecar: CableCar, map: MapPin, navigation: Navigation, compass: CompassIcon, globe: Globe, truck: Truck, landmark: Landmark,
  food: UtensilsCrossed, cafe: Clock, pizza: Plus, sandwich: Plus, soup: Plus, beer: Plus, wine: Plus, icecream: Plus, cutlery: UtensilsCrossed, dessert: Plus, fruit: Plus, apple: Plus, cookie: Plus,
  camera: Camera, hotel: HotelIcon, bed: Bed, home: Home, building: Building, office: Building2, hospital: Hospital, medical: Stethoscope, bank: Landmark, money: Banknote, parking: Plus, toilet: Bath, wifi: Wifi, phone: Phone, charge: BatteryCharging, bag: Briefcase,
  mountain: Mountain, waves: Waves, tent: Tent, tree: TreePine, trees: Trees, sun: Sun, moon: Moon, star: Star, heart: Heart, fire: Flame, ghost: Ghost, bolt: Zap, bell: Bell, check: CheckCircle, info: Info, cloud: Cloud, umbrella: Umbrella
};

const FONTS: Record<FontType, string> = {
  pretendard: "'Pretendard', sans-serif",
  noto: "'Noto Sans KR', sans-serif",
  nanum: "'Nanum Gothic', sans-serif",
  gmarket: "'Gmarket Sans', sans-serif",
  suit: "'Pretendard', sans-serif",
  ibm: "'IBM Plex Sans KR', sans-serif",
  inter: "'Inter', sans-serif",
  public: "'Public Sans', sans-serif",
};

const PRESET_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#6366f1', '#f43f5e', '#475569', '#dc2626', '#8b5cf6', '#ec4899', '#f97316', '#14b8a6', '#3b82f6'];

// --- Helpers ---
const splitTextIntoLines = (text: string, maxLen: number = 17): string[] => {
  if (!text) return [];
  const lines = [];
  for (let i = 0; i < text.length; i += maxLen) {
    lines.push(text.substring(i, i + maxLen));
  }
  return lines;
};

const getCostIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('식비') || cat.includes('음식') || cat.includes('food')) return <UtensilsCrossed className="w-3 h-3" />;
  if (cat.includes('숙박') || cat.includes('호텔') || cat.includes('hotel')) return <HotelIcon className="w-3 h-3" />;
  if (cat.includes('교통') || cat.includes('이동') || cat.includes('transport')) return <Car className="w-3 h-3" />;
  if (cat.includes('액티비티') || cat.includes('체험') || cat.includes('activity')) return <CompassIcon className="w-3 h-3" />;
  return <Banknote className="w-3 h-3" />;
};

// Initialize GoogleGenAI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function generateSmartItinerary(prompt: string, useGrounding: boolean) {
  const config: any = {
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        itinerary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              label: { type: Type.STRING },
              notes: { type: Type.STRING },
              type: { type: Type.STRING },
              icon: { type: Type.STRING },
              time: { type: Type.STRING }
            },
            required: ["label", "type", "icon"]
          }
        },
        recommendations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { title: { type: Type.STRING }, url: { type: Type.STRING } }
          }
        },
        costReport: {
          type: Type.OBJECT,
          properties: {
            total: { type: Type.STRING },
            breakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { category: { type: Type.STRING }, amount: { type: Type.STRING } }
              }
            }
          }
        }
      },
      required: ["itinerary", "recommendations", "costReport"]
    }
  };

  if (useGrounding) {
    config.tools = [{ googleSearch: {} }];
  }

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `목적지: ${prompt}. 상세 여행 일정을 한국어로 작성해 주세요. 
    일차 구분(type: 'day')과 장소(type: 'location')를 포함해야 합니다. 
    장소에 대한 간단한 팁이나 특징은 notes 필드에 작성해 주세요.
    ${useGrounding ? "구글 검색을 사용하여 실제 영업 시간과 효율적인 이동 동선을 분석하여 반영해 주세요." : ""}
    추천 장소 리스트(recommendations)와 예산 보고서(costReport)도 반드시 포함하세요.`,
    config
  });

  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  const sources: GroundingSource[] = [];
  if (groundingChunks) {
    groundingChunks.forEach((chunk: any) => {
      if (chunk.web) {
        sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      }
    });
  }

  return {
    data: JSON.parse(response.text || '{}'),
    sources
  };
}

// --- Components ---
const TravelRouteView = React.forwardRef<SVGSVGElement, { 
  items: RouteItem[], 
  onSelect: (id: string) => void, 
  onInsert: (index: number) => void,
  selectedId: string | null,
  font: FontType,
  fontSize: number,
  iconSize: number,
  itemsPerRow: number,
  showTime: boolean,
  showIcons: boolean,
  showNotes: boolean,
  primaryColor: string,
  textColor: string,
  globalIconOffsetY: number
}>(({ items, onSelect, onInsert, selectedId, font, fontSize, iconSize, itemsPerRow, showTime, showIcons, showNotes, primaryColor, textColor, globalIconOffsetY }, ref) => {
  const points = useMemo(() => {
    return items.map((_, i) => {
      const row = Math.floor(i / itemsPerRow);
      const isReversed = row % 2 !== 0;
      const colInRow = i % itemsPerRow;
      const col = isReversed ? (itemsPerRow - 1 - colInRow) : colInRow;
      return { x: MARGIN + col * NODE_SPACING_X, y: MARGIN + row * NODE_SPACING_Y };
    });
  }, [items, itemsPerRow]);

  const width = MARGIN * 2 + (itemsPerRow - 1) * NODE_SPACING_X;
  const height = MARGIN * 2 + Math.floor((items.length - 1) / itemsPerRow) * NODE_SPACING_Y + 120;

  const getActiveDayColor = (index: number) => {
    let activeColor = primaryColor;
    for (let j = index; j >= 0; j--) {
      if (items[j].type === 'day' && items[j].color) {
        activeColor = items[j].color;
        break;
      }
    }
    return activeColor;
  };

  return (
    <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 p-12 min-w-max transition-all duration-500">
      <svg ref={ref} width={width} height={height} className="overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="glossy" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="white" stopOpacity="0.8"/><stop offset="100%" stopColor="white" stopOpacity="0"/></linearGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="4"/><feOffset dx="0" dy="4"/><feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>

        {/* Connection Lines & Insert Hit Areas */}
        {points.map((p, i) => {
          if (i === points.length - 1) return null;
          const next = points[i + 1];
          const isTurn = (i + 1) % itemsPerRow === 0;
          const activeColor = getActiveDayColor(i);
          
          let pathD = '';
          if (isTurn) {
            const curveX = (Math.floor(i / itemsPerRow) % 2 === 0) ? p.x + 80 : p.x - 80;
            pathD = `M ${p.x} ${p.y} C ${curveX} ${p.y}, ${curveX} ${next.y}, ${next.x} ${next.y}`;
          } else {
            pathD = `M ${p.x} ${p.y} L ${next.x} ${next.y}`;
          }

          return (
            <g key={`line-${i}`} className="group/line cursor-pointer" onClick={() => onInsert(i + 1)}>
              <path 
                d={pathD} 
                fill="none" 
                stroke={activeColor} 
                strokeWidth={isTurn ? "6" : "12"} 
                strokeDasharray={isTurn ? "1 12" : "none"}
                strokeLinecap="round" 
                opacity={isTurn ? "0.4" : "0.15"} 
                className="transition-all duration-300"
              />
              <path 
                d={pathD} 
                fill="none" 
                stroke="transparent" 
                strokeWidth="30" 
                strokeLinecap="round" 
              />
              <circle 
                cx={(p.x + next.x) / 2} 
                cy={(p.y + next.y) / 2} 
                r="14" 
                fill="white" 
                stroke={activeColor} 
                strokeWidth="2" 
                className="opacity-0 group-hover/line:opacity-100 transition-opacity shadow-lg" 
              />
              <text 
                x={(p.x + next.x) / 2} 
                y={(p.y + next.y) / 2 + 4} 
                textAnchor="middle" 
                className="opacity-0 group-hover/line:opacity-100 transition-opacity pointer-events-none font-bold text-[16px]" 
                fill={activeColor}
              >+</text>
            </g>
          );
        })}

        {/* Nodes */}
        {items.map((item, i) => {
          const p = points[i];
          const lines = splitTextIntoLines(item.label, 17);
          const notesLines = splitTextIntoLines(item.notes || '', 22);
          const isSelected = selectedId === item.id;
          const itemColor = item.type === 'day' ? (item.color || primaryColor) : getActiveDayColor(i);
          
          if (item.type === 'day') {
            const dayW = Math.max(80, Math.max(...lines.map(l => l.length)) * (fontSize * 0.7) + 30);
            const dayH = (fontSize * 1.3 * lines.length) + 20;
            return (
              <g key={item.id} className="cursor-pointer" onClick={() => onSelect(item.id)}>
                <rect x={p.x - dayW/2} y={p.y - dayH/2} width={dayW} height={dayH} rx="20" fill={itemColor} filter="url(#shadow)" />
                <rect x={p.x - dayW/2} y={p.y - dayH/2} width={dayW} height={dayH/2} rx="20" fill="url(#glossy)" />
                <text x={p.x} y={p.y - ((lines.length - 1) * fontSize * 0.6) + fontSize/3} textAnchor="middle" fill="white" style={{fontFamily: FONTS[font], fontWeight: '900', fontSize: `${fontSize}px`}}>
                  {lines.map((l, idx) => <tspan key={idx} x={p.x} dy={idx === 0 ? 0 : fontSize * 1.3}>{l}</tspan>)}
                </text>
                {isSelected && <rect x={p.x - dayW/2 - 4} y={p.y - dayH/2 - 4} width={dayW + 8} height={dayH + 8} rx="24" fill="none" stroke={itemColor} strokeWidth="3" opacity="0.5" />}
              </g>
            );
          }
          
          const boxSize = iconSize + 30;
          const labelYStart = showTime && item.time ? 45 + fontSize : 45;
          const notesYStart = labelYStart + (lines.length * fontSize * 1.2) + 5;

          return (
            <g key={item.id} className="cursor-pointer" onClick={() => onSelect(item.id)}>
              <circle cx={p.x} cy={p.y} r="12" fill="white" stroke="#e2e8f0" strokeWidth="3" filter="url(#shadow)" />
              <circle cx={p.x} cy={p.y} r="6" fill={isSelected ? itemColor : itemColor + '44'} />
              {showIcons && (
                <g transform={`translate(${p.x - boxSize/2}, ${p.y + globalIconOffsetY - boxSize/2})`}>
                  <rect width={boxSize} height={boxSize} rx="16" fill={isSelected ? itemColor : "white"} stroke={isSelected ? itemColor : "#f1f5f9"} strokeWidth="2" filter="url(#shadow)" />
                  {item.imageUrl ? <image href={item.imageUrl} width={boxSize} height={boxSize} preserveAspectRatio="xMidYMid slice" clipPath="inset(0% round 16px)" /> : 
                  <g transform={`translate(${boxSize/2 - iconSize/2}, ${boxSize/2 - iconSize/2})`} color={isSelected ? "white" : itemColor}>{React.createElement(ICON_MAP[item.icon || 'map'] || MapPin, { size: iconSize })}</g>}
                  <rect width={boxSize} height={boxSize/2} rx="16" fill="url(#glossy)" pointerEvents="none" />
                </g>
              )}
              {showTime && item.time && <text x={p.x} y={p.y + 40} textAnchor="middle" fill={textColor} opacity="0.6" style={{fontFamily: FONTS[font], fontSize: `${fontSize * 0.8}px`, fontWeight: '700'}}>{item.time}</text>}
              <text x={p.x} y={p.y + labelYStart} textAnchor="middle" fill={textColor} style={{fontFamily: FONTS[font], fontSize: `${fontSize}px`, fontWeight: '800'}}>
                {lines.map((l, idx) => <tspan key={idx} x={p.x} dy={idx === 0 ? 0 : fontSize * 1.2}>{l}</tspan>)}
              </text>
              {showNotes && item.notes && (
                <text x={p.x} y={p.y + notesYStart} textAnchor="middle" fill={textColor} opacity="0.5" style={{fontFamily: FONTS[font], fontSize: `${fontSize * 0.75}px`, fontWeight: '600'}}>
                  {notesLines.map((l, idx) => <tspan key={idx} x={p.x} dy={idx === 0 ? 0 : fontSize * 1.0}>{l}</tspan>)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
});

const App = () => {
  const [items, setItems] = useState<RouteItem[]>([
    { id: '1', label: 'Day 1', type: 'day', color: '#10b981', notes: '여행의 시작!' },
    { id: '2', label: '공항 도착 및 호텔 체크인', time: '09:00', icon: 'plane', type: 'location', notes: '제1터미널로 도착' },
    { id: '3', label: '주변 맛집 탐방', time: '12:00', icon: 'food', type: 'location', notes: '평점 4.5 이상인 곳으로 가기' },
  ]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [costReport, setCostReport] = useState<CostReport | null>(null);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [font, setFont] = useState<FontType>('pretendard');
  const [fontSize, setFontSize] = useState<number>(14);
  const [iconSize, setIconSize] = useState<number>(24);
  const [itemsPerRow, setItemsPerRow] = useState<number>(5);
  const [showTime, setShowTime] = useState(true);
  const [showIcons, setShowIcons] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [textColor, setTextColor] = useState('#334155');
  const [globalIconOffsetY, setGlobalIconOffsetY] = useState<number>(-70);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = (u: RouteItem) => setItems(prev => prev.map(i => i.id === u.id ? u : i));
  const handleDelete = (id: string) => { setItems(prev => prev.filter(i => i.id !== id)); if (selectedId === id) setSelectedId(null); };
  
  const handleAdd = useCallback((type: ItemType) => {
    const newItem: RouteItem = { 
      id: Math.random().toString(36).substr(2, 9), 
      label: type === 'day' ? 'Day' : '새로운 장소', 
      notes: '',
      type, 
      icon: 'map', 
      time: '12:00',
      color: type === 'day' ? primaryColor : undefined
    };
    setItems(prev => [...prev, newItem]); 
    setSelectedId(newItem.id);
  }, [primaryColor]);

  const handleInsertAt = useCallback((index: number) => {
    const newItem: RouteItem = { 
      id: Math.random().toString(36).substr(2, 9), 
      label: '새로운 장소', 
      notes: '',
      type: 'location', 
      icon: 'map', 
      time: '12:00'
    };
    setItems(prev => {
      const copy = [...prev];
      copy.splice(index, 0, newItem);
      return copy;
    });
    setSelectedId(newItem.id);
  }, []);

  const handleAi = async () => {
    if (!aiPrompt.trim()) return; 
    setIsLoading(true);
    setCostReport(null);
    setRecommendations([]);
    setGroundingSources([]);
    try {
      const result = await generateSmartItinerary(aiPrompt, useSearchGrounding);
      if (result.data.itinerary) {
        setItems(result.data.itinerary.map((i: any) => ({ 
          ...i, 
          id: Math.random().toString(36).substr(2, 9), 
          color: i.type === 'day' ? primaryColor : undefined 
        })));
        setRecommendations(result.data.recommendations || []);
        setCostReport(result.data.costReport || null);
        setGroundingSources(result.sources || []);
      }
    } catch (e) { 
      alert('AI 생성 오류: ' + (e as Error).message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const onDragStart = (idx: number) => setDraggedIndex(idx);
  const onDragOver = (idx: number) => {
    if (draggedIndex === null || draggedIndex === idx) return;
    const newItems = [...items]; 
    const item = newItems.splice(draggedIndex, 1)[0];
    newItems.splice(idx, 0, item); 
    setDraggedIndex(idx); 
    setItems(newItems);
  };

  const downloadPNG = () => {
    if (!svgRef.current) return;
    const bbox = svgRef.current.getBBox();
    const svgStr = new XMLSerializer().serializeToString(svgRef.current);
    const canvas = document.createElement('canvas');
    const scale = 2; const padding = 60;
    canvas.width = (bbox.width + padding * 2) * scale; 
    canvas.height = (bbox.height + padding * 2) * scale;
    const ctx = canvas.getContext('2d'); 
    if (!ctx) return;
    ctx.scale(scale, scale);
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, padding - bbox.x, padding - bbox.y, bbox.width, bbox.height);
      const link = document.createElement('a'); 
      link.href = canvas.toDataURL('image/png'); 
      link.download = "eunto-travel.png"; 
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  };

  const currentItem = items.find(i => i.id === selectedId);

  return (
    <div className="h-screen flex flex-col bg-[#f4f7f6] overflow-hidden" style={{ fontFamily: FONTS[font] }}>
      {/* Promo Bar */}
      <div className="bg-slate-900 text-white py-2 px-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 z-50 border-b border-white/10 text-[10px] font-black uppercase tracking-tight overflow-x-auto no-scrollbar">
        <a 
          href="https://3ha.in/r/358139" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors group flex-shrink-0"
        >
          <div className="bg-emerald-500 rounded-full p-0.5 group-hover:scale-110 transition-transform">
            <Plane className="w-2.5 h-2.5 text-white" />
          </div>
          <span>항공권 최저가</span>
          <ChevronRight className="w-2.5 h-2.5 opacity-50" />
        </a>
        <div className="w-px h-3 bg-white/20" />
        <a 
          href="https://kr.trip.com/?locale=ko-kr" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-1.5 hover:text-sky-400 transition-colors group flex-shrink-0"
        >
          <div className="bg-sky-500 rounded-full p-0.5 group-hover:scale-110 transition-transform">
            <HotelIcon className="w-2.5 h-2.5 text-white" />
          </div>
          <span>Trip 숙소 할인</span>
          <ChevronRight className="w-2.5 h-2.5 opacity-50" />
        </a>
        <div className="w-px h-3 bg-white/20" />
        <a 
          href="https://www.myrealtrip.com/experiences/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-1.5 hover:text-amber-400 transition-colors group flex-shrink-0"
        >
          <div className="bg-amber-500 rounded-full p-0.5 group-hover:scale-110 transition-transform">
            <Ticket className="w-2.5 h-2.5 text-white" />
          </div>
          <span>마이리얼트립 투어 할인</span>
          <ChevronRight className="w-2.5 h-2.5 opacity-50" />
        </a>
      </div>

      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-8 py-5 flex items-center justify-between z-40 h-20 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl shadow-xl text-white" style={{ background: primaryColor }}><MapPin className="w-6 h-6" /></div>
          <div><h1 className="text-2xl font-black text-slate-800 tracking-tight">Eunto Travel</h1><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Premium Itinerary AI</p></div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowIcons(!showIcons)} className={`px-4 py-2.5 border rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${showIcons ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
            {showIcons ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} 아이콘 {showIcons ? '숨기기' : '표시'}
          </button>
          <button onClick={() => setShowTime(!showTime)} className={`px-4 py-2.5 border rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${showTime ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
             {showTime ? <Clock className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} 시간 {showTime ? '숨기기' : '표시'}
          </button>
          <button onClick={() => setShowNotes(!showNotes)} className={`px-4 py-2.5 border rounded-2xl font-bold text-sm flex items-center gap-2 transition-all ${showNotes ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
             {showNotes ? <FileText className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />} 비고 {showNotes ? '숨기기' : '표시'}
          </button>
          <button onClick={() => {if(window.confirm('초기화하시겠습니까?')) {setItems([{id:'1',label:'Day 1',type:'day',color:primaryColor, notes: ''}]);setRecommendations([]);setCostReport(null);setGroundingSources([]);}}} className="px-4 py-2.5 bg-white text-rose-500 border border-rose-100 rounded-2xl font-bold hover:bg-rose-50 text-sm flex items-center gap-2"><RotateCcw className="w-4 h-4" />초기화</button>
          <button onClick={downloadPNG} className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold hover:bg-slate-50 text-sm flex items-center gap-2"><Download className="w-4 h-4" />PNG</button>
          <button className="px-6 py-2.5 text-white rounded-2xl font-bold shadow-xl text-sm flex items-center gap-2" style={{ background: primaryColor }}><Save className="w-4 h-4" />저장</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Full Adjustments */}
        <aside className="w-[400px] flex-shrink-0 flex flex-col gap-6 p-8 overflow-y-auto custom-scrollbar border-r border-slate-200 h-full bg-[#f8fafc]">
          <div className="bg-white p-6 rounded-[35px] shadow-lg border border-slate-100">
            <h3 className="text-xs font-black text-slate-500 mb-4 uppercase tracking-widest flex items-center gap-2"><Palette className="w-4 h-4" /> 테마 & 스타일</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500">기본 테마 색상</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 overflow-hidden" />
                  <div className="flex-1 flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                    {PRESET_COLORS.map(c => <button key={c} onClick={() => setPrimaryColor(c)} className={`w-6 h-6 rounded-full flex-shrink-0 ${primaryColor === c ? 'ring-2 ring-slate-800' : ''}`} style={{ backgroundColor: c }} />)}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500">폰트 스타일</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(FONTS) as FontType[]).map(f => (
                    <button key={f} onClick={() => setFont(f)} style={{ fontFamily: FONTS[f] }} className={`text-[11px] py-3 rounded-xl border-2 font-bold transition-all ${font === f ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'}`}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center"><label className="text-[11px] font-bold text-slate-500">한 줄 당 개수</label><span className="text-[10px] font-black text-slate-400">{itemsPerRow}개</span></div>
                  <input type="range" min="2" max="10" value={itemsPerRow} onChange={e => setItemsPerRow(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-slate-800" />
                </div>
                <div className="space-y-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center"><label className="text-[11px] font-bold text-slate-500 flex items-center gap-1"><MoveVertical className="w-3 h-3" /> 아이콘 높이 조절</label><span className="text-[10px] font-black text-slate-400">{globalIconOffsetY}px</span></div>
                  <input type="range" min="-180" max="80" value={globalIconOffsetY} onChange={e => setGlobalIconOffsetY(parseInt(e.target.value))} className="w-full h-1.5 bg-white border rounded-lg accent-slate-800" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[35px] shadow-lg border border-slate-100">
            <h3 className="text-xs font-black text-slate-500 mb-4 uppercase tracking-widest flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> AI 자동 플래너</h3>
            <div className="space-y-3">
              <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="목적지 입력 (예: 제주도 2박 3일)" className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm text-slate-700" />
              
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-emerald-500" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-700">실시간 경로 최적화</span>
                    <span className="text-[9px] text-slate-400 font-medium">Google Search 활용</span>
                  </div>
                </div>
                <button 
                  onClick={() => setUseSearchGrounding(!useSearchGrounding)}
                  className={`w-10 h-5 rounded-full transition-all relative ${useSearchGrounding ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${useSearchGrounding ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              <button onClick={handleAi} disabled={isLoading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isLoading ? '경로 설계 중...' : '스마트 경로 생성'}
              </button>
            </div>
            
            {groundingSources.length > 0 && (
              <div className="mt-6 p-4 bg-slate-900 rounded-2xl border border-slate-800 animate-in fade-in duration-500">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><Search className="w-3 h-3 text-emerald-400" /> 최적화 참고 근거</h4>
                <div className="space-y-1.5">
                  {groundingSources.map((source, i) => (
                    <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[9px] text-slate-300 hover:text-emerald-400 transition-colors truncate">
                      <div className="w-1 h-1 bg-emerald-400 rounded-full flex-shrink-0" />
                      {source.title || source.uri}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {recommendations.length > 0 && (
              <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-100 animate-in fade-in duration-500">
                <h4 className="text-[11px] font-black text-amber-600 uppercase mb-3 flex items-center gap-2"><ExternalLink className="w-3 h-3" /> 추천 여행 정보</h4>
                <div className="space-y-2">
                  {recommendations.map((rec, i) => (
                    <a key={i} href={rec.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-100 hover:shadow-md transition-all group">
                      <span className="text-[11px] font-bold text-slate-700 truncate mr-2">{rec.title}</span><ExternalLink className="w-3 h-3 text-amber-400 group-hover:text-amber-500" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {costReport && (
            <div className="bg-slate-900 text-white p-6 rounded-[35px] shadow-2xl border border-slate-800 animate-in slide-in-from-bottom">
              <div className="flex items-center justify-between mb-5"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-400" /> AI 예상 경비</h3><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
              <div className="mb-6"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">총 예상 합계</p><h2 className="text-3xl font-black text-emerald-400">{costReport.total}</h2></div>
              <div className="space-y-3">
                {costReport.breakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                    <div className="flex items-center gap-2"><div className="p-1.5 bg-white/10 rounded-lg">{getCostIcon(item.category)}</div><span className="text-[11px] font-bold text-slate-300">{item.category}</span></div>
                    <span className="text-[11px] font-black">{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-[35px] shadow-lg border border-slate-100 flex flex-col min-h-[400px]">
            <h3 className="text-xs font-black text-slate-500 mb-4 uppercase tracking-widest">일정 레이어 ({items.length})</h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {items.map((it, idx) => (
                <div key={it.id} draggable onDragStart={() => onDragStart(idx)} onDragOver={() => onDragOver(idx)} onClick={() => setSelectedId(it.id)} className={`group flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedId === it.id ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-transparent bg-slate-50 hover:border-slate-200'}`}>
                  <GripVertical className="w-4 h-4 text-slate-300" />
                  <div className="flex-1">
                    <div className={`font-bold text-sm ${it.type === 'day' ? 'font-black' : 'text-slate-600'}`} style={{ color: it.type === 'day' ? (it.color || primaryColor) : textColor }}>{it.label}</div>
                    {it.notes && <div className="text-[10px] text-slate-400 truncate w-48">{it.notes}</div>}
                  </div>
                  <button onClick={e => {e.stopPropagation(); handleDelete(it.id);}} className="opacity-0 group-hover:opacity-100 p-2 text-rose-400 hover:text-rose-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={() => handleAdd('location')} className="flex-[2] py-4 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 transition-all hover:brightness-110" style={{ background: primaryColor }}><Plus className="w-5 h-5" /> 장소</button>
              <button onClick={() => handleAdd('day')} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200"><Calendar className="w-4 h-4" /> 일차</button>
            </div>
          </div>
        </aside>

        {/* Center Content - Independent Scrollable Canvas */}
        <section className="flex-1 relative overflow-auto custom-scrollbar flex flex-col items-center py-12 px-8 h-full bg-[#f1f5f9]">
          <div className="sticky top-0 mb-8 pointer-events-none z-10 w-full flex justify-center">
             <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full shadow-lg border border-white/50 flex items-center gap-6 pointer-events-auto">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full"></div><span className="text-xs font-semibold text-slate-600">이동 경로 (클릭하여 중간 삽입)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-dashed border-slate-300 rounded-full"></div><span className="text-xs font-semibold text-slate-600">유턴 구간</span></div>
             </div>
          </div>
          
          <div className="flex-shrink-0">
            <TravelRouteView 
              ref={svgRef} 
              items={items} 
              onSelect={setSelectedId} 
              onInsert={handleInsertAt}
              selectedId={selectedId} 
              font={font} fontSize={fontSize} iconSize={iconSize} 
              itemsPerRow={itemsPerRow} showTime={showTime} showIcons={showIcons} showNotes={showNotes} primaryColor={primaryColor} textColor={textColor}
              globalIconOffsetY={globalIconOffsetY}
            />
          </div>
          <div className="h-48 flex-shrink-0" />
        </section>

        {/* Right Sidebar - Detail Edit */}
        {selectedId && currentItem && (
          <aside className="w-96 flex-shrink-0 bg-white shadow-2xl border-l p-8 z-50 animate-in slide-in-from-right overflow-y-auto custom-scrollbar h-full">
            <div className="flex justify-between items-center mb-10"><h2 className="text-xl font-black">상세 정보 편집</h2><button onClick={() => setSelectedId(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button></div>
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-2">명칭</label>
                <textarea rows={2} value={currentItem.label} onChange={e => handleUpdate({ ...currentItem, label: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold focus:ring-4 outline-none text-slate-900 resize-none transition-all" />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-slate-500 mb-2 flex items-center gap-2"><FileText className="w-3 h-3" /> 비고 (메모)</label>
                <textarea rows={3} value={currentItem.notes || ''} onChange={e => handleUpdate({ ...currentItem, notes: e.target.value })} placeholder="추가 메모를 입력하세요 (지도에 표시됨)" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-semibold focus:ring-4 outline-none text-slate-700 resize-none transition-all text-xs" />
              </div>
              
              {currentItem.type === 'day' && (
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-500">일차 포인트 색상</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={currentItem.color || primaryColor} onChange={e => handleUpdate({ ...currentItem, color: e.target.value })} className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0" />
                    <div className="flex-1 flex gap-1 overflow-x-auto pb-1 custom-scrollbar">
                      {PRESET_COLORS.map(c => <button key={c} onClick={() => handleUpdate({ ...currentItem, color: c })} className={`w-6 h-6 rounded-full flex-shrink-0 ${currentItem.color === c ? 'ring-2 ring-slate-800' : ''}`} style={{ backgroundColor: c }} />)}
                    </div>
                  </div>
                </div>
              )}

              {currentItem.type === 'location' && (
                <>
                  <div><label className="block text-[11px] font-black uppercase text-slate-500 mb-2">방문 시간</label><input type="time" value={currentItem.time || ''} onChange={e => handleUpdate({ ...currentItem, time: e.target.value })} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none text-slate-700" /></div>
                  <div className="space-y-3">
                    <label className="block text-[11px] font-black uppercase text-slate-500">사진 업로드</label>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-500 font-bold text-sm hover:border-slate-400 transition-all"><Upload className="w-4 h-4" />사진 추가</button>
                    <input type="file" ref={fileInputRef} onChange={e => {const f = e.target.files?.[0]; if(f){const r = new FileReader(); r.onloadend = () => handleUpdate({...currentItem, imageUrl: r.result as string}); r.readAsDataURL(f);}}} accept="image/*" className="hidden" />
                    {currentItem.imageUrl && <div className="relative group rounded-2xl overflow-hidden border"><img src={currentItem.imageUrl} className="w-full h-32 object-cover" /><button onClick={() => handleUpdate({...currentItem, imageUrl: undefined})} className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 text-white font-bold transition-all flex items-center justify-center">이미지 삭제</button></div>}
                  </div>
                  <div>
                    <label className="block text-[11px] font-black uppercase text-slate-500 mb-2">아이콘 선택</label>
                    <div className="grid grid-cols-5 gap-2 bg-slate-50 p-3 rounded-2xl border max-h-48 overflow-y-auto custom-scrollbar">
                      {Object.keys(ICON_MAP).map(k => (
                        <button key={k} onClick={() => handleUpdate({ ...currentItem, icon: k })} className={`p-2 rounded-xl transition-all flex items-center justify-center ${currentItem.icon === k ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-white hover:shadow-sm'}`}>{React.createElement(ICON_MAP[k], { size: 18 })}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="pt-10"><button onClick={() => handleDelete(selectedId)} className="w-full py-4 bg-rose-50 text-rose-500 font-black rounded-2xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2 shadow-md"><Trash2 className="w-5 h-5" /> 항목 삭제</button></div>
            </div>
          </aside>
        )}
      </main>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
