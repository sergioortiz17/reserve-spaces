import { useState, useEffect } from 'react';
import { getReservations, createReservation, deleteReservation } from '../utils/api';
import type { Reservation } from '../types';

export const useReservations = (filters?: any) => {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReservations = async (newFilters?: any) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReservations(newFilters || filters);
      setReservations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch reservations');
    } finally {
      setLoading(false);
    }
  };

  const createNewReservation = async (reservationData: any) => {
    try {
      setLoading(true);
      setError(null);
      const newReservation = await createReservation(reservationData);
      setReservations(prev => [...prev, newReservation]);
      return newReservation;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelReservation = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteReservation(id);
      setReservations(prev => prev.filter(reservation => reservation.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel reservation');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, [filters]);

  return {
    reservations,
    loading,
    error,
    fetchReservations,
    createNewReservation,
    cancelReservation,
  };
};
