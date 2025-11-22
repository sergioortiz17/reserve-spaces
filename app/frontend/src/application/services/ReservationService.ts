/**
 * Application layer: Reservation service
 * Contains business logic for reservations
 */
import type { Reservation } from '../../domain/entities/OfficeMap';
import type { ReservationRepository, ReservationFilters } from '../../domain/repositories/ReservationRepository';

export class ReservationService {
  constructor(private repository: ReservationRepository) {}

  /**
   * Get all reservations with optional filters
   */
  async getReservations(filters?: ReservationFilters): Promise<Reservation[]> {
    return this.repository.findAll(filters);
  }

  /**
   * Get a single reservation by ID
   */
  async getReservation(id: string): Promise<Reservation> {
    return this.repository.findById(id);
  }

  /**
   * Create a new reservation
   */
  async createReservation(input: {
    space_id: string;
    user_id: string;
    user_name?: string;
    date: string;
    start_time?: string;
    end_time?: string;
    notes?: string;
  }): Promise<Reservation> {
    // Business logic: Validate time range
    if (input.start_time && input.end_time) {
      const start = this.parseTime(input.start_time);
      const end = this.parseTime(input.end_time);
      if (start >= end) {
        throw new Error('Start time must be before end time');
      }
    }

    return this.repository.create(input);
  }

  /**
   * Update an existing reservation
   */
  async updateReservation(
    id: string,
    input: {
      user_name?: string;
      date?: string;
      start_time?: string;
      end_time?: string;
      status?: 'active' | 'cancelled';
      notes?: string;
    }
  ): Promise<Reservation> {
    // Business logic: Validate time range if both times are provided
    if (input.start_time && input.end_time) {
      const start = this.parseTime(input.start_time);
      const end = this.parseTime(input.end_time);
      if (start >= end) {
        throw new Error('Start time must be before end time');
      }
    }

    return this.repository.update(id, input);
  }

  /**
   * Delete (cancel) a reservation
   */
  async deleteReservation(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  /**
   * Get reservations for a specific date
   */
  async getReservationsByDate(date: string): Promise<Reservation[]> {
    return this.repository.findAll({ from: date, to: date });
  }

  /**
   * Get reservations for a specific space
   */
  async getReservationsBySpace(spaceId: string): Promise<Reservation[]> {
    return this.repository.findAll({ space_id: spaceId });
  }

  /**
   * Helper: Parse time string to minutes since midnight
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

