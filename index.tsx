
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
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
const NODE_SPACING_X = 200;
const NODE_SPACING_Y = 180;
const MARGIN = 100;

const ICON_MAP: Record<string, any> = {
  car: Car, plane: Plane, train: Train, bus: Bus, ship: Ship, bike: Bike, walk: Footprints, 
  tram: TramFront, cablecar: CableCar, map: MapPin, navigation: Navigation, compass: CompassIcon, 
  globe: Globe, truck: Truck, landmark: Landmark, food: UtensilsCrossed, cafe: Clock, 
  camera: Camera, hotel: HotelIcon, bed: Bed, home: Home, building: Building, 
  hospital: Hospital, medical: Stethoscope, bank: Landmark, money: Banknote, 
  bath: Bath, wifi: Wifi, phone: Phone, charge: BatteryCharging, bag: Briefcase,
  mountain: Mountain, waves: Waves, tent: Tent, tree: TreePine, sun: Sun, 
  moon: Moon, star: Star, heart: Heart, fire: Flame, ghost: Ghost, bolt: Zap, 
  bell: Bell, check: CheckCircle, info: Info, cloud: Cloud, umbrella: Umbrella
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
const splitTextIntoLines = (text: string, maxLen: number = 15): string[] => {
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
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

async function generateSmartItinerary(prompt: string, useGrounding: boolean) {
  const ai = getAI();
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
    ${useGrounding ? "실제 영업 시간과 효율적인 이동 동선을 분석하여 반영해 주세요." : ""}
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

  const responseText = response.text || '{}';
  return {
    data: JSON.parse(responseText),
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
  globalIconOffsetY: number,
  notesOffsetY: number
}>(({ items, onSelect, onInsert, selectedId, font, fontSize, iconSize, itemsPerRow, showTime, showIcons, showNotes, primaryColor, textColor, globalIconOffsetY, notesOffsetY }, ref) => {
  
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
  const height = MARGIN * 2 + Math.floor((items.length - 1) / itemsPerRow) * NODE_SPACING_Y + 150 + Math.abs(globalIconOffsetY);

  const getActiveDayColor = (index: number) => {
    let activeColor = primaryColor;
    for (let j = index; j >= 0; j--) {
      if (items[j]?.type === 'day' && items[j]?.color) {
        activeColor = items[j].color || primaryColor;
        break;
      }
    }
    return activeColor;
  };

  return (
    <div className="bg-white rounded-[40px] shadow-2xl border border-slate-200 p-12 min-w-max transition-all duration-500 overflow-visible">
      <svg ref={ref} width={width} height={height} className="overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="glossy" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="white" stopOpacity="0.8"/><stop offset="100%" stopColor="white" stopOpacity="0"/></linearGradient>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="4"/><feOffset dx="0" dy="4"/><feComponentTransfer><feFuncA type="linear" slope="0.3"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" /></marker>
        </defs>

        {/* Connection Lines */}
        {points.map((p, i) => {
          if (i === points.length - 1) return null;
          const next = points[i + 1];
          const isTurn = (i + 1) % itemsPerRow === 0;
          const activeColor = getActiveDayColor(i);
          
          let pathD = '';
          if (isTurn) {
            const row = Math.floor(i / itemsPerRow);
            const isRowEven = row % 2 === 0;
            const curveX = isRowEven ? p.x + 100 : p.x - 100;
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
                strokeWidth={isTurn ? "4" : "12"} 
                strokeDasharray={isTurn ? "8 8" : "none"}
                strokeLinecap="round" 
                opacity={isTurn ? "0.3" : "0.1"} 
                className="transition-all duration-300"
              />
              <path 
                d={pathD} 
                fill="none" 
                stroke="transparent" 
                strokeWidth="40" 
                strokeLinecap="round" 
              />
              <circle 
                cx={(p.x + next.x) / 2} 
                cy={(p.y + next.y) / 2} 
                r="16" 
                fill="white" 
                stroke={activeColor} 
                strokeWidth="2" 
                className="opacity-0 group-hover/line:opacity-100 transition-opacity shadow-lg" 
              />
              <text 
                x={(p.x + next.x) / 2} 
                y={(p.y + next.y) / 2 + 5} 
                textAnchor="middle" 
                className="opacity-0 group-hover/line:opacity-100 transition-opacity pointer-events-none font-black text-[14px]" 
                fill={activeColor}
              >+</text>
            </g>
          );
        })}

        {/* Nodes */}
        {items.map((item, i) => {
          const p = points[i];
          const lines = splitTextIntoLines(item.label || '', 12);
          const notesLines = splitTextIntoLines(item.notes || '', 18);
          const isSelected = selectedId === item.id;
          const itemColor = item.type === 'day' ? (item.color || primaryColor) : getActiveDayColor(i);
          
          if (item.type === 'day') {
            const dayW = 90;
            const dayH = (fontSize * 1.5 * lines.length) + 25;
            return (
              <g key={item.id} className="cursor-pointer group" onClick={() => onSelect(item.id)}>
                <rect x={p.x - dayW/2} y={p.y - dayH/2} width={dayW} height={dayH} rx="24" fill={itemColor} filter="url(#shadow)" className="group-hover:brightness-110 transition-all" />
                <rect x={p.x - dayW/2} y={p.y - dayH/2} width={dayW} height={dayH/2} rx="24" fill="url(#glossy)" />
                <text x={p.x} y={p.y - ((lines.length - 1) * fontSize * 0.7) + fontSize/3} textAnchor="middle" fill="white" style={{fontFamily: FONTS[font], fontWeight: '900', fontSize: `${fontSize}px`}}>
                  {lines.map((l, idx) => <tspan key={idx} x={p.x} dy={idx === 0 ? 0 : fontSize * 1.4}>{l}</tspan>)}
                </text>
                {isSelected && <rect x={p.x - dayW/2 - 6} y={p.y - dayH/2 - 6} width={dayW + 12} height={dayH + 12} rx="28" fill="none" stroke={itemColor} strokeWidth="4" opacity="0.4" />}
              </g>
            );
          }
          
          const boxSize = iconSize + 24;
          const labelYStart = (showTime && item.time ? 45 + fontSize : 45);
          const notesYStart = labelYStart + (lines.length * fontSize * 1.2) + 8 + notesOffsetY;

          return (
            <g key={item.id} className="cursor-pointer group" onClick={() => onSelect(item.id)}>
              <circle cx={p.x} cy={p.y} r="14" fill="white" stroke="#e2e8f0" strokeWidth="3" filter="url(#shadow)" />
              <circle cx={p.x} cy={p.y} r="7" fill={isSelected ? itemColor : itemColor + '33'} />
              {showIcons && (
                <g transform={`translate(${p.x - boxSize/2}, ${p.y + globalIconOffsetY - boxSize/2})`}>
                  <rect width={boxSize} height={boxSize} rx="18" fill={isSelected ? itemColor : "white"} stroke={isSelected ? itemColor : "#f1f5f9"} strokeWidth="2" filter="url(#shadow)" className="group-hover:scale-105 transition-transform" />
                  {item.imageUrl ? <image href={item.imageUrl} width={boxSize} height={boxSize} preserveAspectRatio="xMidYMid slice" clipPath="inset(0% round 18px)" /> : 
                  <g transform={`translate(${boxSize/2 - iconSize/2}, ${boxSize/2 - iconSize/2})`} color={isSelected ? "white" : itemColor}>{React.createElement(ICON_MAP[item.icon || 'map'] || MapPin, { size: iconSize })}</g>}
                  <rect width={boxSize} height={boxSize/2} rx="18" fill="url(#glossy)" pointerEvents="none" />
                </g>
              )}
              {showTime && item.time && <text x={p.x} y={p.y + 45} textAnchor="middle" fill={textColor} opacity="0.5" style={{fontFamily: FONTS[font], fontSize: `${fontSize * 0.8}px`, fontWeight: '800'}}>{item.time}</text>}
              <text x={p.x} y={p.y + labelYStart} textAnchor="middle" fill={textColor} style={{fontFamily: FONTS[font], fontSize: `${fontSize}px`, fontWeight: '900'}}>
                {lines.map((l, idx) => <tspan key={idx} x={p.x} dy={idx === 0 ? 0 : fontSize * 1.3}>{l}</tspan>)}
              </text>
              {showNotes && item.notes && (
                <text x={p.x} y={p.y + notesYStart} textAnchor="middle" fill={textColor} opacity="0.4" style={{fontFamily: FONTS[font], fontSize: `${fontSize * 0.7}px`, fontWeight: '600'}}>
                  {notesLines.map((l, idx) => <tspan key={idx} x={p.x} dy={idx === 0 ? 0 : fontSize * 1.1}>{l}</tspan>)}
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
    { id: '2', label: '공항 도착', time: '09:00', icon: 'plane', type: 'location', notes: '입국 심사 확인' },
    { id: '3', label: '호텔 체크인', time: '11:00', icon: 'hotel', type: 'location', notes: '짐 보관 요청' },
    { id: '4', label: '현지 맛집', time: '13:00', icon: 'food', type: 'location', notes: '예약 필수' },
    { id: '5', label: '관광지 투어', time: '15:00', icon: 'camera', type: 'location', notes: '일몰 감상 포인트' },
  ]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [costReport, setCostReport] = useState<CostReport | null>(null);
  const [groundingSources, setGroundingSources] = useState<GroundingSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [font, setFont] = useState<FontType>('pretendard');
  const [fontSize, setFontSize] = useState<number>(14);
  const [iconSize, setIconSize] = useState<number>(26);
  const [itemsPerRow, setItemsPerRow] = useState<number>(5);
  const [showTime, setShowTime] = useState(true);
  const [showIcons, setShowIcons] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [textColor, setTextColor] = useState('#1e293b');
  const [globalIconOffsetY, setGlobalIconOffsetY] = useState<number>(-75);
  const [notesOffsetY, setNotesOffsetY] = useState<number>(0);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Close palette when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setIsPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    const scale = 2; const padding = 80;
    canvas.width = (bbox.width + padding * 2) * scale; 
    canvas.height = (bbox.height + padding * 2) * scale;
    const ctx = canvas.getContext('2d'); 
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, padding - bbox.x, padding - bbox.y, bbox.width, bbox.height);
      const link = document.createElement('a'); 
      link.href = canvas.toDataURL('image/png'); 
      link.download = "eunto-travel-itinerary.png"; 
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  };

  const currentItem = items.find(i => i.id === selectedId);

  return (
    <div className="h-screen flex flex-col bg-[#f0f4f8] overflow-hidden" style={{ fontFamily: FONTS[font] }}>
      {/* Top Banner */}
      <div className="bg-slate-950 text-white py-3 px-6 flex items-center justify-center gap-12 z-50 text-[14pt] font-black uppercase tracking-tight border-b border-white/10 whitespace-nowrap overflow-x-auto no-scrollbar shadow-lg">
        <a href="https://3ha.in/r/358139" target="_blank" className="flex items-center gap-2.5 text-emerald-400 hover:text-emerald-300 transition-all hover:scale-105 transform">
          <Plane className="w-5 h-5" /> 최저가 항공권
        </a>
        <a href="https://kr.trip.com" target="_blank" className="flex items-center gap-2.5 text-sky-400 hover:text-sky-300 transition-all hover:scale-105 transform">
          <HotelIcon className="w-5 h-5" /> 숙소 15% 할인
        </a>
        <a href="https://www.myrealtrip.com" target="_blank" className="flex items-center gap-2.5 text-amber-400 hover:text-amber-300 transition-all hover:scale-105 transform">
          <Ticket className="w-5 h-5" /> 투어/액티비티 특가
        </a>
      </div>

      <header className="bg-white/90 backdrop-blur-2xl border-b border-slate-200 px-8 py-4 flex items-center justify-between z-40 h-20 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xl rotate-3 hover:rotate-0 transition-transform cursor-pointer" style={{ background: primaryColor }}>
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
              Eunto Travel <span className="bg-slate-100 text-slate-500 text-[9px] px-2 py-0.5 rounded-full">PRO</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Premium AI Route Engine</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-slate-100 p-1 rounded-2xl mr-4">
            <button onClick={() => setShowIcons(!showIcons)} className={`p-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${showIcons ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
              <Camera className="w-3.5 h-3.5" /> 아이콘
            </button>
            <button onClick={() => setShowTime(!showTime)} className={`p-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${showTime ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
              <Clock className="w-3.5 h-3.5" /> 시간
            </button>
            <button onClick={() => setShowNotes(!showNotes)} className={`p-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${showNotes ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
              <FileText className="w-3.5 h-3.5" /> 비고
            </button>
          </div>
          <button onClick={() => {if(window.confirm('모든 일정을 초기화하시겠습니까?')) {setItems([{id:'1',label:'Day 1',type:'day',color:primaryColor, notes: ''}]);setRecommendations([]);setCostReport(null);setGroundingSources([]);}}} className="p-3 text-rose-500 hover:bg-rose-50 rounded-2xl transition-colors"><RotateCcw className="w-5 h-5" /></button>
          <button onClick={downloadPNG} className="px-5 py-2.5 bg-slate-800 text-white rounded-2xl font-bold shadow-xl flex items-center gap-2 hover:bg-slate-900 transition-all text-sm"><Download className="w-4 h-4" /> PNG 저장</button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[380px] flex-shrink-0 flex flex-col gap-6 p-6 overflow-y-auto custom-scrollbar border-r border-slate-200 h-full bg-slate-50/50">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
              <h3 className="text-[11px] font-black text-slate-400 mb-5 uppercase tracking-widest flex items-center justify-between">
                스마트 플래너 <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </h3>
              <div className="space-y-3">
                <div className="relative">
                  <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder="어디로 떠나시나요? (예: 제주 2박 3일)" className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none font-bold text-sm focus:ring-4 ring-slate-100 transition-all" />
                  <Globe className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                </div>
                <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-100 rounded-xl"><Globe2 className="w-4 h-4 text-emerald-600" /></div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-700">Google 실시간 검색</span>
                      <span className="text-[9px] text-slate-400 font-bold">최적 경로/영업시간 반영</span>
                    </div>
                  </div>
                  <button onClick={() => setUseSearchGrounding(!useSearchGrounding)} className={`w-11 h-6 rounded-full transition-all relative ${useSearchGrounding ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${useSearchGrounding ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <button onClick={handleAi} disabled={isLoading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black shadow-2xl disabled:opacity-50 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Sparkles className="w-5 h-5 text-amber-400" />}
                  {isLoading ? '경로 설계 중...' : 'AI 일정 생성하기'}
                </button>
              </div>
            </div>

            {groundingSources.length > 0 && (
              <div className="bg-slate-900 text-white p-6 rounded-[35px] shadow-2xl animate-in slide-in-from-left duration-500">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2"><Search className="w-3.5 h-3.5 text-emerald-400" /> 최적화 근거 자료</h4>
                <div className="space-y-2">
                  {groundingSources.map((source, i) => (
                    <a key={i} href={source.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all group">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
                      <span className="text-[10px] font-bold text-slate-300 truncate group-hover:text-white transition-colors">{source.title || source.uri}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {costReport && (
              <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 animate-in slide-in-from-bottom">
                <div className="flex items-center justify-between mb-4"><h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-500" /> 예상 경비 보고서</h3><TrendingUp className="w-4 h-4 text-emerald-500" /></div>
                <div className="mb-6"><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">총 예산 합계</p><h2 className="text-3xl font-black text-slate-800">{costReport.total}</h2></div>
                <div className="space-y-2">
                  {costReport.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3"><div className="p-2 bg-white rounded-xl shadow-sm">{getCostIcon(item.category)}</div><span className="text-[11px] font-bold text-slate-600">{item.category}</span></div>
                      <span className="text-[11px] font-black text-slate-800">{item.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 flex flex-col max-h-[500px]">
              <h3 className="text-[11px] font-black text-slate-400 mb-5 uppercase tracking-widest flex items-center justify-between">일정 레이어 <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{items.length}</span></h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {items.map((it, idx) => (
                  <div key={it.id} draggable onDragStart={() => onDragStart(idx)} onDragOver={() => onDragOver(idx)} onClick={() => setSelectedId(it.id)} className={`group flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer ${selectedId === it.id ? 'border-slate-800 bg-slate-50 shadow-sm' : 'border-transparent bg-slate-50 hover:border-slate-200'}`}>
                    <GripVertical className="w-4 h-4 text-slate-300" />
                    <div className="flex-1">
                      <div className={`text-sm font-bold ${it.type === 'day' ? 'text-[15px]' : ''}`} style={{ color: it.type === 'day' ? (it.color || primaryColor) : textColor }}>{it.label}</div>
                      {it.notes && <div className="text-[10px] text-slate-400 truncate w-40">{it.notes}</div>}
                    </div>
                    <button onClick={e => {e.stopPropagation(); handleDelete(it.id);}} className="opacity-0 group-hover:opacity-100 p-2 text-rose-300 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-2">
                <button onClick={() => handleAdd('location')} className="flex-1 py-4 text-white rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all" style={{ background: primaryColor }}><Plus className="w-5 h-5" /> 장소</button>
                <button onClick={() => handleAdd('day')} className="px-5 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 active:scale-95 transition-all"><Calendar className="w-4 h-4" /> 일차</button>
              </div>
            </div>
          </div>
        </aside>

        {/* Center Canvas */}
        <section className="flex-1 relative overflow-auto custom-scrollbar flex flex-col items-center py-12 px-8 bg-slate-50/30">
          <div className="sticky top-0 mb-12 pointer-events-none z-10 w-full flex justify-center">
             <div className="bg-white/80 backdrop-blur-xl px-8 py-4 rounded-full shadow-2xl border border-white/50 flex items-center gap-8 pointer-events-auto ring-1 ring-slate-900/5">
                <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full" style={{ background: primaryColor }}></div><span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">직진 경로</span></div>
                <div className="w-px h-4 bg-slate-200" />
                <div className="flex items-center gap-3"><div className="w-4 h-4 border-[3px] border-dashed border-slate-300 rounded-full"></div><span className="text-[11px] font-black text-slate-600 uppercase tracking-tighter">유턴 구간 (매 5개 장소)</span></div>
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
              notesOffsetY={notesOffsetY}
            />
          </div>
          <div className="h-64 flex-shrink-0" />
        </section>

        {/* Right Detail Panel */}
        {selectedId && currentItem && (
          <aside className="w-[400px] flex-shrink-0 bg-white shadow-[-20px_0_50px_rgba(0,0,0,0.05)] border-l p-8 z-50 animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar h-full">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-xl font-black text-slate-800">상세 편집</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Item Customizer</p>
              </div>
              <button onClick={() => setSelectedId(null)} className="p-3 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-8">
              <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">장소 명칭</label>
                <textarea rows={2} value={currentItem.label} onChange={e => handleUpdate({ ...currentItem, label: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black focus:ring-4 ring-slate-100 outline-none text-slate-900 resize-none transition-all shadow-sm" />
              </div>

              <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest flex items-center gap-2"><FileText className="w-3.5 h-3.5" /> 비고 (추가 메모)</label>
                <textarea rows={3} value={currentItem.notes || ''} onChange={e => handleUpdate({ ...currentItem, notes: e.target.value })} placeholder="추가하고 싶은 메모를 입력하세요" className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold focus:ring-4 ring-slate-100 outline-none text-slate-700 resize-none transition-all text-xs shadow-sm" />
              </div>
              
              {currentItem.type === 'day' && (
                <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">일차 컬러 테마</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={currentItem.color || primaryColor} onChange={e => handleUpdate({ ...currentItem, color: e.target.value })} className="w-14 h-14 rounded-2xl cursor-pointer border-4 border-white shadow-lg overflow-hidden p-0" />
                    <div className="flex-1 flex gap-2 overflow-x-auto py-2 custom-scrollbar">
                      {PRESET_COLORS.map(c => <button key={c} onClick={() => handleUpdate({ ...currentItem, color: c })} className={`w-8 h-8 rounded-full flex-shrink-0 transition-all ${currentItem.color === c ? 'ring-4 ring-slate-800 scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: c }} />)}
                    </div>
                  </div>
                </div>
              )}

              {currentItem.type === 'location' && (
                <>
                  <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">방문 시각</label>
                    <div className="relative">
                      <input type="time" value={currentItem.time || ''} onChange={e => handleUpdate({ ...currentItem, time: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black outline-none text-slate-700 shadow-sm" />
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">아이콘 변경</label>
                    <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                      {Object.keys(ICON_MAP).map(k => (
                        <button key={k} onClick={() => handleUpdate({ ...currentItem, icon: k })} className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${currentItem.icon === k ? 'bg-slate-800 text-white shadow-lg scale-110' : 'bg-white text-slate-400 hover:text-slate-600 hover:shadow-sm'}`}>{React.createElement(ICON_MAP[k], { size: 18 })}</button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[35px] border border-slate-100">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">장소 이미지</label>
                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-8 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 text-slate-400 font-bold hover:border-slate-400 hover:text-slate-600 transition-all bg-white shadow-sm">
                      <Upload className="w-6 h-6" />
                      <span className="text-xs">이미지 업로드</span>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={e => {const f = e.target.files?.[0]; if(f){const r = new FileReader(); r.onloadend = () => handleUpdate({...currentItem, imageUrl: r.result as string}); r.readAsDataURL(f);}}} accept="image/*" className="hidden" />
                    {currentItem.imageUrl && (
                      <div className="mt-4 relative group rounded-[30px] overflow-hidden border-4 border-white shadow-xl">
                        <img src={currentItem.imageUrl} className="w-full h-40 object-cover" />
                        <button onClick={() => handleUpdate({...currentItem, imageUrl: undefined})} className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 text-white font-black transition-all flex items-center justify-center uppercase tracking-widest text-[10px]">Remove Photo</button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="pt-10">
                <button onClick={() => handleDelete(selectedId)} className="w-full py-5 bg-rose-50 text-rose-500 font-black rounded-3xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 group">
                  <Trash2 className="w-6 h-6 transition-transform group-hover:rotate-12" /> 항목 완전히 삭제하기
                </button>
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* Global Style Adjustments Menu */}
      <div className="fixed bottom-10 left-10 z-[60]" ref={paletteRef}>
        <div className="relative">
          <button 
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className={`w-14 h-14 bg-white rounded-2xl shadow-2xl border border-slate-200 flex items-center justify-center transition-all ${isPaletteOpen ? 'bg-slate-900 text-white border-slate-900 scale-110' : 'text-slate-400 hover:text-slate-800'}`}
          >
            <Palette className={`w-6 h-6 transition-transform ${isPaletteOpen ? 'rotate-12' : ''}`} />
          </button>
          
          {/* Style Flyout */}
          {isPaletteOpen && (
            <div className="absolute bottom-16 left-0 bg-white p-8 rounded-[35px] shadow-2xl border border-slate-100 min-w-[340px] animate-in slide-in-from-bottom duration-300">
              <div className="flex justify-between items-center mb-6">
                <h4 className="text-[12px] font-black uppercase text-slate-800 tracking-widest">글로벌 디자인 설정</h4>
                <button onClick={() => setIsPaletteOpen(false)} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:text-slate-600 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block tracking-widest">글로벌 테마 색상</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button 
                        key={c} 
                        onClick={() => { setPrimaryColor(c); setIsPaletteOpen(false); }} 
                        className={`w-6 h-6 rounded-full transition-transform hover:scale-125 ${primaryColor === c ? 'ring-2 ring-slate-800 scale-110' : ''}`} 
                        style={{ background: c }} 
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 mb-3 block tracking-widest">타이포그래피</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['pretendard', 'noto', 'gmarket', 'ibm'] as FontType[]).map(f => (
                      <button 
                        key={f} 
                        onClick={() => { setFont(f); setIsPaletteOpen(false); }} 
                        className={`py-2 px-3 rounded-xl border text-[10px] font-bold transition-all ${font === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}
                      >
                        {f.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-5 border-t border-slate-50">
                   <div className="space-y-2">
                      <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">한 줄 당 개수</label><span className="text-[10px] font-black text-slate-900">{itemsPerRow}</span></div>
                      <input type="range" min="2" max="10" value={itemsPerRow} onChange={e => setItemsPerRow(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-slate-800 cursor-pointer" />
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">폰트 크기</label><span className="text-[10px] font-black text-slate-900">{fontSize}px</span></div>
                      <input type="range" min="10" max="24" value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-slate-800 cursor-pointer" />
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">아이콘 크기</label><span className="text-[10px] font-black text-slate-900">{iconSize}px</span></div>
                      <input type="range" min="16" max="50" value={iconSize} onChange={e => setIconSize(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-slate-800 cursor-pointer" />
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">아이콘 상하 위치</label><span className="text-[10px] font-black text-slate-900">{globalIconOffsetY}</span></div>
                      <input type="range" min="-150" max="0" value={globalIconOffsetY} onChange={e => setGlobalIconOffsetY(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-slate-800 cursor-pointer" />
                   </div>

                   <div className="space-y-2">
                      <div className="flex justify-between items-center"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">비고 상하 간격</label><span className="text-[10px] font-black text-slate-900">{notesOffsetY}</span></div>
                      <input type="range" min="-30" max="50" value={notesOffsetY} onChange={e => setNotesOffsetY(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none accent-slate-800 cursor-pointer" />
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recommendations Toast */}
      {recommendations.length > 0 && (
        <div className="fixed bottom-10 right-10 z-[60] flex flex-col items-end gap-3 pointer-events-none">
          <div className="bg-amber-50 p-5 rounded-[30px] shadow-2xl border border-amber-100 w-72 pointer-events-auto animate-in slide-in-from-right duration-500">
            <h4 className="text-[10px] font-black text-amber-600 uppercase mb-4 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5" /> AI 추천 정보</h4>
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec, i) => (
                <a key={i} href={rec.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 bg-white rounded-2xl border border-amber-100 hover:shadow-md transition-all group">
                  <span className="text-[10px] font-black text-slate-700 truncate mr-2">{rec.title}</span><ExternalLink className="w-3 h-3 text-amber-400 group-hover:text-amber-600" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Root rendering with error boundary concept
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<App />);
}
