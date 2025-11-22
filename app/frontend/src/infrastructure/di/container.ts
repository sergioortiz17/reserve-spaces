/**
 * Dependency Injection Container for Frontend
 * Creates and manages service instances following Clean Architecture
 */
import { ReservationApiClient } from '../api/ReservationApiClient';
import { ReservationService } from '../../application/services/ReservationService';

// Create repository instances
const reservationRepository = new ReservationApiClient();

// Create service instances
export const reservationService = new ReservationService(reservationRepository);

// Export all services for easy access
export const services = {
  reservation: reservationService,
};

