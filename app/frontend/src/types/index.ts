export interface MapSpace {
  id: string;
  name: string;
  type: 'workstation' | 'meeting_room' | 'cubicle';
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
  type: 'workstation' | 'meeting_room' | 'cubicle';
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  created_at: string;
  updated_at: string;
  reservations?: Reservation[];
}

export interface Reservation {
  id: string;
  space_id: string;
  user_id: string;
  user_name?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  status: 'active' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
  space?: Space;
}