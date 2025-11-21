import React from 'react';
import Hexagon from './Hexagon';

interface HexagonGridProps {
  width: number;
  height: number;
  hexSize?: number;
  spaces?: any[];
  reservations?: any[];
  selectedDate?: string;
  onHexClick?: (x: number, y: number, space?: any) => void;
  onHexDoubleClick?: (x: number, y: number, space?: any) => void;
  onHexRightClick?: (e: React.MouseEvent, x: number, y: number, space?: any) => void;
  getHexColor?: (x: number, y: number, space?: any, isReserved?: boolean) => string;
  getHexTitle?: (x: number, y: number, space?: any, isReserved?: boolean) => string;
  selectedHexagons?: Set<string>;
}

const HexagonGrid: React.FC<HexagonGridProps> = ({
  width,
  height,
  hexSize = 25,
  spaces = [],
  reservations = [],
  selectedDate,
  onHexClick,
  onHexDoubleClick,
  onHexRightClick,
  getHexColor,
  getHexTitle,
  selectedHexagons = new Set()
}) => {
  // Calculate hexagon spacing
  const hexWidth = hexSize * 2;
  const hexHeight = hexSize * Math.sqrt(3);
  const horizontalSpacing = hexWidth * 0.75;
  const verticalSpacing = hexHeight;

  // Check if a hexagon is part of a space
  const findSpaceAtPosition = (x: number, y: number) => {
    return spaces.find(space => 
      x >= space.x && 
      x < space.x + space.width &&
      y >= space.y && 
      y < space.y + space.height
    );
  };

  // Check if a space is reserved
  const isSpaceReserved = (spaceId: string) => {
    if (!selectedDate) return false;
    return reservations.some(reservation => {
      const reservationDate = reservation.date.split('T')[0];
      return reservation.space_id === spaceId && 
             reservationDate === selectedDate &&
             reservation.status === 'active';
    });
  };

  // Get default hex color
  const getDefaultHexColor = (_x: number, _y: number, space?: any, isReserved?: boolean) => {
    if (!space) return '#f9fafb'; // Empty space - light gray
    
    // Invalid spaces appear invisible (same as background)
    if (space.type === 'invalid_space') return '#f3f4f6';
    
    if (isReserved) return '#ef4444'; // Reserved - red
    
    // Space colors by type
    switch (space.type) {
      case 'workstation': return '#3b82f6'; // Blue
      case 'meeting_room': return '#10b981'; // Green
      case 'cubicle': return '#8b5cf6'; // Purple
      default: return '#6b7280'; // Gray
    }
  };

  // Get default hex title
  const getDefaultHexTitle = (_x: number, _y: number, space?: any, isReserved?: boolean) => {
    if (!space) return 'Empty space';
    return `${space.name} ${isReserved ? '(Reserved)' : '(Available)'}`;
  };

  const renderHexagons = () => {
    const hexagons = [];
    
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const space = findSpaceAtPosition(col, row);
        const isReserved = space ? isSpaceReserved(space.id) : false;
        const hexKey = `${col}-${row}`;
        const isSelected = selectedHexagons.has(hexKey);
        
        // Calculate position with offset for odd rows
        const xPos = col * horizontalSpacing + (row % 2) * (horizontalSpacing / 2);
        const yPos = row * verticalSpacing * 0.75;
        
        const color = getHexColor ? 
          getHexColor(col, row, space, isReserved) : 
          getDefaultHexColor(col, row, space, isReserved);
          
        const title = getHexTitle ? 
          getHexTitle(col, row, space, isReserved) : 
          getDefaultHexTitle(col, row, space, isReserved);

        hexagons.push(
          <div
            key={hexKey}
            style={{
              position: 'absolute',
              left: `${xPos}px`,
              top: `${yPos}px`,
            }}
          >
            <Hexagon
              size={hexSize}
              color={color}
              borderColor={isSelected ? '#f59e0b' : '#d1d5db'}
              borderWidth={isSelected ? 3 : 1}
              isSelected={isSelected}
              title={title}
              onClick={() => onHexClick?.(col, row, space)}
              onDoubleClick={() => onHexDoubleClick?.(col, row, space)}
              onContextMenu={(e) => onHexRightClick?.(e, col, row, space)}
            >
              {space && (
                <span className="text-white text-xs font-bold drop-shadow">
                  {space.name.charAt(0)}
                </span>
              )}
            </Hexagon>
          </div>
        );
      }
    }
    
    return hexagons;
  };

  // Calculate container dimensions
  const containerWidth = (width - 1) * horizontalSpacing + hexWidth + (height > 1 ? horizontalSpacing / 2 : 0);
  const containerHeight = height * verticalSpacing * 0.75 + hexHeight * 0.25;

  return (
    <div 
      className="relative border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden"
      style={{
        width: `${containerWidth}px`,
        height: `${containerHeight}px`,
        minWidth: '400px',
        minHeight: '300px'
      }}
    >
      {renderHexagons()}
    </div>
  );
};

export default HexagonGrid;
