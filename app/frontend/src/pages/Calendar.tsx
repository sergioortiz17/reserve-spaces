import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

const Calendar: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar View</h1>
          <p className="text-gray-600">
            Weekly reservation calendar
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="btn btn-secondary">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="btn btn-secondary">
            Today
          </button>
          <button className="btn btn-secondary">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Calendar Placeholder */}
      <div className="card p-6">
        <div className="text-center py-12">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Calendar View</h3>
          <p className="mt-1 text-sm text-gray-500">
            Weekly calendar view will be displayed here
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Legend</h2>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-primary-50 border border-primary-200 rounded mr-2"></div>
            <span>Today</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 rounded mr-2"></div>
            <span>Reserved</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-white border border-gray-200 rounded mr-2"></div>
            <span>Available</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calendar;