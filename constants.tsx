
import React from 'react';
import { 
  Car, Plane, Train, Bus, MapPin, 
  Bed, Utensils, Camera, Map, Footprints, Bike,
  LucideIcon 
} from 'lucide-react';
import { IconType } from './types';

export const ITEMS_PER_ROW = 5;
export const NODE_SPACING_X = 180;
export const NODE_SPACING_Y = 140;
export const MARGIN = 80;

export const ICON_MAP: Record<IconType, LucideIcon> = {
  car: Car,
  plane: Plane,
  train: Train,
  bus: Bus,
  walk: Footprints,
  bike: Bike,
  hotel: Bed,
  food: Utensils,
  camera: Camera,
  map: Map,
};

export const DEFAULT_ROUTE: any[] = [
  { id: '1', label: '출발지', icon: 'car' },
  { id: '2', label: '경로입력', icon: 'map' },
  { id: '3', label: '점심식사', icon: 'food' },
  { id: '4', label: '카페방문', icon: 'camera' },
  { id: '5', label: '중간경유', icon: 'map' },
  { id: '6', label: '숙소체크인', icon: 'hotel' },
  { id: '7', label: '저녁식사', icon: 'food' },
  { id: '8', label: '야경구경', icon: 'camera' },
  { id: '9', label: '도착지', icon: 'map' },
];
