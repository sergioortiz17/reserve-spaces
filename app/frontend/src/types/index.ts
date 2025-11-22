export interface MapSpace {
  id: string;
  name: string;
  type: 'workstation' | 'meeting_room' | 'cubicle' | 'invalid_space';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OfficeMap {
  id: string;
  name: string;
  description: string;
  json_data: {
    grid: {
      width: number;
      height: number;
      cellSize: number;
    };
    spaces: MapSpace[];
  };
  created_at: string;
  updated_at: string;
  spaces?: Space[];
}

export interface Space {
  id: string;
  map_id: string;
  name: string;
  type: 'workstation' | 'meeting_room' | 'cubicle' | 'invalid_space';
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  created_at: string;
  updated_at: string;
  reservations?: Reservation[];
  _group?: Space[]; // For meeting room groups
  _isGroupSpace?: boolean; // Flag to indicate this space represents a group
}

export interface Reservation {
  id: string;
  space_id: string;
  user_id: string;
  user_name: string;
  date: string;
  start_time?: string;
  end_time?: string;
  status: 'active' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
  space?: Space;
  // Frontend-only properties for grouping meeting room reservations
  _isGroupReservation?: boolean;
  _groupReservations?: Reservation[];
  _groupName?: string;
  _groupSize?: number;
  // For import/export
  space_name?: string;
  space_type?: string;
}