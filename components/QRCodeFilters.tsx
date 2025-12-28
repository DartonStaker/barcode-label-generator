'use client';

import { useState, useEffect } from 'react';
import { QRCodeType, QRCodeStatus, getQRCodeTypeLabel, getQRCodeStatusLabel } from '@/lib/qrCode';

export interface QRCodeFilters {
  search: string;
  status: QRCodeStatus | 'all';
  type: QRCodeType | 'all';
}

interface QRCodeFiltersProps {
  filters: QRCodeFilters;
  onFiltersChange: (filters: QRCodeFilters) => void;
}

const QR_CODE_TYPES: QRCodeType[] = ['url', 'discount', 'text', 'wifi', 'email', 'phone', 'sms', 'vcard'];
const QR_CODE_STATUSES: QRCodeStatus[] = ['active', 'inactive', 'archived'];

export default function QRCodeFiltersComponent({ filters, onFiltersChange }: QRCodeFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: searchValue });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleStatusChange = (status: QRCodeStatus | 'all') => {
    onFiltersChange({ ...filters, status });
  };

  const handleTypeChange = (type: QRCodeType | 'all') => {
    onFiltersChange({ ...filters, type });
  };

  const handleClearFilters = () => {
    setSearchValue('');
    onFiltersChange({ search: '', status: 'all', type: 'all' });
  };

  const hasActiveFilters = filters.search || filters.status !== 'all' || filters.type !== 'all';

  return (
    <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 mb-6">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="text-xs text-purple-600 hover:text-purple-700 underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              id="search"
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search by title or URL..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => handleStatusChange(e.target.value as QRCodeStatus | 'all')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm"
          >
            <option value="all">All statuses</option>
            {QR_CODE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {getQRCodeStatusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="type"
            value={filters.type}
            onChange={(e) => handleTypeChange(e.target.value as QRCodeType | 'all')}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500 text-sm"
          >
            <option value="all">All types</option>
            {QR_CODE_TYPES.map((type) => (
              <option key={type} value={type}>
                {getQRCodeTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

