import type { Space } from '../types';

/**
 * Get adjacent hexagon coordinates for a hexagonal grid
 * In a hexagonal grid, each hexagon has 6 neighbors
 */
export const getAdjacentHexagons = (x: number, y: number): Array<{x: number, y: number}> => {
  const isOddRow = y % 2 === 1;
  
  if (isOddRow) {
    // Odd rows are offset to the right
    return [
      { x: x, y: y - 1 },     // Top
      { x: x + 1, y: y - 1 }, // Top-right
      { x: x + 1, y: y },     // Right
      { x: x, y: y + 1 },     // Bottom
      { x: x + 1, y: y + 1 }, // Bottom-right
      { x: x - 1, y: y }      // Left
    ];
  } else {
    // Even rows
    return [
      { x: x, y: y - 1 },     // Top
      { x: x + 1, y: y },     // Right
      { x: x, y: y + 1 },     // Bottom
      { x: x - 1, y: y + 1 }, // Bottom-left
      { x: x - 1, y: y },     // Left
      { x: x - 1, y: y - 1 }  // Top-left
    ];
  }
};

/**
 * Find all spaces at given coordinates
 */
export const findSpaceAtCoordinates = (spaces: Space[], x: number, y: number): Space | null => {
  return spaces.find(space => 
    x >= space.x && x < space.x + space.width &&
    y >= space.y && y < space.y + space.height
  ) || null;
};

/**
 * Group adjacent meeting rooms into clusters
 */
export const groupAdjacentMeetingRooms = (spaces: Space[]): Space[][] => {
  const meetingRooms = spaces.filter(space => space.type === 'meeting_room');
  const visited = new Set<string>();
  const groups: Space[][] = [];

  const getSpaceKey = (space: Space) => `${space.x}-${space.y}`;

  const findConnectedMeetingRooms = (startSpace: Space): Space[] => {
    const group: Space[] = [];
    const queue: Space[] = [startSpace];
    
    while (queue.length > 0) {
      const currentSpace = queue.shift()!;
      const key = getSpaceKey(currentSpace);
      
      if (visited.has(key)) continue;
      
      visited.add(key);
      group.push(currentSpace);
      
      // Check all positions this space occupies
      for (let x = currentSpace.x; x < currentSpace.x + currentSpace.width; x++) {
        for (let y = currentSpace.y; y < currentSpace.y + currentSpace.height; y++) {
          const adjacentCoords = getAdjacentHexagons(x, y);
          
          for (const coord of adjacentCoords) {
            const adjacentSpace = findSpaceAtCoordinates(meetingRooms, coord.x, coord.y);
            
            if (adjacentSpace && 
                adjacentSpace.type === 'meeting_room' && 
                !visited.has(getSpaceKey(adjacentSpace))) {
              queue.push(adjacentSpace);
            }
          }
        }
      }
    }
    
    return group;
  };

  for (const meetingRoom of meetingRooms) {
    const key = getSpaceKey(meetingRoom);
    if (!visited.has(key)) {
      const group = findConnectedMeetingRooms(meetingRoom);
      if (group.length > 0) {
        groups.push(group);
      }
    }
  }

  return groups;
};

/**
 * Find the meeting room group that contains a specific space
 */
export const findMeetingRoomGroup = (spaces: Space[], targetSpace: Space): Space[] => {
  if (targetSpace.type !== 'meeting_room') {
    return [targetSpace]; // Return single space if not a meeting room
  }

  const groups = groupAdjacentMeetingRooms(spaces);
  const group = groups.find(group => 
    group.some(space => space.id === targetSpace.id)
  );

  return group || [targetSpace];
};

/**
 * Get a display name for a meeting room group
 */
export const getMeetingRoomGroupName = (group: Space[]): string => {
  if (group.length === 1) {
    return group[0].name;
  }
  
  // Sort by name and create a combined name
  const sortedNames = group.map(space => space.name).sort();
  return `${sortedNames[0]} + ${group.length - 1} more`;
};

/**
 * Check if any space in a meeting room group is reserved
 */
export const isMeetingRoomGroupReserved = (
  group: Space[], 
  reservations: any[], 
  selectedDate: string
): boolean => {
  return group.some(space => {
    return reservations.some(reservation => 
      reservation.space_id === space.id && 
      reservation.date.split('T')[0] === selectedDate &&
      reservation.status === 'active'
    );
  });
};

/**
 * Get the total count of logical spaces (meeting room groups count as 1, invalid spaces excluded)
 */
export const getTotalSpaceCount = (spaces: Space[]): number => {
  const meetingRoomGroups = groupAdjacentMeetingRooms(spaces);
  const nonMeetingRooms = spaces.filter(space => 
    space.type !== 'meeting_room' && space.type !== 'invalid_space'
  );
  
  return meetingRoomGroups.length + nonMeetingRooms.length;
};

/**
 * Get the count of reserved logical spaces for a specific date (invalid spaces excluded)
 */
export const getReservedSpaceCount = (
  spaces: Space[], 
  reservations: any[], 
  selectedDate: string
): number => {
  const meetingRoomGroups = groupAdjacentMeetingRooms(spaces);
  const nonMeetingRooms = spaces.filter(space => 
    space.type !== 'meeting_room' && space.type !== 'invalid_space'
  );
  
  // Count reserved meeting room groups
  const reservedMeetingRoomGroups = meetingRoomGroups.filter(group => 
    isMeetingRoomGroupReserved(group, reservations, selectedDate)
  ).length;
  
  // Count reserved non-meeting rooms (excluding invalid spaces)
  const reservedNonMeetingRooms = nonMeetingRooms.filter(space => {
    return reservations.some(reservation => 
      reservation.space_id === space.id && 
      reservation.date.split('T')[0] === selectedDate &&
      reservation.status === 'active'
    );
  }).length;
  
  return reservedMeetingRoomGroups + reservedNonMeetingRooms;
};

/**
 * Get the count of available logical spaces for a specific date
 */
export const getAvailableSpaceCount = (
  spaces: Space[], 
  reservations: any[], 
  selectedDate: string
): number => {
  const totalSpaces = getTotalSpaceCount(spaces);
  const reservedSpaces = getReservedSpaceCount(spaces, reservations, selectedDate);
  
  return totalSpaces - reservedSpaces;
};
