/**
 * Custom hook for reservation grouping logic
 * Handles grouping of meeting room reservations and individual space reservations
 */
import { useMemo } from 'react';
import type { Reservation, Space } from '../../types';

export const useReservationGrouping = (
  reservations: Reservation[],
  spaces: Space[],
  selectedDate: string
) => {
  // Filter reservations for selected date
  const todayReservations = useMemo(() => {
    const normalizeDate = (d: string) => d.split('T')[0];
    const filtered = reservations.filter(r => {
      const d = normalizeDate(r.date);
      return d === selectedDate && r.status === 'active';
    });

    // Create a map of meeting room base names to parent space IDs
    const meetingRoomParents: Record<string, string> = {};
    spaces.forEach(space => {
      if (space.type === 'meeting_room') {
        const base = space.name.replace(/\s*\d+$/, '').trim().toLowerCase();
        if (!meetingRoomParents[base]) {
          meetingRoomParents[base] = space.id;
        }
      }
    });

    // Remap reservations to parent space
    const remapped = filtered.map(res => {
      const sp = spaces.find(s => s.id === res.space_id);
      if (!sp) return res;

      if (sp.type === 'meeting_room') {
        const base = sp.name.replace(/\s*\d+$/, '').trim().toLowerCase();
        const parent = meetingRoomParents[base];
        return { ...res, space_id: parent };
      }

      return res;
    });

    // Group by parent space_id + user + time
    const grouped = new Map<string, { reservation: Reservation; originals: Reservation[] }>();

    filtered.forEach(originalRes => {
      const remappedRes = remapped.find(r => r.id === originalRes.id);
      if (!remappedRes) return;

      const key = `${remappedRes.space_id}-${remappedRes.user_name}-${remappedRes.start_time}-${remappedRes.end_time}`;

      if (!grouped.has(key)) {
        grouped.set(key, { reservation: remappedRes, originals: [] });
      }

      grouped.get(key)!.originals.push(originalRes);
    });

    // Apply display information
    const finalList = Array.from(grouped.values()).map(({ reservation, originals }) => {
      const space = spaces.find(s => s.id === reservation.space_id);

      if (space?.type === 'meeting_room') {
        const baseName = space.name.replace(/\s*\d+$/, '').trim();

        return {
          ...reservation,
          _isGroupReservation: true,
          _groupName: baseName,
          _groupSize: spaces.filter(s =>
            s.type === 'meeting_room' &&
            s.name.replace(/\s*\d+$/, '').trim().toLowerCase() === baseName.toLowerCase()
          ).length,
          _groupReservations: originals,
        };
      }

      return reservation;
    });

    return finalList;
  }, [reservations, selectedDate, spaces]);

  // Group meeting room reservations by group name
  const meetingRoomGroupsByName = useMemo(() => {
    const grouped = new Map<string, {
      groupName: string;
      groupSize: number;
      reservations: Reservation[];
      spaceIds: string[];
    }>();

    todayReservations.filter(r => r._isGroupReservation).forEach(reservation => {
      const groupName = reservation._groupName || 'Meeting Room Group';
      const key = groupName;

      if (!grouped.has(key)) {
        const spaceIds = new Set<string>();
        if (reservation._groupReservations) {
          reservation._groupReservations.forEach((gr: Reservation) => spaceIds.add(gr.space_id));
        } else {
          spaceIds.add(reservation.space_id);
        }

        grouped.set(key, {
          groupName,
          groupSize: reservation._groupSize || 1,
          reservations: [],
          spaceIds: Array.from(spaceIds),
        });
      }

      grouped.get(key)!.reservations.push(reservation);
    });

    return Array.from(grouped.values());
  }, [todayReservations]);

  // Group individual space reservations by space_id
  const reservationsBySpace = useMemo(() => {
    const normalizeDate = (d: string) => d.split('T')[0];
    const filtered = reservations.filter(r => {
      const d = normalizeDate(r.date);
      return d === selectedDate && r.status === 'active';
    });

    const grouped = new Map<string, { space: Space | null; reservations: Reservation[] }>();

    filtered.forEach(reservation => {
      const space = spaces.find(s => s.id === reservation.space_id);
      if (!space) return;

      // Skip meeting room groups (already handled)
      if (space.type === 'meeting_room') {
        const isPartOfGroup = todayReservations.some(tr =>
          tr._isGroupReservation &&
          tr._groupReservations?.some((gr: Reservation) => gr.id === reservation.id)
        );
        if (isPartOfGroup) return;
      }

      if (!grouped.has(reservation.space_id)) {
        grouped.set(reservation.space_id, { space, reservations: [] });
      }

      grouped.get(reservation.space_id)!.reservations.push(reservation);
    });

    return Array.from(grouped.values());
  }, [reservations, selectedDate, spaces, todayReservations]);

  return {
    todayReservations,
    meetingRoomGroupsByName,
    reservationsBySpace,
  };
};

