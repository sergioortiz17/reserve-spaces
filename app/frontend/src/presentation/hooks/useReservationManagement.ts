/**
 * Custom hook for reservation management logic
 * Separates business logic from UI components
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { services } from '../../infrastructure/di/container';

export const useReservationManagement = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const createReservation = async (data: {
    space_id: string;
    user_id: string;
    user_name?: string;
    date: string;
    start_time?: string;
    end_time?: string;
    notes?: string;
  }) => {
    setLoading(true);
    try {
      const reservation = await services.reservation.createReservation(data);
      toast.success(t('reservations.reservationCreated'));
      return reservation;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || t('reservations.failedToCreate');
      toast.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateReservation = async (id: string, data: {
    user_name?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    status?: 'active' | 'cancelled';
    notes?: string;
  }) => {
    setLoading(true);
    try {
      const reservation = await services.reservation.updateReservation(id, data);
      toast.success(t('reservations.reservationUpdated'));
      return reservation;
    } catch (error: any) {
      if (error.response?.data?.error === 'Cannot update cancelled reservation') {
        toast.error(t('reservations.cannotUpdateCancelled'));
      } else {
        toast.error(t('reservations.failedToUpdate'));
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteReservation = async (id: string) => {
    setLoading(true);
    try {
      await services.reservation.deleteReservation(id);
      toast.success(t('reservations.reservationDeleted'));
    } catch (error: any) {
      toast.error(t('reservations.failedToDelete'));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    createReservation,
    updateReservation,
    deleteReservation,
    loading,
  };
};

