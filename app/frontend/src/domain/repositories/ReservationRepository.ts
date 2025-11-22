/**
 * Repository interface for reservations
 * Defines the contract for reservation data operations
 */
import type { Reservation } from '../../types';

export interface ReservationFilters {
  from?: string;
  to?: string;
  user_id?: string;
  space_id?: string;
  status?: 'active' | 'cancelled';
}

export interface ReservationRepository {
  findAll(filters?: ReservationFilters): Promise<Reservation[]>;
  findById(id: string): Promise<Reservation>;
  create(reservation: CreateReservationInput): Promise<Reservation>;
  update(id: string, reservation: UpdateReservationInput): Promise<Reservation>;
  delete(id: string): Promise<void>;
}

export interface CreateReservationInput {
  space_id: string;
  user_id: string;
  user_name?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
}

export interface UpdateReservationInput {
  user_name?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  status?: 'active' | 'cancelled';
  notes?: string;
}

