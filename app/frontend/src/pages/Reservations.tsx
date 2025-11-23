import React, { useState, useMemo } from 'react';
import { Calendar, MapPin, X, Info, Clock, User, ChevronLeft, ChevronRight, Edit, Trash2, Download, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOfficeMap } from '../hooks/useOfficeMap';
import { useReservations } from '../hooks/useReservations';
import { createReservation, updateReservation, deleteReservation } from '../utils/api';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import type { Space } from '../types';
import HexagonGrid from '../components/HexagonGrid';
import { 
  findMeetingRoomGroup, 
  getMeetingRoomGroupName, 
  getTotalSpaceCount,
  getReservedSpaceCount,
  getAvailableSpaceCount
} from '../utils/hexagonUtils';

const Reservations: React.FC = () => {
  const { t } = useTranslation();
  const { maps, currentMap, setCurrentMap, fetchMap } = useOfficeMap();
  const { reservations, fetchReservations, loading: reservationsLoading } = useReservations();
  
  console.log('Reservations - maps count:', maps.length, 'currentMap:', currentMap?.name);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [loading, setLoading] = useState(false);
  const [showSpaceInfo, setShowSpaceInfo] = useState(false);
  const [selectedSpaceInfo, setSelectedSpaceInfo] = useState<{space: Space | null, reservations: any[]}>({space: null, reservations: []});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [hoveredReservationKey, setHoveredReservationKey] = useState<string | null>(null);
  const [showReservationsPanel, setShowReservationsPanel] = useState(false);
  const [selectedSpaceReservations, setSelectedSpaceReservations] = useState<{space: Space | null, reservations: any[]}>({space: null, reservations: []});

  // Use real spaces from database, not json_data
  const spaces: Space[] = currentMap?.spaces || [];

  const handleMapChange = (mapId: string) => {
    const selectedMap = maps.find(map => map.id === mapId);
    if (selectedMap) {
      setCurrentMap(selectedMap);
      // Refresh reservations when changing maps
      fetchReservations();
    }
  };

  const handlePreviousDay = () => {
    // Parse the date string correctly to avoid timezone issues
    const [year, month, day] = selectedDate.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day); // month is 0-indexed
    const previousDay = addDays(currentDate, -1);
    setSelectedDate(format(previousDay, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    // Parse the date string correctly to avoid timezone issues
    const [year, month, day] = selectedDate.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day); // month is 0-indexed
    const nextDay = addDays(currentDate, 1);
    setSelectedDate(format(nextDay, 'yyyy-MM-dd'));
  };

  const handleToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const formatSelectedDate = () => {
    // Parse the date string correctly to avoid timezone issues
    const [year, month, day] = selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    return format(date, 'EEEE, MMMM d, yyyy');
  };

  const handleSpaceClick = (space: Space) => {
    setSelectedSpace(space);
    setShowReservationModal(true);
  };

  const handleCreateReservation = async () => {
    if (!selectedSpace || !userName.trim()) {
      toast.error(t('reservations.fillAllFields'));
      return;
    }

    try {
      setLoading(true);
      
      // For meeting room groups, always use the parent space_id (first space in group)
      // This ensures only ONE reservation is created for the entire meeting room
      let spaceIdToReserve = selectedSpace.id;
      
      // Check if this is a meeting room group in multiple ways
      if (selectedSpace.type === 'meeting_room') {
        // If it has _isGroupSpace flag and _group, use the parent
        if (selectedSpace._isGroupSpace && selectedSpace._group && selectedSpace._group.length > 0) {
          spaceIdToReserve = selectedSpace._group[0].id;
        } else {
          // Otherwise, find the group dynamically
          const group = findMeetingRoomGroup(spaces, selectedSpace);
          if (group.length > 1) {
            // This is part of a group, use the first space as parent
            spaceIdToReserve = group[0].id;
          }
        }
      }
      
      // Create a SINGLE reservation using the parent space_id
      await createReservation({
        space_id: spaceIdToReserve,
        user_id: userName.trim(),
        user_name: userName.trim(),
        date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        status: 'active'
      });
      
      toast.success(t('reservations.reservationCreated'));

      setShowReservationModal(false);
      setSelectedSpace(null);
      setUserName('');
      // Refresh both reservations and map data
      await Promise.all([
        fetchReservations(),
        currentMap ? fetchMap(currentMap.id) : Promise.resolve()
      ]);
    } catch (error) {
      toast.error(t('reservations.failedToCreate'));
    } finally {
      setLoading(false);
    }
  };

  const handleEditReservation = (reservation: any) => {
    setEditingReservation(reservation);
    setEditUserName(reservation.user_name);
    // Convert time format from "HH:MM:SS" to "HH:MM" for HTML time input
    setEditStartTime(reservation.start_time ? reservation.start_time.substring(0, 5) : '');
    setEditEndTime(reservation.end_time ? reservation.end_time.substring(0, 5) : '');
    setShowEditModal(true);
  };

  const handleUpdateReservation = async () => {
    if (!editingReservation) return;

    // Validate required fields
    if (!editUserName.trim() || !editStartTime || !editEndTime) {
      toast.error(t('reservations.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      if (editingReservation._isGroupReservation && editingReservation._groupReservations) {
        // For group reservations, cancel all existing and create a new one
        // First, cancel all existing reservations
        await Promise.all(editingReservation._groupReservations.map((gr: any) => 
          deleteReservation(gr.id)
        ));
        
        // Then create a new reservation with updated data
        const space = spaces.find(s => s.id === editingReservation.space_id);
        if (space) {
          await createReservation({
            space_id: editingReservation.space_id,
            user_id: editUserName.trim(),
            user_name: editUserName.trim(),
            date: editingReservation.date.split('T')[0],
            start_time: editStartTime,
            end_time: editEndTime,
            status: 'active'
          });
        }
        
        toast.success(t('reservations.reservationUpdated'));
      } else {
        // Single reservation update
        await updateReservation(editingReservation.id, {
          user_name: editUserName.trim(),
          start_time: editStartTime,
          end_time: editEndTime,
        });
        
        toast.success(t('reservations.reservationUpdated'));
      }
      
      setShowEditModal(false);
      setEditingReservation(null);
      
      // Refresh reservations
      await fetchReservations();
    } catch (error: any) {
      // Check if it's a specific error message from the backend
      if (error.response?.data?.error === 'Cannot update cancelled reservation') {
        toast.error(t('reservations.cannotUpdateCancelled'));
      } else {
        toast.error(t('reservations.failedToUpdate'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReservation = async (reservation: any) => {
    if (!confirm(t('reservations.confirmDelete'))) return;

    setLoading(true);
    try {
      if (reservation._isGroupReservation) {
        let reservationsToDelete: any[] = [];
        
        if (reservation._groupReservations && reservation._groupReservations.length > 0) {
          // Use stored group reservations
          reservationsToDelete = reservation._groupReservations;
        } else {
          // Fallback: find all reservations for the same meeting room group with same user/time
          const space = spaces.find(s => s.id === reservation.space_id);
          if (space?.type === 'meeting_room') {
            const baseName = space.name.replace(/\s*\d+$/, "").trim().toLowerCase();
            const groupSpaces = spaces.filter(s =>
              s.type === "meeting_room" &&
              s.name.replace(/\s*\d+$/, "").trim().toLowerCase() === baseName
            );
            const groupSpaceIds = groupSpaces.map(s => s.id);
            
            // Find all reservations for these spaces with same user/time
            reservationsToDelete = reservations.filter(r => {
              const reservationDate = r.date.split('T')[0];
              return groupSpaceIds.includes(r.space_id) &&
                     reservationDate === selectedDate &&
                     r.status === 'active' &&
                     r.user_name === reservation.user_name &&
                     r.start_time === reservation.start_time &&
                     r.end_time === reservation.end_time;
            });
          }
        }
        
        if (reservationsToDelete.length > 0) {
          // Delete all individual reservations
          await Promise.all(reservationsToDelete.map((gr: any) => deleteReservation(gr.id)));
          toast.success(`${t('reservations.reservationDeleted')} (${reservationsToDelete.length} spaces)`);
        } else {
          // Fallback to single deletion
          await deleteReservation(reservation.id);
          toast.success(t('reservations.reservationDeleted'));
        }
      } else {
        // Single reservation
        await deleteReservation(reservation.id);
        toast.success(t('reservations.reservationDeleted'));
      }
      
      // Refresh reservations
      await fetchReservations();
    } catch (error) {
      toast.error(t('reservations.failedToDelete'));
    } finally {
      setLoading(false);
    }
  };

  const isSpaceReserved = (spaceId: string) => {
    return reservations.some(reservation => {
      // Convert ISO date to YYYY-MM-DD format for comparison
      const reservationDate = reservation.date.split('T')[0];
      return reservation.space_id === spaceId && 
             reservationDate === selectedDate &&
             reservation.status === 'active';
    });
  };

  const isSpaceOrGroupReserved = (space: any) => {
    // For meeting room groups represented as a single space, check the parent space_id
    if (space._isGroupSpace && space._group) {
      return isSpaceReserved(space._group[0].id);
    }
    
    // For individual meeting room hexagons, find the group and check the parent space_id
    if (space.type === 'meeting_room') {
      const group = findMeetingRoomGroup(spaces, space);
      if (group.length > 1) {
        // This is part of a group, check if the parent (first space) is reserved
        return isSpaceReserved(group[0].id);
      } else {
        // Single meeting room, check normally
        return isSpaceReserved(space.id);
      }
    }
    return isSpaceReserved(space.id);
  };

  const getSpaceReservations = (spaceId: string) => {
    return reservations.filter(reservation => {
      const reservationDate = reservation.date.split('T')[0];
      return reservation.space_id === spaceId && 
             reservationDate === selectedDate &&
             reservation.status === 'active';
    });
  };

  const handleSpaceInfoClick = (space: Space | null) => {
    if (!space) {
      setSelectedSpaceInfo({space: null, reservations: []});
      setShowSpaceInfo(true);
      return;
    }

    // For meeting room groups, use the parent space_id (first space in group)
    // to get reservations, since we only create one reservation per group
    const spaceIdForReservations = space._isGroupSpace && space._group 
      ? space._group[0].id  // Use parent space_id for groups
      : space.id;           // Use the space's own ID for regular spaces
    
    const spaceReservations = getSpaceReservations(spaceIdForReservations);
    setSelectedSpaceInfo({space, reservations: spaceReservations});
    setShowSpaceInfo(true);
  };

  const getHexColor = (_x: number, _y: number, space?: any, isReserved?: boolean) => {
    if (!space) return '#f9fafb'; // Empty space - light gray
    
    // Invalid spaces are never reservable and appear as dark blocks
    if (space.type === 'invalid_space') return '#374151'; // Dark gray - matches dark mode
    
    // For meeting rooms, check if the entire group is reserved
    if (space.type === 'meeting_room') {
      const groupReserved = isSpaceOrGroupReserved(space);
      if (groupReserved) return '#ef4444'; // Reserved - red
    } else if (isReserved) {
      return '#ef4444'; // Reserved - red
    }
    
    // Space colors by type
    switch (space.type) {
      case 'workstation': return '#3b82f6'; // Blue
      case 'meeting_room': return '#10b981'; // Green
      case 'cubicle': return '#8b5cf6'; // Purple
      default: return '#6b7280'; // Gray
    }
  };

  const getHexTitle = (_x: number, _y: number, space?: any, isReserved?: boolean) => {
    if (!space) return t('reservations.emptySpace');
    if (space.type === 'invalid_space') return t('reservations.invalidSpaceDesc');
    return `${space.name} ${isReserved ? `(${t('reservations.reserved')})` : `(${t('reservations.available')})`} - ${t('reservations.clickForDetails')}`;
  };

  const handleHexClick = (_x: number, _y: number, space?: any) => {
    if (space && space.type !== 'invalid_space') {
      if (space.type === 'meeting_room') {
        // For meeting rooms, find the group and create a virtual space representing the whole group
        const group = findMeetingRoomGroup(spaces, space);
        
        // Create a virtual space that represents the entire meeting room group
        // Use the first space in the group as the representative (parent space)
        const parentSpace: Space = {
          ...group[0], // Use first space as parent
          name: getMeetingRoomGroupName(group),
          _group: group, // Store the group for reference
          _isGroupSpace: true // Flag to indicate this represents a group
        };
        
        // Open the info panel instead of creating reservations directly
        handleSpaceInfoClick(parentSpace);
      } else {
        // For other space types, open info panel
        handleSpaceInfoClick(space);
      }
    }
  };

  const handleHexDoubleClick = (_x: number, _y: number, space?: any) => {
    handleSpaceInfoClick(space || null);
  };

  const handleHexRightClick = (e: React.MouseEvent, _x: number, _y: number, space?: any) => {
    e.preventDefault();
    handleSpaceInfoClick(space || null);
  };

  const renderOfficeMap = () => {
    if (!currentMap) {
      return (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{t('reservations.noMapSelected')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('reservations.pleaseSelectMap')}
          </p>
        </div>
      );
    }

    const gridWidth = currentMap.json_data.grid?.width || 20;
    const gridHeight = currentMap.json_data.grid?.height || 15;

    return (
      <div className="flex justify-center">
        <HexagonGrid
          width={gridWidth}
          height={gridHeight}
          hexSize={20}
          spaces={spaces}
          reservations={reservations}
          selectedDate={selectedDate}
          onHexClick={handleHexClick}
          onHexDoubleClick={handleHexDoubleClick}
          onHexRightClick={handleHexRightClick}
          getHexColor={getHexColor}
          getHexTitle={getHexTitle}
          selectedHexagons={highlightedHexagons}
        />
      </div>
    );
  };

  // Group Meeting Room reservations to show as single logical units in history
// =============================================
// FIX REAL: SOLO UNA RESERVA POR MEETING ROOM
// =============================================
// =============================================
// FIX DEFINITIVO: UNA SOLA FILA POR MEETING ROOM
// =============================================
// =============================================================
// GROUP BY PREFIX — ALL meeting rooms become one logical space
// =============================================================
const todayReservations = useMemo(() => {
  const normalizeDate = (d: string) => d.split("T")[0];

  // 1. Filter reservations for selected date
  const filtered = reservations.filter(r => {
    const d = normalizeDate(r.date);
    return d === selectedDate && r.status === "active";
  });

  // 2. Build prefix-based parent space map
  const meetingRoomParents: Record<string, string> = {};

  spaces.forEach(space => {
    if (space.type === "meeting_room") {
      // Remove trailing numbers → "meeting room 38" → "meeting room"
      const base = space.name.replace(/\s*\d+$/, "").trim().toLowerCase();

      // First encountered becomes parent
      if (!meetingRoomParents[base]) {
        meetingRoomParents[base] = space.id;
      }
    }
  });

  // 3. Normalize reservations → remap to parent space
  const remapped = filtered.map(res => {
    const sp = spaces.find(s => s.id === res.space_id);
    if (!sp) return res;

    if (sp.type === "meeting_room") {
      const base = sp.name.replace(/\s*\d+$/, "").trim().toLowerCase();
      const parent = meetingRoomParents[base];
      return { ...res, space_id: parent };
    }

    return res;
  });

  // 4. Group by parent space_id + user + time, keeping all original reservations
  const grouped = new Map<string, { reservation: any, originals: any[] }>();

  filtered.forEach(originalRes => {
    const remappedRes = remapped.find(r => r.id === originalRes.id);
    if (!remappedRes) return;

    const key = `${remappedRes.space_id}-${remappedRes.user_name}-${remappedRes.start_time}-${remappedRes.end_time}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, { reservation: remappedRes, originals: [] });
    }
    
    // Always add the original reservation to the list
    grouped.get(key)!.originals.push(originalRes);
  });

  // 5. Apply display information (group name) and include all original reservations
  const finalList = Array.from(grouped.values()).map(({ reservation, originals }) => {
    const space = spaces.find(s => s.id === reservation.space_id);

    if (space?.type === "meeting_room") {
      const baseName = space.name.replace(/\s*\d+$/, "").trim();

      return {
        ...reservation,
        _isGroupReservation: true,
        _groupName: baseName,
        _groupSize: spaces.filter(s =>
          s.type === "meeting_room" &&
          s.name.replace(/\s*\d+$/, "").trim().toLowerCase() ===
          baseName.toLowerCase()
        ).length,
        _groupReservations: originals // Store all original reservations for deletion
      };
    }

    return reservation;
  });

  return finalList;
}, [reservations, selectedDate, spaces]);

  // Group meeting room reservations by group name only (all reservations for the same meeting group in one row)
  const meetingRoomGroupsByName = useMemo(() => {
    const grouped = new Map<string, {groupName: string, groupSize: number, reservations: any[], spaceIds: string[]}>();
    
    todayReservations.filter(r => r._isGroupReservation).forEach(reservation => {
      const groupName = reservation._groupName || 'Meeting Room Group';
      // Group only by group name, not by user, so all reservations for the same meeting group appear in one row
      const key = groupName;
      
      if (!grouped.has(key)) {
        // Get all space IDs from the group
        const spaceIds = new Set<string>();
        if (reservation._groupReservations) {
          reservation._groupReservations.forEach((gr: any) => spaceIds.add(gr.space_id));
        } else {
          spaceIds.add(reservation.space_id);
        }
        
        grouped.set(key, {
          groupName,
          groupSize: reservation._groupSize || 1,
          reservations: [],
          spaceIds: Array.from(spaceIds)
        });
      }
      
      grouped.get(key)!.reservations.push(reservation);
    });
    
    return Array.from(grouped.values());
  }, [todayReservations]);

  // Group reservations by space_id for display (excluding meeting room groups which are already grouped)
  const reservationsBySpace = useMemo(() => {
    const normalizeDate = (d: string) => d.split("T")[0];
    const filtered = reservations.filter(r => {
      const d = normalizeDate(r.date);
      return d === selectedDate && r.status === "active";
    });

    const grouped = new Map<string, {space: Space | null, reservations: any[]}>();
    
    filtered.forEach(reservation => {
      // Skip grouped reservations (they are already handled separately)
      const space = spaces.find(s => s.id === reservation.space_id);
      if (!space) return;
      
      // Skip meeting room groups (they are already grouped)
      if (space.type === 'meeting_room') {
        // Check if this is part of a group by looking at the grouped reservations
        const isPartOfGroup = todayReservations.some(tr => 
          tr._isGroupReservation && 
          tr._groupReservations?.some((gr: any) => gr.id === reservation.id)
        );
        if (isPartOfGroup) return; // Skip, already in grouped view
      }
      
      const key = reservation.space_id;
      if (!grouped.has(key)) {
        grouped.set(key, {space, reservations: []});
      }
      grouped.get(key)!.reservations.push(reservation);
    });
    
    return Array.from(grouped.values());
  }, [reservations, selectedDate, spaces, todayReservations]);

  // Calculate correct space counts (meeting room groups count as 1)
  const totalLogicalSpaces = getTotalSpaceCount(spaces);
  const reservedLogicalSpaces = getReservedSpaceCount(spaces, reservations, selectedDate);
  const availableLogicalSpaces = getAvailableSpaceCount(spaces, reservations, selectedDate);

  // Calculate hexagons to highlight based on hovered reservation
  const highlightedHexagons = useMemo(() => {
    if (!hoveredReservationKey) return new Set<string>();
    
    const hexSet = new Set<string>();
    
    // Check if it's a space group (for individual spaces with multiple reservations)
    if (hoveredReservationKey.startsWith('space-')) {
      const spaceId = hoveredReservationKey.replace('space-', '');
      const space = spaces.find(s => s.id === spaceId);
      if (space) {
        for (let row = space.y; row < space.y + space.height; row++) {
          for (let col = space.x; col < space.x + space.width; col++) {
            hexSet.add(`${col}-${row}`);
          }
        }
      }
      return hexSet;
    }
    
    // Check if it's a meeting room group
    if (hoveredReservationKey.startsWith('meeting-group-')) {
      const groupName = hoveredReservationKey.replace('meeting-group-', '');
      const group = meetingRoomGroupsByName.find(g => g.groupName === groupName);
      if (group) {
        group.spaceIds.forEach(spaceId => {
          const space = spaces.find(s => s.id === spaceId);
          if (space) {
            for (let row = space.y; row < space.y + space.height; row++) {
              for (let col = space.x; col < space.x + space.width; col++) {
                hexSet.add(`${col}-${row}`);
              }
            }
          }
        });
      }
      return hexSet;
    }
    
    // Find the reservation by key
    const reservation = todayReservations.find((r, idx) => {
      const uniqueKey = r._isGroupReservation 
        ? `group-${r.user_name}-${r.date}-${r.start_time}-${idx}`
        : r.id;
      return uniqueKey === hoveredReservationKey;
    });
    
    if (!reservation) return new Set<string>();
    
    // If it's a grouped reservation, highlight all spaces in the group
    if (reservation._isGroupReservation && reservation._groupReservations) {
      // Get all space IDs from the group reservations
      const spaceIds = new Set(reservation._groupReservations.map((r: any) => r.space_id));
      
      // Find all spaces with those IDs and add their hexagons
      spaces.forEach(space => {
        if (spaceIds.has(space.id)) {
          for (let row = space.y; row < space.y + space.height; row++) {
            for (let col = space.x; col < space.x + space.width; col++) {
              hexSet.add(`${col}-${row}`);
            }
          }
        }
      });
    } else {
      // Single reservation - highlight the space's hexagons
      const space = spaces.find(s => s.id === reservation.space_id);
      if (space) {
        for (let row = space.y; row < space.y + space.height; row++) {
          for (let col = space.x; col < space.x + space.width; col++) {
            hexSet.add(`${col}-${row}`);
          }
        }
      }
    }
    
    return hexSet;
  }, [hoveredReservationKey, todayReservations, spaces, meetingRoomGroupsByName]);

  // Helper function to get all individual reservations for the selected day
  const getAllDayReservations = () => {
    const normalizeDate = (d: string) => d.split("T")[0];
    return reservations.filter(r => {
      const d = normalizeDate(r.date);
      return d === selectedDate && r.status === "active";
    });
  };

  // Helper function to normalize time format to HH:MM
  const normalizeTime = (time: string | undefined | null): string => {
    if (!time) return '';
    // Remove any seconds or milliseconds: "09:00:00" -> "09:00", "09:00" -> "09:00"
    const parts = time.split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return time;
  };

  // Export Day: Export all reservations for the selected day to CSV
  const handleExportDay = () => {
    if (!currentMap) {
      toast.error('Please select a map first');
      return;
    }

    const dayReservations = getAllDayReservations();
    
    if (dayReservations.length === 0) {
      toast.error('No reservations to export for this day');
      return;
    }

    // Get space names for better CSV readability
    const reservationsWithSpaceNames = dayReservations.map(r => {
      const space = spaces.find(s => s.id === r.space_id);
      return {
        space_id: r.space_id,
        space_name: space?.name || 'Unknown',
        space_type: space?.type || 'unknown',
        user_id: r.user_id,
        user_name: r.user_name || '',
        date: r.date.split('T')[0],
        start_time: normalizeTime(r.start_time),
        end_time: normalizeTime(r.end_time),
        notes: r.notes || ''
      };
    });

    // Create CSV content - prioritize Space Name over Space ID for easier import
    const headers = ['Space Name', 'Space Type', 'Space ID', 'User ID', 'User Name', 'Date', 'Start Time', 'End Time', 'Notes'];
    const csvRows = [
      headers.join(','),
      ...reservationsWithSpaceNames.map(r => [
        `"${r.space_name.replace(/"/g, '""')}"`,
        r.space_type,
        r.space_id,
        r.user_id,
        `"${r.user_name.replace(/"/g, '""')}"`,
        r.date,
        r.start_time,
        r.end_time,
        `"${r.notes.replace(/"/g, '""')}"`
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reservations_${currentMap.name.replace(/\s+/g, '_')}_${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${dayReservations.length} reservation(s) for ${selectedDate}`);
  };

  // Import Day: Import reservations from a CSV or JSON file
  const handleImportDay = () => {
    if (!currentMap) {
      toast.error('Please select a map first');
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        let reservationsToImport: any[] = [];

        // Check if it's CSV or JSON
        if (file.name.endsWith('.csv')) {
          // Parse CSV
          const lines = text.split('\n').filter(line => line.trim());
          if (lines.length < 2) {
            toast.error('CSV file must have at least a header row and one data row');
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const spaceIdIndex = headers.findIndex(h => h.toLowerCase() === 'space id');
          const spaceNameIndex = headers.findIndex(h => h.toLowerCase() === 'space name');
          const userIdIndex = headers.findIndex(h => h.toLowerCase() === 'user id');
          const userNameIndex = headers.findIndex(h => h.toLowerCase() === 'user name');
          const dateIndex = headers.findIndex(h => h.toLowerCase() === 'date');
          const startTimeIndex = headers.findIndex(h => h.toLowerCase() === 'start time');
          const endTimeIndex = headers.findIndex(h => h.toLowerCase() === 'end time');
          const notesIndex = headers.findIndex(h => h.toLowerCase() === 'notes');

          if ((spaceIdIndex === -1 && spaceNameIndex === -1) || userIdIndex === -1 || dateIndex === -1) {
            toast.error('CSV file must have columns: Space ID or Space Name, User ID, Date');
            return;
          }

          // Parse CSV rows
          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            if (values.length < headers.length) continue;

            reservationsToImport.push({
              space_id: spaceIdIndex !== -1 ? values[spaceIdIndex] : null,
              space_name: spaceNameIndex !== -1 ? values[spaceNameIndex] : null,
              user_id: values[userIdIndex],
              user_name: values[userNameIndex] || values[userIdIndex],
              date: selectedDate, // Always use the currently selected date
              start_time: values[startTimeIndex] || '',
              end_time: values[endTimeIndex] || '',
              notes: values[notesIndex] || ''
            });
          }
        } else {
          // Parse JSON
          const importData = JSON.parse(text);
          
          // Support both old format (with reservations array) and new format (direct array)
          if (Array.isArray(importData)) {
            reservationsToImport = importData;
          } else if (importData.reservations && Array.isArray(importData.reservations)) {
            reservationsToImport = importData.reservations;
          } else {
            toast.error('Invalid file format. Expected a JSON file with a reservations array.');
            return;
          }
        }

        if (reservationsToImport.length === 0) {
          toast.error('No reservations found in the file');
          return;
        }

        // Confirm before importing
        const confirmed = window.confirm(
          `This will create ${reservationsToImport.length} reservation(s) for ${selectedDate}. Continue?`
        );

        if (!confirmed) return;

        setLoading(true);
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        // Import each reservation
        for (const reservation of reservationsToImport) {
          try {
            // Find the space by name first (preferred), then by ID (fallback)
            let spaceId: string | null = null;
            
            if (reservation.space_name) {
              // Try to find by name (case-insensitive)
              const spaceByName = spaces.find(s => 
                s.name.toLowerCase().trim() === reservation.space_name.toLowerCase().trim()
              );
              if (spaceByName) {
                spaceId = spaceByName.id;
              }
            }
            
            // If not found by name, try by ID
            if (!spaceId && reservation.space_id) {
              const spaceById = spaces.find(s => s.id === reservation.space_id);
              if (spaceById) {
                spaceId = spaceById.id;
              }
            }

            if (!spaceId) {
              const spaceIdentifier = reservation.space_name || reservation.space_id || 'Unknown';
              errors.push(`Space "${spaceIdentifier}" not found in current map`);
              errorCount++;
              continue;
            }

            // Always use the currently selected date, ignore date from file
            // Normalize time formats to HH:MM before sending to backend
            const normalizedStartTime = normalizeTime(reservation.start_time) || '09:00';
            const normalizedEndTime = normalizeTime(reservation.end_time) || '10:00';
            
            await createReservation({
              space_id: spaceId,
              user_id: reservation.user_id,
              user_name: reservation.user_name || reservation.user_id,
              date: selectedDate, // Always use the currently selected date
              start_time: normalizedStartTime,
              end_time: normalizedEndTime,
              notes: reservation.notes || '',
              status: 'active'
            });
            successCount++;
          } catch (error: any) {
            console.error('Error importing reservation:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
            errors.push(errorMsg);
            errorCount++;
          }
        }

        // Refresh reservations
        await fetchReservations();
        if (currentMap) {
          await fetchMap(currentMap.id);
        }

        if (errorCount > 0) {
          const errorSummary = errors.slice(0, 3).join('; ');
          const moreErrors = errors.length > 3 ? ` and ${errors.length - 3} more...` : '';
          toast.error(`Imported ${successCount} reservation(s), ${errorCount} failed. ${errorSummary}${moreErrors}`, {
            duration: 5000
          });
        } else {
          toast.success(`Successfully imported ${successCount} reservation(s)`);
        }
      } catch (error) {
        console.error('Error parsing import file:', error);
        toast.error('Failed to parse import file. Please check the file format.');
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  // Clear Day: Delete all reservations for the selected day
  const handleClearDay = async () => {
    if (!currentMap) {
      toast.error('Please select a map first');
      return;
    }

    const dayReservations = getAllDayReservations();
    
    if (dayReservations.length === 0) {
      toast.error('No reservations to clear for this day');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete all ${dayReservations.length} reservation(s) for ${selectedDate}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      let successCount = 0;
      let errorCount = 0;

      // Delete all individual reservations for the day
      for (const reservation of dayReservations) {
        try {
          await deleteReservation(reservation.id);
          successCount++;
        } catch (error: any) {
          console.error('Error deleting reservation:', error);
          errorCount++;
        }
      }

      // Refresh reservations
      await fetchReservations();
      if (currentMap) {
        await fetchMap(currentMap.id);
      }

      if (errorCount > 0) {
        toast.error(`Deleted ${successCount} reservation(s), ${errorCount} failed`);
      } else {
        toast.success(`Successfully deleted ${successCount} reservation(s)`);
      }
    } catch (error) {
      console.error('Error clearing day:', error);
      toast.error('Failed to clear reservations for this day');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="space-y-6">
        {/* Action Buttons Row with Statistics */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportDay}
            disabled={loading || !currentMap}
            className="btn btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('reservations.exportAllReservations')}
          >
            <Download className="h-4 w-4" />
            <span>{t('reservations.exportDay')}</span>
          </button>
          <button
            onClick={handleImportDay}
            disabled={loading || !currentMap}
            className="btn btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('reservations.importReservations')}
          >
            <Upload className="h-4 w-4" />
            <span>{t('reservations.importDay')}</span>
          </button>
          <button
            onClick={handleClearDay}
            disabled={loading || !currentMap}
            className="btn btn-danger flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title={t('reservations.clearAllReservations')}
          >
            <Trash2 className="h-4 w-4" />
            <span>{t('reservations.clearDay')}</span>
          </button>
          
          {/* Statistics - Same row as buttons */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-1 ml-auto">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-100">{reservedLogicalSpaces}</strong> {t('reservations.reservationsFor')}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-100">{totalLogicalSpaces}</strong> {t('reservations.totalSpaces')}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-100">{availableLogicalSpaces}</strong> {t('reservations.availableSpaces')}
            </p>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Map Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('reservations.selectMap')}
            </label>
            <select
              value={currentMap?.id || ''}
              onChange={(e) => handleMapChange(e.target.value)}
              className="input w-full"
            >
              <option value="">{t('reservations.chooseMap')}</option>
              {maps.map(map => (
                <option key={map.id} value={map.id}>
                  {map.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('reservations.selectDate')}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              max={format(addDays(new Date(), 7), 'yyyy-MM-dd')}
              className="input w-full"
            />
          </div>

          {/* Date Navigation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('reservations.navigateDate')}
            </label>
            <div className="flex items-center space-x-2">
              <button 
                onClick={handlePreviousDay}
                className="btn btn-secondary p-2 flex-shrink-0"
                title={t('reservations.previousDay')}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleToday}
                className="btn btn-secondary px-3 py-2 text-sm font-medium flex-1 text-center"
                title={t('reservations.goToToday')}
              >
                {formatSelectedDate()}
              </button>
              <button 
                onClick={handleNextDay}
                className="btn btn-secondary p-2 flex-shrink-0"
                title={t('reservations.nextDay')}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Office Map and Reservations Side by Side */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Office Map - Left Side */}
        {currentMap ? (
          <div className="card p-6 flex-shrink-0" style={{ width: 'fit-content', maxWidth: '100%' }}>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {currentMap.name} - {format(new Date(selectedDate), 'MMMM d, yyyy')}
              </h3>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-y-1">
                <p>{t('reservations.clickToReserve')}</p>
                <p className="text-xs">💡 {t('reservations.clickForDetails')} (doble click o click derecho)</p>
              </div>
            </div>
            
            <div className="flex justify-start">
              {renderOfficeMap()}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-6">
              <div className="flex items-center">
                <svg width="16" height="14" className="mr-2">
                  <polygon 
                    points="2,0 6,0 8,3.5 6,7 2,7 0,3.5" 
                    fill="#3b82f6" 
                    stroke="#d1d5db" 
                    strokeWidth="0.5"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('reservations.workstation')}</span>
              </div>
              <div className="flex items-center">
                <svg width="16" height="14" className="mr-2">
                  <polygon 
                    points="2,0 6,0 8,3.5 6,7 2,7 0,3.5" 
                    fill="#10b981" 
                    stroke="#d1d5db" 
                    strokeWidth="0.5"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('reservations.meetingRoom')}</span>
              </div>
              <div className="flex items-center">
                <svg width="16" height="14" className="mr-2">
                  <polygon 
                    points="2,0 6,0 8,3.5 6,7 2,7 0,3.5" 
                    fill="#8b5cf6" 
                    stroke="#d1d5db" 
                    strokeWidth="0.5"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('reservations.cubicle')}</span>
              </div>
              <div className="flex items-center">
                <svg width="16" height="14" className="mr-2">
                  <polygon 
                    points="2,0 6,0 8,3.5 6,7 2,7 0,3.5" 
                    fill="#374151" 
                    stroke="#d1d5db" 
                    strokeWidth="0.5"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('reservations.invalidSpace')}</span>
              </div>
              <div className="flex items-center">
                <svg width="16" height="14" className="mr-2">
                  <polygon 
                    points="2,0 6,0 8,3.5 6,7 2,7 0,3.5" 
                    fill="#ef4444" 
                    stroke="#d1d5db" 
                    strokeWidth="0.5"
                    opacity="0.75"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('reservations.reserved')}</span>
              </div>
              <div className="flex items-center">
                <svg width="16" height="14" className="mr-2">
                  <polygon 
                    points="2,0 6,0 8,3.5 6,7 2,7 0,3.5" 
                    fill="#f9fafb" 
                    stroke="#d1d5db" 
                    strokeWidth="0.5"
                  />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">{t('reservations.emptySpace')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="card flex-shrink-0" style={{ width: 'fit-content' }}>
            <div className="text-center py-12 px-6">
              <MapPin className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No map selected</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Please select a map to view and reserve spaces.
              </p>
            </div>
          </div>
        )}

        {/* Current Reservations - Right Side */}
        <div className="card p-6 flex-1 min-w-0">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Reservations for {format(new Date(selectedDate), 'MMMM d, yyyy')}
        </h3>
        
        {reservationsLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : (todayReservations.length > 0 || reservationsBySpace.length > 0) ? (
          <div className="space-y-3">
            {/* Meeting Room Groups - Grouped by name */}
            {meetingRoomGroupsByName.map((group) => {
              // Sort reservations by start time
              const sortedReservations = [...group.reservations].sort((a, b) => {
                const timeA = a.start_time || '00:00';
                const timeB = b.start_time || '00:00';
                return timeA.localeCompare(timeB);
              });
              
              const hasMultipleReservations = sortedReservations.length > 1;
              const firstReservation = sortedReservations[0];
              // Key is just the group name since we group all reservations for the same meeting group together
              const uniqueKey = `meeting-group-${group.groupName}`;
              
              return (
                <div
                  key={uniqueKey}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-green-500 transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredReservationKey(uniqueKey)}
                  onMouseLeave={() => setHoveredReservationKey(null)}
                  onClick={() => {
                    // Always open panel for meeting groups to show all reservations
                    // Get all individual reservations from the group
                    const allReservations: any[] = [];
                    sortedReservations.forEach(res => {
                      if (res._groupReservations) {
                        allReservations.push(...res._groupReservations);
                      } else {
                        allReservations.push(res);
                      }
                    });
                    // Sort by start time
                    allReservations.sort((a, b) => {
                      const timeA = a.start_time || '00:00';
                      const timeB = b.start_time || '00:00';
                      return timeA.localeCompare(timeB);
                    });
                    
                    // Create a virtual space for the group
                    const firstSpace = spaces.find(s => group.spaceIds.includes(s.id));
                    const virtualSpace: Space | null = firstSpace ? {
                      ...firstSpace,
                      name: group.groupName,
                      _isGroupSpace: true
                    } : null;
                    
                    setSelectedSpaceReservations({space: virtualSpace, reservations: allReservations});
                    setShowReservationsPanel(true);
                  }}
                  style={{
                    transform: hoveredReservationKey === uniqueKey ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: hoveredReservationKey === uniqueKey ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                    borderLeftWidth: hoveredReservationKey === uniqueKey ? '6px' : '4px'
                  }}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {group.groupName}
                      </span>
                      <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full">
                        Group ({group.groupSize} spaces)
                      </span>
                      {hasMultipleReservations && (
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full">
                          {sortedReservations.length} {t('reservations.reservations')}
                        </span>
                      )}
                    </div>
                    {/* Show user info only if there's a single user, otherwise show multiple users indicator */}
                    {(() => {
                      const uniqueUsers = new Set(sortedReservations.map(r => r.user_name));
                      const singleUser = uniqueUsers.size === 1;
                      
                      if (singleUser && !hasMultipleReservations) {
                        return (
                          <>
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {firstReservation.user_name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {firstReservation.start_time} - {firstReservation.end_time}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({t('reservations.clickToViewAll')})
                              </span>
                            </div>
                          </>
                        );
                      } else {
                        return (
                          <div className="flex items-center space-x-2 flex-wrap">
                            <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-gray-700 dark:text-gray-300 text-sm">
                              {singleUser 
                                ? firstReservation.user_name 
                                : `${uniqueUsers.size} ${t('reservations.users')}`
                              }
                            </span>
                            <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {sortedReservations[0].start_time} - {sortedReservations[sortedReservations.length - 1].end_time}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({t('reservations.clickToViewAll')})
                            </span>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* For meeting groups, always show info icon to open panel */}
                    <div title={t('reservations.clickToViewAll')}>
                      <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    {!hasMultipleReservations && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditReservation(firstReservation);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t('reservations.editReservation')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReservation(firstReservation);
                          }}
                          className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('reservations.deleteReservation')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Individual Space Reservations - Grouped by space */}
            {reservationsBySpace.map((spaceGroup) => {
              if (spaceGroup.reservations.length === 0) return null;
              
              // Sort reservations by start time
              const sortedReservations = [...spaceGroup.reservations].sort((a, b) => {
                const timeA = a.start_time || '00:00';
                const timeB = b.start_time || '00:00';
                return timeA.localeCompare(timeB);
              });
              
              const hasMultipleReservations = sortedReservations.length > 1;
              const firstReservation = sortedReservations[0];
              const space = spaceGroup.space;
              
              return (
                <div
                  key={space?.id || 'unknown'}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500 transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => {
                    // Highlight all hexagons for this space
                    if (space) {
                      const hexSet = new Set<string>();
                      for (let row = space.y; row < space.y + space.height; row++) {
                        for (let col = space.x; col < space.x + space.width; col++) {
                          hexSet.add(`${col}-${row}`);
                        }
                      }
                      // We'll use a special key for space groups
                      setHoveredReservationKey(`space-${space.id}`);
                    }
                  }}
                  onMouseLeave={() => setHoveredReservationKey(null)}
                  onClick={() => {
                    if (hasMultipleReservations) {
                      setSelectedSpaceReservations({space, reservations: sortedReservations});
                      setShowReservationsPanel(true);
                    }
                  }}
                  style={{
                    transform: hoveredReservationKey === `space-${space?.id}` ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: hoveredReservationKey === `space-${space?.id}` ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
                    borderLeftWidth: hoveredReservationKey === `space-${space?.id}` ? '6px' : '4px'
                  }}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {space?.name || 'Unknown Space'}
                      </span>
                      {hasMultipleReservations && (
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full">
                          {sortedReservations.length} {t('reservations.reservations')}
                        </span>
                      )}
                    </div>
                    {!hasMultipleReservations && (
                      <>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300">
                            {firstReservation.user_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {firstReservation.start_time} - {firstReservation.end_time}
                          </span>
                        </div>
                      </>
                    )}
                    {hasMultipleReservations && (
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          {sortedReservations[0].start_time} - {sortedReservations[sortedReservations.length - 1].end_time}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({t('reservations.clickToViewAll')})
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {!hasMultipleReservations && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditReservation(firstReservation);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title={t('reservations.editReservation')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteReservation(firstReservation);
                          }}
                          className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title={t('reservations.deleteReservation')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {hasMultipleReservations && (
                      <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No reservations for this date
            </p>
          </div>
        )}
        </div>
      </div>

      {/* Reservations Panel - Right Side */}
      {showReservationsPanel && selectedSpaceReservations.space && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="flex-1 bg-black bg-opacity-30"
            onClick={() => setShowReservationsPanel(false)}
          />
          
          {/* Panel - Glass effect */}
          <div className="w-full max-w-md bg-gray-900/80 dark:bg-gray-900/90 backdrop-blur-md shadow-2xl overflow-y-auto border-l border-gray-700/50">
            <div className="sticky top-0 bg-gray-900/90 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-700/50 p-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-white flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                {selectedSpaceReservations.space.name}
              </h3>
              <button
                onClick={() => setShowReservationsPanel(false)}
                className="text-gray-300 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-300">
                  {format(new Date(selectedDate), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedSpaceReservations.reservations.length} {t('reservations.reservations')} {t('reservations.total')}
                </p>
              </div>
              
              <div className="space-y-3">
                {selectedSpaceReservations.reservations.map((reservation) => (
                  <div 
                    key={reservation.id} 
                    className="bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border-l-4 border-blue-400 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-300" />
                        <span className="font-medium text-white">
                          {reservation.start_time} - {reservation.end_time}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mb-2">
                      <User className="h-4 w-4 text-gray-300" />
                      <span className="text-sm text-gray-200">
                        {reservation.user_name || reservation.user_id}
                      </span>
                    </div>
                    {reservation.notes && (
                      <div className="text-sm text-gray-300 mt-2">
                        <span className="font-medium">{t('reservations.notes')}:</span> {reservation.notes}
                      </div>
                    )}
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-white/20">
                      <button
                        onClick={() => {
                          setShowReservationsPanel(false);
                          handleEditReservation(reservation);
                        }}
                        className="p-2 text-blue-400 hover:text-blue-300 hover:bg-white/10 rounded-lg transition-colors"
                        title={t('reservations.editReservation')}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          handleDeleteReservation(reservation);
                          // Refresh the panel if there are still reservations
                          const remaining = selectedSpaceReservations.reservations.filter(r => r.id !== reservation.id);
                          if (remaining.length === 0) {
                            setShowReservationsPanel(false);
                          } else {
                            setSelectedSpaceReservations({
                              ...selectedSpaceReservations,
                              reservations: remaining
                            });
                          }
                        }}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-white/10 rounded-lg transition-colors"
                        title={t('reservations.deleteReservation')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Reservation Modal */}
      {showEditModal && editingReservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                <Edit className="h-5 w-5 mr-2" />
                {t('reservations.editReservation')}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('reservations.spaceName')}
                </label>
                <input
                  type="text"
                  value={spaces.find(s => s.id === editingReservation.space_id)?.name || 'Unknown Space'}
                  disabled
                  className="input bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('reservations.userName')}
                </label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="input"
                  placeholder={t('reservations.enterUserName')}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('reservations.startTime')}
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('reservations.endTime')}
                  </label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className="input"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpdateReservation}
                disabled={loading || !editUserName.trim() || !editStartTime || !editEndTime}
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('common.loading') : t('reservations.updateReservation')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Space Information Modal */}
      {showSpaceInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
                <Info className="h-5 w-5 mr-2" />
                {t('reservations.spaceInfo')}
              </h3>
              <button
                onClick={() => setShowSpaceInfo(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedSpaceInfo.space ? (
                <>
                  {/* Space Details */}
                  <div className="border-b border-gray-200 dark:border-gray-600 pb-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {selectedSpaceInfo.space.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <span className="font-medium">{t('common.type')}:</span> {t(`reservations.${selectedSpaceInfo.space.type.replace('_', '')}`)}
                      </div>
                      <div>
                        <span className="font-medium">{t('mapBuilder.capacity')}:</span> {selectedSpaceInfo.space.capacity}
                      </div>
                      <div>
                        <span className="font-medium">{t('mapBuilder.position')}:</span> ({selectedSpaceInfo.space.x}, {selectedSpaceInfo.space.y})
                      </div>
                      <div>
                        <span className="font-medium">{t('mapBuilder.size')}:</span> {selectedSpaceInfo.space.width}x{selectedSpaceInfo.space.height}
                      </div>
                    </div>
                  </div>

                  {/* Reservation Details */}
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('reservations.reservationInfo')} - {format(new Date(selectedDate), 'MMMM d, yyyy')}
                    </h4>
                    
                    {selectedSpaceInfo.reservations.length > 0 ? (
                      <div className="space-y-3">
                        {selectedSpaceInfo.reservations.map((reservation) => (
                          <div key={reservation.id} className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                            <div className="flex items-center mb-2">
                              <User className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                              <span className="font-medium text-red-800 dark:text-red-200">
                                {t('reservations.reservedBy')}: {reservation.user_name || reservation.user_id}
                              </span>
                            </div>
                            {(reservation.start_time || reservation.end_time) && (
                              <div className="flex items-center mb-2">
                                <Clock className="h-4 w-4 mr-2 text-red-600 dark:text-red-400" />
                                <span className="text-sm text-red-700 dark:text-red-300">
                                  {t('reservations.reservationTime')}: {reservation.start_time || 'N/A'} - {reservation.end_time || 'N/A'}
                                </span>
                              </div>
                            )}
                            {reservation.notes && (
                              <div className="text-sm text-red-700 dark:text-red-300">
                                <span className="font-medium">{t('reservations.notes')}:</span> {reservation.notes}
                              </div>
                            )}
                            {!reservation.notes && (
                              <div className="text-sm text-red-600 dark:text-red-400 italic">
                                {t('reservations.noNotes')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-green-800 dark:text-green-200 text-center">
                          <Calendar className="h-8 w-8 mx-auto mb-2 text-green-600 dark:text-green-400" />
                          <p className="font-medium">{t('reservations.availableSpace')}</p>
                          <p className="text-sm">{t('reservations.noReservation')}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Button - Always show, even if there are existing reservations */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                    <button
                      onClick={() => {
                        setShowSpaceInfo(false);
                        handleSpaceClick(selectedSpaceInfo.space!);
                      }}
                      className="btn btn-primary w-full"
                    >
                      {selectedSpaceInfo.reservations.length > 0 
                        ? `${t('reservations.reserve')} ${selectedSpaceInfo.space.name} (${t('reservations.available')})`
                        : `${t('reservations.reserve')} ${selectedSpaceInfo.space.name}`
                      }
                    </button>
                    {selectedSpaceInfo.reservations.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        {t('reservations.youCanReserve')} {selectedSpaceInfo.space.name} {t('reservations.inDifferentTime')}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                  <h4 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {t('reservations.emptySpace')}
                  </h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t('reservations.noSpacesAvailable')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {showReservationModal && selectedSpace && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Reserve {selectedSpace.name}
              </h3>
              <button
                onClick={() => setShowReservationModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Your Name *
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="input"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  max={format(addDays(new Date(), 7), 'yyyy-MM-dd')}
                  className="input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="input"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleCreateReservation}
                  disabled={loading}
                  className="btn btn-primary flex-1"
                >
                  {loading ? 'Creating...' : 'Create Reservation'}
                </button>
                <button
                  onClick={() => setShowReservationModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reservations;