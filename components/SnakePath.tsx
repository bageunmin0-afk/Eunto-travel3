
import React, { useMemo } from 'react';
import { RouteItem, Point } from '../types';
import { ITEMS_PER_ROW, NODE_SPACING_X, NODE_SPACING_Y, MARGIN, ICON_MAP } from '../constants';

interface SnakePathProps {
  items: RouteItem[];
  onItemClick: (id: string) => void;
  activeId?: string;
}

const SnakePath: React.FC<SnakePathProps> = ({ items, onItemClick, activeId }) => {
  const points = useMemo(() => {
    return items.map((_, index) => {
      const row = Math.floor(index / ITEMS_PER_ROW);
      const isReversed = row % 2 !== 0;
      const colInRow = index % ITEMS_PER_ROW;
      
      const col = isReversed ? (ITEMS_PER_ROW - 1 - colInRow) : colInRow;
      
      return {
        x: MARGIN + col * NODE_SPACING_X,
        y: MARGIN + row * NODE_SPACING_Y
      };
    });
  }, [items]);

  const svgWidth = MARGIN * 2 + (ITEMS_PER_ROW - 1) * NODE_SPACING_X;
  const svgHeight = MARGIN * 2 + Math.floor((items.length - 1) / ITEMS_PER_ROW) * NODE_SPACING_Y;

  return (
    <div className="relative overflow-auto p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
      <svg width={svgWidth} height={svgHeight} className="overflow-visible">
        {/* Connection Lines */}
        {points.map((point, i) => {
          if (i === points.length - 1) return null;
          const next = points[i + 1];
          const isEndOfRow = (i + 1) % ITEMS_PER_ROW === 0;
          
          if (isEndOfRow) {
            return (
              <path
                key={`line-${i}`}
                d={`M ${point.x} ${point.y} C ${point.x + 40} ${point.y}, ${next.x + 40} ${next.y}, ${next.x} ${next.y}`}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            );
          }
          
          return (
            <line
              key={`line-${i}`}
              x1={point.x}
              y1={point.y}
              x2={next.x}
              y2={next.y}
              stroke="#cbd5e1"
              strokeWidth="2"
            />
          );
        })}

        {/* Nodes */}
        {items.map((item, i) => {
          const point = points[i];
          const Icon = ICON_MAP[item.icon as any] || ICON_MAP.map;
          const isActive = activeId === item.id;

          return (
            <g 
              key={item.id} 
              className="cursor-pointer group"
              onClick={() => onItemClick(item.id)}
            >
              <circle
                cx={point.x}
                cy={point.y}
                r="8"
                fill="white"
                stroke="#10b981"
                strokeWidth={isActive ? "4" : "2"}
                className="transition-all duration-200"
              />
              
              <foreignObject
                x={point.x - 24}
                y={point.y - 70}
                width="48"
                height="48"
              >
                <div className={`flex items-center justify-center w-full h-full rounded-full transition-all duration-200 shadow-md border-2 ${
                  isActive ? 'bg-emerald-500 border-emerald-400 scale-110' : 'bg-white border-slate-100 group-hover:scale-105'
                }`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                </div>
              </foreignObject>

              <text
                x={point.x}
                y={point.y + 28}
                textAnchor="middle"
                className={`text-xs font-medium fill-slate-700 select-none ${isActive ? 'font-bold fill-emerald-600' : ''}`}
              >
                {item.label}
              </text>
              
              {item.notes && (
                <text
                  x={point.x}
                  y={point.y + 42}
                  textAnchor="middle"
                  className="text-[10px] font-normal fill-slate-400 select-none"
                >
                  {item.notes}
                </text>
              )}

              <circle
                cx={point.x}
                cy={point.y}
                r="40"
                fill="transparent"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SnakePath;
