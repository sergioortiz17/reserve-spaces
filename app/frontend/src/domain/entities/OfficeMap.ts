/**
 * Domain entity: OfficeMap
 * Represents an office layout configuration in the domain layer
 */
export interface OfficeMap {
  id: string;
  name: string;
  description?: string;
  json_data: any;
  created_at: string;
  updated_at: string;
  spaces?: Space[];
}

export interface Space {
  id: string;
  map_id: string;
  name: string;
  type: SpaceType;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  created_at: string;
  updated_at: string;
  // Optional: reservations are loaded separately
  reservations?: any[];
}

export type SpaceType = 'workstation' | 'meeting_room' | 'cubicle' | 'invalid_space';

// Note: Reservation type is defined in types/index.ts to maintain compatibility with existing code
// This ensures we don't break existing imports while transitioning to Clean Architecture

