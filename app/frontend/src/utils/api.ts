import axios from 'axios';
import type { OfficeMap, Space, Reservation } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

// Maps API
export const getMaps = async (): Promise<OfficeMap[]> => {
  const response = await api.get('/maps');
  return response.data;
};

export const getMap = async (id: string): Promise<OfficeMap> => {
  const response = await api.get(`/maps/${id}`);
  return response.data;
};

export const createMap = async (data: any): Promise<OfficeMap> => {
  const response = await api.post('/maps', data);
  return response.data;
};

export const updateMap = async (id: string, data: any): Promise<OfficeMap> => {
  const response = await api.put(`/maps/${id}`, data);
  return response.data;
};

// Spaces API
export const getSpaces = async (mapId?: string): Promise<Space[]> => {
  const params = mapId ? { map_id: mapId } : {};
  const response = await api.get('/spaces', { params });
  return response.data;
};

export const createSpace = async (data: any): Promise<Space> => {
  const response = await api.post('/spaces', data);
  return response.data;
};

export const updateSpace = async (id: string, data: any): Promise<Space> => {
  const response = await api.put(`/spaces/${id}`, data);
  return response.data;
};

export const deleteSpace = async (id: string): Promise<void> => {
  await api.delete(`/spaces/${id}`);
};

// Reservations API
export const getReservations = async (filters?: any): Promise<Reservation[]> => {
  const response = await api.get('/reservations', { params: filters });
  return response.data;
};

export const createReservation = async (data: any): Promise<Reservation> => {
  const response = await api.post('/reservations', data);
  return response.data;
};

export const deleteReservation = async (id: string): Promise<void> => {
  await api.delete(`/reservations/${id}`);
};

export default api;