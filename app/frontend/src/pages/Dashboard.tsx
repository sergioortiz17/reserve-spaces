import React from 'react';
import { Calendar, Users, MapPin, Clock, Building2 } from 'lucide-react';
import { useOfficeMap } from '../hooks/useOfficeMap';
import { useReservations } from '../hooks/useReservations';

const Dashboard: React.FC = () => {
  const { maps, currentMap, loading: mapsLoading, error: mapsError } = useOfficeMap();
  const { reservations, loading: reservationsLoading, error: reservationsError } = useReservations();

  // Calculate stats
  const totalSpaces = currentMap?.json_data?.spaces?.length || 0;
  const todayReservations = reservations.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.date === today;
  }).length;

  if (mapsLoading || reservationsLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6">
              <div className="animate-pulse">
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mapsError || reservationsError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Office space reservations overview</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <p className="text-red-800 dark:text-red-200">
            Error loading data: {mapsError || reservationsError}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Office space reservations overview
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Spaces</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalSpaces}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Reservations</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{todayReservations}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Maps</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{maps.length}</p>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Reservations</p>
              <p className="text-2xl font-bold text-gray-900">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Office Map Placeholder */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Office Map
        </h2>
        <div className="bg-gray-100 rounded-lg p-8 text-center">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">
            Interactive office map will be displayed here
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Connect to backend to load office data
          </p>
        </div>
      </div>

      {/* Recent Reservations */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Reservations
        </h2>
        <p className="text-gray-500 text-center py-4">
          No reservations found
        </p>
      </div>
    </div>
  );
};

export default Dashboard;