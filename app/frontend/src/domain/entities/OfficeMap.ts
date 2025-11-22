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
  reservations?: Reservation[];
}

export type SpaceType = 'workstation' | 'meeting_room' | 'cubicle' | 'invalid_space';

export interface Reservation {
  id: string;
  space_id: string;
  user_id: string;
  user_name: string;
  date: string;
  start_time?: string;
  end_time?: string;
  status: ReservationStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
  space?: Space;
  // Frontend-specific properties for grouping
  _isGroupReservation?: boolean;
  _groupName?: string;
  _groupSize?: number;
  _groupReservations?: Reservation[];
  space_name?: string;
  space_type?: string;
}

export type ReservationStatus = 'active' | 'cancelled';

