/**
 * Infrastructure layer: API client for reservations
 * Implements the ReservationRepository interface using HTTP
 */
import axios from 'axios';
import type { Reservation } from '../../types';
import type {
  ReservationRepository,
  ReservationFilters,
  CreateReservationInput,
  UpdateReservationInput,
} from '../../domain/repositories/ReservationRepository';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export class ReservationApiClient implements ReservationRepository {
  async findAll(filters?: ReservationFilters): Promise<Reservation[]> {
    const params = filters ? {
      from: filters.from,
      to: filters.to,
      user_id: filters.user_id,
      space_id: filters.space_id,
    } : {};
    
    const response = await api.get<Reservation[]>('/reservations', { params });
    return response.data;
  }

  async findById(id: string): Promise<Reservation> {
    const response = await api.get<Reservation>(`/reservations/${id}`);
    return response.data;
  }

  async create(input: CreateReservationInput): Promise<Reservation> {
    const response = await api.post<Reservation>('/reservations', input);
    return response.data;
  }

  async update(id: string, input: UpdateReservationInput): Promise<Reservation> {
    const response = await api.put<Reservation>(`/reservations/${id}`, input);
    return response.data;
  }

  async delete(id: string): Promise<void> {
    await api.delete(`/reservations/${id}`);
  }
}

