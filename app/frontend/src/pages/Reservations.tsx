import React, { useState } from 'react';
import { Calendar, MapPin, X, RefreshCw, Info, Clock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOfficeMap } from '../hooks/useOfficeMap';
import { useReservations } from '../hooks/useReservations';
import { createReservation } from '../utils/api';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import type { Space } from '../types';

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

  const getSpaceColor = (type: string) => {
    switch (type) {
      case 'workstation': return 'bg-blue-500';
      case 'meeting_room': return 'bg-green-500';
      case 'cubicle': return 'bg-purple-500';
      default: return 'bg-gray-500';
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

  const renderOfficeMap = () => {
    if (!currentMap || spaces.length === 0) {
      return (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{t('reservations.noSpacesAvailable')}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {!currentMap ? t('reservations.pleaseSelectMap') : t('reservations.thisMapHasNoSpaces')}
          </p>
        </div>
      );
    }

    const gridWidth = currentMap.json_data.grid?.width || 20;
    const gridHeight = currentMap.json_data.grid?.height || 15;
    
    const cells = [];
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const space = spaces.find(space => 
          x >= space.x && x < space.x + space.width &&
          y >= space.y && y < space.y + space.height
        );

        const isReserved = space ? isSpaceReserved(space.id) : false;

        cells.push(
          <div
            key={`${x}-${y}`}
            className={`
              w-10 h-10 border border-gray-200 dark:border-gray-600 cursor-pointer transition-all duration-200
              ${space 
                ? isReserved
                  ? 'bg-red-500 opacity-75 cursor-not-allowed border-red-600'
                  : `${getSpaceColor(space.type)} hover:opacity-80 border-gray-400`
                : 'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
            onClick={() => space && !isReserved && handleSpaceClick(space)}
            onContextMenu={(e) => {
              e.preventDefault();
              handleSpaceInfoClick(space || null);
            }}
            onDoubleClick={() => handleSpaceInfoClick(space || null)}
            title={space 
              ? `${space.name} ${isReserved ? `(${t('reservations.reserved')})` : `(${t('reservations.available')})`} - ${t('reservations.clickForDetails')}`
              : t('reservations.emptySpace')
            }
          />
        );
      }
    }
    return cells;
  };

  const todayReservations = reservations.filter(r => r.date === selectedDate);

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg">
        <p><strong>Debug:</strong> Maps loaded: {maps.length}, Current map: {currentMap?.name || 'None'}, Reservations: {reservations.length}</p>
      </div>
      
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
              <p><strong>{todayReservations.length}</strong> {t('reservations.reservationsFor')}</p>
              <p><strong>{spaces.length}</strong> {t('reservations.totalSpaces')}</p>
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
          
          <div 
            className="grid gap-0 border-2 border-gray-300 dark:border-gray-600 inline-block"
            style={{ 
              gridTemplateColumns: `repeat(${currentMap.json_data.grid?.width || 20}, 1fr)`,
              gridTemplateRows: `repeat(${currentMap.json_data.grid?.height || 15}, 1fr)`
            }}
          >
            {renderOfficeMap()}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-6">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('reservations.workstation')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('reservations.meetingRoom')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('reservations.cubicle')}</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 opacity-75 rounded mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('reservations.reserved')}</span>
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
                <div key={reservation.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${space ? getSpaceColor(space.type) : 'bg-gray-400'}`}></div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {space?.name || 'Unknown Space'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {reservation.user_name} • {reservation.start_time} - {reservation.end_time}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full">
                    Active
                  </span>
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