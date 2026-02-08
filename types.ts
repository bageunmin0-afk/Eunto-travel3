
export type IconType = 'car' | 'plane' | 'train' | 'bus' | 'walk' | 'bike' | 'hotel' | 'food' | 'camera' | 'map';

export interface RouteItem {
  id: string;
  label: string;
  notes?: string; // 비고 필드 추가
  icon: IconType;
  description?: string;
  time?: string;
  imageUrl?: string;
  type: 'location' | 'day';
  color?: string;
}

export interface Point {
  x: number;
  y: number;
}
