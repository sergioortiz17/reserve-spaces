import React, { useState } from 'react';
import { Calendar, MapPin, X, RefreshCw, Info, Clock, User, ChevronLeft, ChevronRight, Edit, Trash2 } from 'lucide-react';
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
  isMeetingRoomGroupReserved,
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
  const [refreshing, setRefreshing] = useState(false);
  const [showSpaceInfo, setShowSpaceInfo] = useState(false);
  const [selectedSpaceInfo, setSelectedSpaceInfo] = useState<{space: Space | null, reservations: any[]}>({space: null, reservations: []});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReservation, setEditingReservation] = useState<any>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');

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

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchReservations(),
        // Also refresh the current map to get updated spaces
        currentMap ? fetchMap(currentMap.id) : Promise.resolve()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
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
      
      // Check if this is a meeting room group
      if (selectedSpace.type === 'meeting_room' && selectedSpace._group) {
        // Create reservations for all spaces in the group
        const group = selectedSpace._group;
        const reservationPromises = group.map((space: Space) => 
          createReservation({
            space_id: space.id,
            user_id: userName.trim(),
            user_name: userName.trim(),
            date: selectedDate,
            start_time: startTime,
            end_time: endTime,
            status: 'active'
          })
        );
        
        await Promise.all(reservationPromises);
        toast.success(`${t('reservations.reservationCreated')} (${group.length} spaces)`);
      } else {
        // Single space reservation
        await createReservation({
          space_id: selectedSpace.id,
          user_id: userName.trim(),
          user_name: userName.trim(),
          date: selectedDate,
          start_time: startTime,
          end_time: endTime,
          status: 'active'
        });
        
        toast.success(t('reservations.reservationCreated'));
      }

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
      await updateReservation(editingReservation.id, {
        user_name: editUserName.trim(),
        start_time: editStartTime,
        end_time: editEndTime,
      });
      
      toast.success(t('reservations.reservationUpdated'));
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

  const handleDeleteReservation = async (reservationId: string) => {
    if (!confirm(t('reservations.confirmDelete'))) return;

    setLoading(true);
    try {
      await deleteReservation(reservationId);
      toast.success(t('reservations.reservationDeleted'));
      
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
    if (space.type === 'meeting_room') {
      const group = findMeetingRoomGroup(spaces, space);
      return isMeetingRoomGroupReserved(group, reservations, selectedDate);
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

    const spaceReservations = getSpaceReservations(space.id);
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
        // For meeting rooms, find the group and check if any in the group is reserved
        const group = findMeetingRoomGroup(spaces, space);
        const groupReserved = isMeetingRoomGroupReserved(group, reservations, selectedDate);
        
        if (!groupReserved) {
          // Pass the entire group as the selected space
          const groupSpace = {
            ...space,
            name: getMeetingRoomGroupName(group),
            _group: group // Store the group for later use
          };
          handleSpaceClick(groupSpace);
        }
      } else {
        // For other space types, use normal logic
        if (!isSpaceReserved(space.id)) {
          handleSpaceClick(space);
        }
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
        />
      </div>
    );
  };

  // Filter reservations for the selected date (handle ISO date format, only active reservations)
  const todayReservations = reservations.filter(r => {
    const reservationDate = r.date.split('T')[0]; // Extract date part from ISO string
    return reservationDate === selectedDate && r.status === 'active';
  });
  
  // Calculate correct space counts (meeting room groups count as 1)
  const totalLogicalSpaces = getTotalSpaceCount(spaces);
  const reservedLogicalSpaces = getReservedSpaceCount(spaces, reservations, selectedDate);
  const availableLogicalSpaces = getAvailableSpaceCount(spaces, reservations, selectedDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('reservations.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t('reservations.subtitle')}</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Map
          </label>
          <select
            value={currentMap?.id || ''}
            onChange={(e) => handleMapChange(e.target.value)}
            className="input"
          >
            <option value="">Choose a map...</option>
            {maps.map(map => (
              <option key={map.id} value={map.id}>
                {map.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Date
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

        <div className="flex items-end">
          <div className="flex flex-col space-y-2">
            {/* Date Navigation Controls */}
            <div className="flex items-center space-x-2 mb-2">
              <button 
                onClick={handlePreviousDay}
                className="btn btn-secondary p-2"
                title="Previous day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleToday}
                className="btn btn-secondary px-3 py-2 text-sm font-medium min-w-[140px]"
                title="Go to today"
              >
                {formatSelectedDate()}
              </button>
              <button 
                onClick={handleNextDay}
                className="btn btn-secondary p-2"
                title="Next day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn btn-secondary flex items-center space-x-2"
              title={t('reservations.refreshData')}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{t('reservations.refresh')}</span>
            </button>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p><strong>{reservedLogicalSpaces}</strong> {t('reservations.reservationsFor')}</p>
              <p><strong>{totalLogicalSpaces}</strong> {t('reservations.totalSpaces')}</p>
              <p><strong>{availableLogicalSpaces}</strong> {t('reservations.availableSpaces')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Office Map */}
      {currentMap && (
        <div className="card p-6">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {currentMap.name} - {format(new Date(selectedDate), 'MMMM d, yyyy')}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 space-y-1">
              <p>{t('reservations.clickToReserve')}</p>
              <p className="text-xs">💡 {t('reservations.clickForDetails')} (doble click o click derecho)</p>
            </div>
          </div>
          
          {renderOfficeMap()}

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
      )}

      {!currentMap && (
        <div className="card">
          <div className="text-center py-12">
            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No map selected</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Please select a map to view and reserve spaces.
            </p>
          </div>
        </div>
      )}

      {/* Current Reservations */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Reservations for {format(new Date(selectedDate), 'MMMM d, yyyy')}
        </h3>
        
        {reservationsLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : todayReservations.length > 0 ? (
          <div className="space-y-3">
            {todayReservations.map(reservation => {
              const space = spaces.find(s => s.id === reservation.space_id);
              return (
                <div key={reservation.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {space?.name || 'Unknown Space'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">
                        {reservation.user_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {reservation.start_time} - {reservation.end_time}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditReservation(reservation)}
                      className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title={t('reservations.editReservation')}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReservation(reservation.id)}
                      className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title={t('reservations.deleteReservation')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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

                  {/* Action Button */}
                  {selectedSpaceInfo.reservations.length === 0 && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                      <button
                        onClick={() => {
                          setShowSpaceInfo(false);
                          handleSpaceClick(selectedSpaceInfo.space!);
                        }}
                        className="btn btn-primary w-full"
                      >
                        {t('reservations.reserve')} {selectedSpaceInfo.space.name}
                      </button>
                    </div>
                  )}
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