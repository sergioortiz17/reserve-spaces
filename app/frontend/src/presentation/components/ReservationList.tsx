/**
 * Component for displaying the list of reservations
 */
import React from 'react';
import { MapPin, Clock, User, Info, Edit, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Reservation, Space } from '../../types';

interface ReservationListProps {
  meetingRoomGroups: Array<{
    groupName: string;
    groupSize: number;
    reservations: Reservation[];
    spaceIds: string[];
  }>;
  reservationsBySpace: Array<{
    space: Space | null;
    reservations: Reservation[];
  }>;
  spaces: Space[];
  hoveredReservationKey: string | null;
  onHover: (key: string | null) => void;
  onReservationClick: (space: Space | null, reservations: Reservation[]) => void;
  onEdit: (reservation: Reservation) => void;
  onDelete: (reservation: Reservation) => void;
}

export const ReservationList: React.FC<ReservationListProps> = ({
  meetingRoomGroups,
  reservationsBySpace,
  spaces,
  hoveredReservationKey,
  onHover,
  onReservationClick,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      {/* Meeting Room Groups */}
      {meetingRoomGroups.map((group) => {
        const sortedReservations = [...group.reservations].sort((a, b) => {
          const timeA = a.start_time || '00:00';
          const timeB = b.start_time || '00:00';
          return timeA.localeCompare(timeB);
        });

        const hasMultipleReservations = sortedReservations.length > 1;
        const firstReservation = sortedReservations[0];
        const uniqueKey = `meeting-group-${group.groupName}`;
        const isHovered = hoveredReservationKey === uniqueKey;

        // Get all individual reservations
        const allReservations: Reservation[] = [];
        sortedReservations.forEach(res => {
          if (res._groupReservations) {
            allReservations.push(...res._groupReservations);
          } else {
            allReservations.push(res);
          }
        });
        allReservations.sort((a, b) => {
          const timeA = a.start_time || '00:00';
          const timeB = b.start_time || '00:00';
          return timeA.localeCompare(timeB);
        });

        const firstSpace = spaces.find(s => group.spaceIds.includes(s.id));
        const virtualSpace: Space | null = firstSpace ? {
          ...firstSpace,
          name: group.groupName,
        } : null;

        const uniqueUsers = new Set(sortedReservations.map(r => r.user_name));
        const singleUser = uniqueUsers.size === 1;

        return (
          <div
            key={uniqueKey}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-green-500 transition-all duration-300 cursor-pointer"
            onMouseEnter={() => onHover(uniqueKey)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onReservationClick(virtualSpace, allReservations)}
            style={{
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
              boxShadow: isHovered ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
              borderLeftWidth: isHovered ? '6px' : '4px',
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
              {singleUser && !hasMultipleReservations ? (
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
              ) : (
                <div className="flex items-center space-x-2 flex-wrap">
                  <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300 text-sm">
                    {singleUser ? firstReservation.user_name : `${uniqueUsers.size} ${t('reservations.users')}`}
                  </span>
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
              <div title={t('reservations.clickToViewAll')}>
                <Info className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              {!hasMultipleReservations && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(firstReservation);
                    }}
                    className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title={t('reservations.editReservation')}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(firstReservation);
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

      {/* Individual Space Reservations */}
      {reservationsBySpace.map((spaceGroup) => {
        if (spaceGroup.reservations.length === 0) return null;

        const sortedReservations = [...spaceGroup.reservations].sort((a, b) => {
          const timeA = a.start_time || '00:00';
          const timeB = b.start_time || '00:00';
          return timeA.localeCompare(timeB);
        });

        const hasMultipleReservations = sortedReservations.length > 1;
        const firstReservation = sortedReservations[0];
        const space = spaceGroup.space;
        const uniqueKey = space?.id || 'unknown';
        const isHovered = hoveredReservationKey === uniqueKey;

        return (
          <div
            key={uniqueKey}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-l-4 border-blue-500 transition-all duration-300 cursor-pointer"
            onMouseEnter={() => onHover(uniqueKey)}
            onMouseLeave={() => onHover(null)}
            onClick={() => {
              if (hasMultipleReservations) {
                onReservationClick(space, sortedReservations);
              }
            }}
            style={{
              transform: isHovered ? 'scale(1.02)' : 'scale(1)',
              boxShadow: isHovered ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none',
              borderLeftWidth: isHovered ? '6px' : '4px',
            }}
          >
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {space?.name || 'Unknown Space'}
                </span>
              </div>
              {!hasMultipleReservations ? (
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
              ) : (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {sortedReservations[0].start_time} - {sortedReservations[sortedReservations.length - 1].end_time}
                  </span>
                  <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full">
                    {sortedReservations.length} {t('reservations.reservations')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({t('reservations.clickToViewAll')})
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {hasMultipleReservations && (
                <div title={t('reservations.clickToViewAll')}>
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              )}
              {!hasMultipleReservations && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(firstReservation);
                    }}
                    className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    title={t('reservations.editReservation')}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(firstReservation);
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
    </div>
  );
};

