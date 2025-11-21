import type { MapSpace, OfficeMap } from '../types';

// CSV Headers
const CSV_HEADERS = [
  'id',
  'name', 
  'type',
  'x',
  'y',
  'width',
  'height'
];

/**
 * Export map spaces to CSV format
 */
export const exportMapToCSV = (map: OfficeMap): string => {
  if (!map || !map.json_data?.spaces) {
    throw new Error('Invalid map data');
  }

  const spaces = map.json_data.spaces;
  
  // Create CSV header
  const csvHeader = CSV_HEADERS.join(',');
  
  // Create CSV rows
  const csvRows = spaces.map(space => {
    return [
      space.id || '',
      `"${space.name || ''}"`, // Wrap in quotes to handle commas in names
      space.type || '',
      space.x?.toString() || '0',
      space.y?.toString() || '0',
      space.width?.toString() || '1',
      space.height?.toString() || '1'
    ].join(',');
  });
  
  // Combine header and rows
  return [csvHeader, ...csvRows].join('\n');
};

/**
 * Parse CSV content and return map spaces
 */
export const parseCSVToSpaces = (csvContent: string): MapSpace[] => {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV must contain at least a header and one data row');
  }
  
  const header = lines[0].split(',').map(h => h.trim());
  
  // Validate header
  const requiredHeaders = ['name', 'type', 'x', 'y'];
  const missingHeaders = requiredHeaders.filter(h => !header.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }
  
  const spaces: MapSpace[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = parseCSVLine(line);
    
    if (values.length !== header.length) {
      throw new Error(`Row ${i} has ${values.length} values but expected ${header.length}`);
    }
    
    const space: MapSpace = {
      id: values[header.indexOf('id')] || generateId(),
      name: values[header.indexOf('name')] || `Space ${i}`,
      type: values[header.indexOf('type')] as 'workstation' | 'meeting_room' | 'cubicle' | 'invalid_space',
      x: parseInt(values[header.indexOf('x')]) || 0,
      y: parseInt(values[header.indexOf('y')]) || 0,
      width: parseInt(values[header.indexOf('width')]) || 1,
      height: parseInt(values[header.indexOf('height')]) || 1
    };
    
    // Validate space type
    const validTypes = ['workstation', 'meeting_room', 'cubicle', 'invalid_space'];
    if (!validTypes.includes(space.type)) {
      throw new Error(`Invalid space type "${space.type}" in row ${i}. Valid types: ${validTypes.join(', ')}`);
    }
    
    spaces.push(space);
  }
  
  return spaces;
};

/**
 * Parse a CSV line handling quoted values
 */
const parseCSVLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
};

/**
 * Generate a simple ID for spaces without one
 */
const generateId = (): string => {
  return 'space-' + Math.random().toString(36).substr(2, 9);
};

/**
 * Download CSV content as a file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Read CSV file content
 */
export const readCSVFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(content);
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
};
