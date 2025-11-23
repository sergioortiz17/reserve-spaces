import React, { useState, useEffect } from 'react';
import { Plus, Grid3X3, Save, Square, Users, Coffee, Trash2, List, Edit, Calendar, X, Ban, Download, Upload } from 'lucide-react';
import { useOfficeMap } from '../hooks/useOfficeMap';
import toast from 'react-hot-toast';
import type { MapSpace } from '../types';
import HexagonGrid from '../components/HexagonGrid';
import { exportMapToCSV, parseCSVToSpaces, downloadCSV, readCSVFile } from '../utils/csvUtils';
import { useTranslation } from 'react-i18next';

const MapBuilder: React.FC = () => {
  const { t } = useTranslation();
  const { maps, currentMap, createNewMap, updateCurrentMap, deleteMapById, setCurrentMap, loading } = useOfficeMap();
  const [isCreating, setIsCreating] = useState(false);
  const [showMapsList, setShowMapsList] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'workstation' | 'meeting_room' | 'cubicle' | 'invalid_space'>('workstation');
  const [spaces, setSpaces] = useState<MapSpace[]>(currentMap?.json_data?.spaces || []);
  const [mapName, setMapName] = useState('');
  const [mapDescription, setMapDescription] = useState('');
  const [selectedHexagons, setSelectedHexagons] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const gridWidth = 20;
  const gridHeight = 15;
  const cellSize = 40;

  // Update spaces when currentMap changes
  useEffect(() => {
    if (currentMap) {
      setSpaces(currentMap.json_data?.spaces || []);
    }
  }, [currentMap]);

  const handleSelectMap = (map: any) => {
    setCurrentMap(map);
    setShowMapsList(false);
  };

  const handleDeleteMap = async (mapId: string, mapName: string) => {
    if (!confirm(t('mapBuilder.confirmDelete', { mapName }))) {
      return;
    }

    try {
      await deleteMapById(mapId);
      toast.success(t('mapBuilder.mapDeleted'));
    } catch (error) {
      toast.error(t('mapBuilder.failedToDelete'));
    }
  };

  const handleCreateNewMap = async () => {
    if (!mapName.trim()) {
      toast.error('Please enter a map name');
      return;
    }

    try {
      const mapData = {
        name: mapName,
        description: mapDescription || 'Office layout',
        json_data: {
          grid: {
            width: gridWidth,
            height: gridHeight,
            cellSize: cellSize
          },
          spaces: []
        }
      };

      await createNewMap(mapData);
      setSpaces([]);
      setMapName('');
      setMapDescription('');
      setIsCreating(false);
      toast.success('Map created successfully!');
    } catch (error) {
      toast.error('Failed to create map');
    }
  };

  const handleSaveMap = async () => {
    if (!currentMap) return;

    try {
      const updatedData = {
        ...currentMap,
        json_data: {
          ...currentMap.json_data,
          spaces: spaces
        }
      };

      await updateCurrentMap(currentMap.id, updatedData);
      toast.success('Map saved successfully!');
    } catch (error) {
      toast.error('Failed to save map');
    }
  };

  const handleExportMap = () => {
    if (!currentMap) {
      toast.error('No map selected to export');
      return;
    }

    try {
      const csvContent = exportMapToCSV(currentMap);
      const filename = `${currentMap.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_map.csv`;
      downloadCSV(csvContent, filename);
      toast.success(t('export.mapExportedSuccessfully'));
    } catch (error) {
      console.error('Export error:', error);
      toast.error(t('export.failedToExportMap'));
    }
  };

  const handleImportMap = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      toast.error(t('import.noFileSelected'));
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    try {
      const csvContent = await readCSVFile(file);
      const importedSpaces = parseCSVToSpaces(csvContent);
      
      setSpaces(importedSpaces);
      
      // Save to backend if we have a current map
      if (currentMap) {
        await updateCurrentMap(currentMap.id, {
          name: currentMap.name,
          description: currentMap.description,
          json_data: {
            ...currentMap.json_data,
            spaces: importedSpaces
          }
        });
      }
      
      toast.success(t('import.mapImportedSuccessfully'));
    } catch (error) {
      console.error('Import error:', error);
      toast.error(t('import.csvFormatError', { error: (error as Error).message }));
    }

    // Reset file input
    event.target.value = '';
  };

  const handleHexClick = (x: number, y: number) => {
    if (!currentMap) return;
    
    const hexKey = `${x}-${y}`;
    
    if (isSelecting) {
      // Multi-selection mode
      const newSelected = new Set(selectedHexagons);
      if (newSelected.has(hexKey)) {
        newSelected.delete(hexKey);
      } else {
        newSelected.add(hexKey);
      }
      setSelectedHexagons(newSelected);
    } else {
      // Single click mode - toggle space
      const existingSpace = spaces.find(space => 
        x >= space.x && x < space.x + space.width &&
        y >= space.y && y < space.y + space.height
      );

      if (existingSpace) {
        // Remove existing space
        setSpaces(prev => prev.filter(space => space.id !== existingSpace.id));
        return;
      }

      // Add single hexagon space
      createSpaceFromHexagons(new Set([hexKey]));
    }
  };

  const createSpaceFromHexagons = (hexagons: Set<string>) => {
    if (hexagons.size === 0) return;

    // Convert hex keys to coordinates
    const coords = Array.from(hexagons).map(key => {
      const [x, y] = key.split('-').map(Number);
      return { x, y };
    });

    // Find bounding box
    const minX = Math.min(...coords.map(c => c.x));
    const minY = Math.min(...coords.map(c => c.y));
    const maxX = Math.max(...coords.map(c => c.x));
    const maxY = Math.max(...coords.map(c => c.y));

    // Generate a proper UUID for the space
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Create new space
    const newSpace: MapSpace = {
      id: generateUUID(),
      type: selectedTool,
      name: `${selectedTool.replace('_', ' ')} ${spaces.length + 1}`,
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };

    setSpaces(prev => [...prev, newSpace]);
  };

  const handleCreateFromSelection = () => {
    if (selectedHexagons.size > 0) {
      createSpaceFromHexagons(selectedHexagons);
      setSelectedHexagons(new Set());
      setIsSelecting(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedHexagons(new Set());
    setIsSelecting(false);
  };

  // Removed getSpaceColor as it's no longer needed with hexagons

  const getHexColor = (_x: number, _y: number, space?: any) => {
    if (!space) return '#f9fafb'; // Empty space - light gray
    
    // Space colors by type
    switch (space.type) {
      case 'workstation': return '#3b82f6'; // Blue
      case 'meeting_room': return '#10b981'; // Green
      case 'cubicle': return '#8b5cf6'; // Purple
      case 'invalid_space': return '#374151'; // Dark gray - matches dark mode background
      default: return '#6b7280'; // Gray
    }
  };

  const getHexTitle = (_x: number, _y: number, space?: any) => {
    if (!space) return `Add ${selectedTool}`;
    return space.name;
  };

  const renderGrid = () => {
    return (
      <div className="flex justify-center">
        <HexagonGrid
          width={gridWidth}
          height={gridHeight}
          hexSize={18}
          spaces={spaces}
          onHexClick={handleHexClick}
          getHexColor={getHexColor}
          getHexTitle={getHexTitle}
          selectedHexagons={selectedHexagons}
        />
      </div>
    );
  };

  if (isCreating) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create New Map</h1>
            <p className="text-gray-600 dark:text-gray-400">Set up your office layout</p>
          </div>
        </div>

        <div className="card p-6 max-w-md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Map Name *
              </label>
              <input
                type="text"
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                className="input"
                placeholder="e.g., Main Office Floor"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={mapDescription}
                onChange={(e) => setMapDescription(e.target.value)}
                className="input"
                rows={3}
                placeholder="Describe your office layout..."
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleCreateNewMap}
                disabled={loading}
                className="btn btn-primary flex-1"
              >
                {loading ? 'Creating...' : 'Create Map'}
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showMapsList) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">All Maps</h1>
            <p className="text-gray-600 dark:text-gray-400">Select a map to edit or create a new one</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => setShowMapsList(false)}
              className="btn btn-secondary"
            >
              Back to Editor
            </button>
            <button 
              onClick={() => setIsCreating(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Map
            </button>
          </div>
        </div>

        {maps.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <Grid3X3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No maps found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create your first office map to get started.
              </p>
              <button 
                onClick={() => setIsCreating(true)}
                className="mt-4 btn btn-primary"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Map
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {maps.map(map => (
              <div key={map.id} className="card p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {map.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {map.description || 'No description'}
                    </p>
                    <div className="flex items-center text-xs text-gray-400 space-x-4">
                      <span className="flex items-center">
                        <Square className="h-3 w-3 mr-1" />
                        {map.json_data?.spaces?.length || 0} spaces
                      </span>
                      <span className="flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(map.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {currentMap?.id === map.id && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full">
                      Current
                    </span>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleSelectMap(map)}
                    className="btn btn-primary flex-1 text-sm"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setCurrentMap(map);
                      setShowMapsList(false);
                    }}
                    className="btn btn-secondary text-sm"
                  >
                    Select
                  </button>
                  <button
                    onClick={() => handleDeleteMap(map.id, map.name)}
                    className="btn bg-red-600 hover:bg-red-700 text-white text-sm p-2"
                    title={t('mapBuilder.deleteMap')}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!currentMap) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
          </div>
        </div>

        <div className="text-center py-12">
          <Grid3X3 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No office map selected</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {maps.length > 0 
              ? 'Select an existing map to edit or create a new one.'
              : 'Create your first office map to get started.'
            }
          </p>
          <div className="mt-4 flex justify-center space-x-3">
            {maps.length > 0 && (
              <button 
                onClick={() => setShowMapsList(true)}
                className="btn btn-secondary"
              >
                <List className="h-4 w-4 mr-2" />
                View All Maps ({maps.length})
              </button>
            )}
            <button 
              onClick={() => setIsCreating(true)}
              className="btn btn-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg">
        <p><strong>Debug:</strong> Maps loaded: {maps.length}, Current map: {currentMap?.name || 'None'}, Loading: {loading.toString()}</p>
      </div>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 dark:text-gray-400">Editing: {currentMap.name}</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowMapsList(true)}
            className="btn btn-secondary"
          >
            <List className="h-4 w-4 mr-2" />
            All Maps ({maps.length})
          </button>
          <button 
            onClick={() => setIsCreating(true)}
            className="btn btn-secondary"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Map
          </button>
          <button
            onClick={handleSaveMap}
            disabled={loading}
            className="btn btn-primary"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Map'}
          </button>
          
          <button
            onClick={handleExportMap}
            disabled={!currentMap}
            className="btn btn-secondary"
            title={t('export.exportToCSV')}
          >
            <Download className="h-4 w-4 mr-2" />
            {t('export.exportMap')}
          </button>
          
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleImportMap}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              id="csv-import"
            />
            <button
              className="btn btn-secondary"
              title={t('import.importFromCSV')}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('import.importMap')}
            </button>
          </div>
        </div>
      </div>

      {/* Tools */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tools</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTool('workstation')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              selectedTool === 'workstation' 
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Square className="h-4 w-4 mr-1 inline" />
            Workstation
          </button>
          <button
            onClick={() => setSelectedTool('meeting_room')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              selectedTool === 'meeting_room' 
                ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="h-4 w-4 mr-1 inline" />
            Meeting Room
          </button>
          <button
            onClick={() => setSelectedTool('cubicle')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              selectedTool === 'cubicle' 
                ? 'bg-purple-100 text-purple-700 border-2 border-purple-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Coffee className="h-4 w-4 mr-1 inline" />
            Cubicle
          </button>
          <button
            onClick={() => setSelectedTool('invalid_space')}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              selectedTool === 'invalid_space' 
                ? 'bg-gray-200 text-gray-800 border-2 border-gray-400' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Ban className="h-4 w-4 mr-1 inline" />
            Invalid Space
          </button>
          <div className="border-l border-gray-300 mx-2"></div>
          <button
            onClick={() => setIsSelecting(!isSelecting)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              isSelecting 
                ? 'bg-orange-100 text-orange-700 border-2 border-orange-300' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Grid3X3 className="h-4 w-4 mr-1 inline" />
            Multi-Select {isSelecting ? '(ON)' : '(OFF)'}
          </button>
          {isSelecting && selectedHexagons.size > 0 && (
            <>
              <button
                onClick={handleCreateFromSelection}
                className="px-3 py-2 rounded-md text-sm font-medium bg-green-100 text-green-700 hover:bg-green-200"
              >
                <Plus className="h-4 w-4 mr-1 inline" />
                Create Space ({selectedHexagons.size} hexagons)
              </button>
              <button
                onClick={handleCancelSelection}
                className="px-3 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                <X className="h-4 w-4 mr-1 inline" />
                Cancel
              </button>
            </>
          )}
          <div className="border-l border-gray-300 mx-2"></div>
          <button
            onClick={() => setSpaces([])}
            className="px-3 py-2 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
          >
            <Trash2 className="h-4 w-4 mr-1 inline" />
            Clear All
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="card p-6">
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Office Layout ({spaces.length} spaces)
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isSelecting 
              ? `Multi-select mode: Click hexagons to select, then create space (${selectedHexagons.size} selected)`
              : `Click to add ${selectedTool.replace('_', ' ')}, click existing space to remove`
            }
          </p>
        </div>
        {renderGrid()}
      </div>

      {/* Legend */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Legend</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center">
            <svg width="16" height="14" className="mr-2">
              <polygon 
                points="2,0 6,0 8,3.5 6,7 2,7 0,3.5" 
                fill="#3b82f6" 
                stroke="#d1d5db" 
                strokeWidth="0.5"
              />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">Workstation</span>
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
            <span className="text-sm text-gray-600 dark:text-gray-400">Meeting Room</span>
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
            <span className="text-sm text-gray-600 dark:text-gray-400">Cubicle</span>
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
            <span className="text-sm text-gray-600 dark:text-gray-400">Invalid Space</span>
          </div>
          <div className="flex items-center">
            <svg width="16" height="14" className="mr-2">
              <polygon 
                points="2,0 6,0 8,3.5 6,7 2,7 0,3.5" 
                fill="#f9fafb" 
                stroke="#f59e0b" 
                strokeWidth="2"
              />
            </svg>
            <span className="text-sm text-gray-600 dark:text-gray-400">Selected</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapBuilder;