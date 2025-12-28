'use client';

import { useState, useEffect, useCallback } from 'react';
import QRCodeCard from './QRCodeCard';
import QRCodeFilters, { QRCodeFilters as QRCodeFiltersType } from './QRCodeFilters';
import QRCodeWizard from './QRCodeWizard';
import {
  getQRCodesFromSupabase,
  createQRCodeInSupabase,
  updateQRCodeInSupabase,
  deleteQRCodeFromSupabase,
} from '@/lib/supabase/qrCodes';
import { QRCode, QRCodeType, QRCodeStatus, QRCodeDesign } from '@/lib/qrCode';

export default function QRCodeDashboard() {
  const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<QRCodeFiltersType>({
    search: '',
    status: 'all',
    type: 'all',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQRCode, setEditingQRCode] = useState<QRCode | null>(null);

  const loadQRCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getQRCodesFromSupabase(filters);
      setQrCodes(data);
    } catch (err) {
      console.error('Failed to load QR codes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadQRCodes();
  }, [loadQRCodes]);

  const handleCreate = () => {
    setEditingQRCode(null);
    setIsModalOpen(true);
  };

  const handleEdit = (qrCode: QRCode) => {
    setEditingQRCode(qrCode);
    setIsModalOpen(true);
  };

  const handleSave = async (data: {
    title: string;
    type: QRCodeType;
    status: QRCodeStatus;
    payload: string;
    design_data?: QRCodeDesign;
    expiration_date?: string | null;
  }) => {
    try {
      if (editingQRCode) {
        await updateQRCodeInSupabase(editingQRCode.id, data);
      } else {
        await createQRCodeInSupabase(data);
      }
      await loadQRCodes();
    } catch (err) {
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQRCodeFromSupabase(id);
      await loadQRCodes();
    } catch (err) {
      console.error('Failed to delete QR code:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete QR code');
    }
  };

  const handleDuplicate = async (qrCode: QRCode) => {
    try {
      await createQRCodeInSupabase({
        title: `${qrCode.title} (Copy)`,
        type: qrCode.type,
        status: qrCode.status,
        payload: qrCode.payload,
      });
      await loadQRCodes();
    } catch (err) {
      console.error('Failed to duplicate QR code:', err);
      alert(err instanceof Error ? err.message : 'Failed to duplicate QR code');
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Codes</h1>
        <p className="text-gray-600">Create and manage QR codes for URLs and discount codes.</p>
      </div>

      <div className="mb-6 flex justify-end">
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create QR Code
        </button>
      </div>

      <QRCodeFilters filters={filters} onFiltersChange={setFilters} />

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-2 text-gray-600">Loading QR codes...</p>
        </div>
      ) : qrCodes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No QR codes</h3>
          <p className="mt-1 text-sm text-gray-500">
            {filters.search || filters.status !== 'all' || filters.type !== 'all'
              ? 'Try adjusting your filters.'
              : 'Get started by creating a new QR code.'}
          </p>
          {(!filters.search && filters.status === 'all' && filters.type === 'all') && (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create QR Code
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {qrCodes.map((qrCode) => (
            <QRCodeCard
              key={qrCode.id}
              qrCode={qrCode}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      )}

      <QRCodeWizard
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingQRCode(null);
        }}
        onSave={handleSave}
        qrCode={editingQRCode}
      />
    </div>
  );
}

