import { useState, useEffect } from 'react';
import { getMaps, getMap, createMap, updateMap } from '../utils/api';
import type { OfficeMap } from '../types';

export const useOfficeMap = () => {
  const [maps, setMaps] = useState<OfficeMap[]>([]);
  const [currentMap, setCurrentMap] = useState<OfficeMap | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMaps = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMaps();
      setMaps(data);
      if (data.length > 0 && !currentMap) {
        setCurrentMap(data[0]);
      }
    } catch (err) {
      console.error('Error fetching maps:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch maps');
    } finally {
      setLoading(false);
    }
  };

  const fetchMap = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMap(id);
      setCurrentMap(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch map');
    } finally {
      setLoading(false);
    }
  };

  const createNewMap = async (mapData: any) => {
    try {
      setLoading(true);
      setError(null);
      const newMap = await createMap(mapData);
      setMaps(prev => [...prev, newMap]);
      setCurrentMap(newMap);
      return newMap;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create map');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentMap = async (id: string, mapData: any) => {
    try {
      setLoading(true);
      setError(null);
      const updatedMap = await updateMap(id, mapData);
      setMaps(prev => prev.map(map => map.id === id ? updatedMap : map));
      setCurrentMap(updatedMap);
      return updatedMap;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update map');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaps();
  }, []);

  return {
    maps,
    currentMap,
    loading,
    error,
    fetchMaps,
    fetchMap,
    createNewMap,
    updateCurrentMap,
    setCurrentMap,
  };
};
