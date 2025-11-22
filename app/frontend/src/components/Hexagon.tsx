import React from 'react';

interface HexagonProps {
  size?: number;
  color?: string;
  borderColor?: string;
  borderWidth?: number;
  className?: string;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onDoubleClick?: () => void;
  title?: string;
  children?: React.ReactNode;
  isSelected?: boolean;
  isHovered?: boolean;
}

const Hexagon: React.FC<HexagonProps> = ({
  size = 30,
  color = '#ffffff',
  borderColor = '#e5e7eb',
  borderWidth = 1,
  className = '',
  onClick,
  onContextMenu,
  onDoubleClick,
  title,
  children,
  isSelected = false,
  isHovered = false
}) => {
  // Hexagon path calculation
  const width = size * 2;
  const height = size * Math.sqrt(3);
  const points = [
    [size * 0.5, 0],
    [size * 1.5, 0],
    [size * 2, size * Math.sqrt(3) * 0.5],
    [size * 1.5, size * Math.sqrt(3)],
    [size * 0.5, size * Math.sqrt(3)],
    [0, size * Math.sqrt(3) * 0.5]
  ].map(point => point.join(',')).join(' ');

  const selectedStyle = isSelected ? {
    filter: 'brightness(1.3) drop-shadow(0 0 8px rgba(245, 158, 11, 0.8))',
    transform: 'scale(1.1)',
    zIndex: 10
  } : {};

  const hoveredStyle = isHovered ? {
    filter: 'brightness(1.1)',
    transform: 'scale(1.02)'
  } : {};

  return (
    <div
      className={`relative inline-block cursor-pointer transition-all duration-300 ease-in-out ${className} ${isSelected ? 'animate-pulse' : ''}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        ...selectedStyle,
        ...hoveredStyle
      }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      title={title}
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0"
      >
        <polygon
          points={points}
          fill={color}
          stroke={borderColor}
          strokeWidth={borderWidth}
          className={`transition-all duration-300 ${isSelected ? 'drop-shadow-lg' : ''}`}
          style={isSelected ? {
            filter: 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.9))'
          } : {}}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium pointer-events-none">
          {children}
        </div>
      )}
    </div>
  );
};

export default Hexagon;
