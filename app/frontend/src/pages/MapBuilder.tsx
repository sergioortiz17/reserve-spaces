import React, { useState, useEffect } from 'react';
import { Plus, Grid3X3, Save, Square, Users, Coffee, Trash2, List, Edit, Calendar } from 'lucide-react';
import { useOfficeMap } from '../hooks/useOfficeMap';
import toast from 'react-hot-toast';
import type { MapSpace } from '../types';

const MapBuilder: React.FC = () => {
  const { maps, currentMap, createNewMap, updateCurrentMap, setCurrentMap, loading } = useOfficeMap();
  
  console.log('MapBuilder - maps count:', maps.length, 'currentMap:', currentMap?.name);
  
  // Debug: Force show maps info
  if (maps.length === 0) {
    console.log('No maps loaded yet, loading:', loading);
  }
  const [isCreating, setIsCreating] = useState(false);
  const [showMapsList, setShowMapsList] = useState(false);
  const [selectedTool, setSelectedTool] = useState<'workstation' | 'meeting_room' | 'cubicle'>('workstation');
  const [spaces, setSpaces] = useState<MapSpace[]>(currentMap?.json_data?.spaces || []);
  const [mapName, setMapName] = useState('');
  const [mapDescription, setMapDescription] = useState('');

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

  const handleCellClick = (x: number, y: number) => {
    if (!currentMap) return;

    // Check if there's already a space at this position
    const existingSpace = spaces.find(space => 
      x >= space.x && x < space.x + space.width &&
      y >= space.y && y < space.y + space.height
    );

    if (existingSpace) {
      // Remove existing space
      setSpaces(prev => prev.filter(space => space.id !== existingSpace.id));
      return;
    }

    // Generate a proper UUID for the space
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    // Add new space
    const newSpace: MapSpace = {
      id: generateUUID(),
      type: selectedTool,
      name: `${selectedTool.replace('_', ' ')} ${spaces.length + 1}`,
      x,
      y,
      width: selectedTool === 'meeting_room' ? 2 : 1,
      height: selectedTool === 'meeting_room' ? 2 : 1
    };

    setSpaces(prev => [...prev, newSpace]);
  };

  const getSpaceColor = (type: string) => {
    switch (type) {
      case 'workstation': return 'bg-blue-500';
      case 'meeting_room': return 'bg-green-500';
      case 'cubicle': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const renderGrid = () => {
    const cells = [];
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const space = spaces.find(space => 
          x >= space.x && x < space.x + space.width &&
          y >= space.y && y < space.y + space.height
        );

        cells.push(
          <div
            key={`${x}-${y}`}
            className={`
              w-10 h-10 border border-gray-200 cursor-pointer hover:bg-gray-100
              ${space ? `${getSpaceColor(space.type)} border-gray-400` : 'bg-white'}
            `}
            onClick={() => handleCellClick(x, y)}
            title={space ? space.name : `Add ${selectedTool}`}
          />
        );
      }
    }
    return cells;
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
            <h1 className="text-2xl font-bold text-gray-900">Map Builder</h1>
            <p className="text-gray-600">Design and manage your office layout</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Map Builder</h1>
          <p className="text-gray-600">Editing: {currentMap.name}</p>
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
        </div>
      </div>

      {/* Tools */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Tools</h3>
        <div className="flex space-x-2">
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
          <h3 className="text-sm font-medium text-gray-700">
            Office Layout ({spaces.length} spaces)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Click to add {selectedTool.replace('_', ' ')}, click existing space to remove
          </p>
        </div>
        <div 
          className="grid gap-0 border-2 border-gray-300 inline-block"
          style={{ 
            gridTemplateColumns: `repeat(${gridWidth}, 1fr)`,
            gridTemplateRows: `repeat(${gridHeight}, 1fr)`
          }}
        >
          {renderGrid()}
        </div>
      </div>

      {/* Legend */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Legend</h3>
        <div className="flex space-x-6">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Workstation</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Meeting Room</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
            <span className="text-sm text-gray-600">Cubicle</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapBuilder;