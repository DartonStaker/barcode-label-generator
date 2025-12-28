'use client';

import { useState, useRef, useEffect } from 'react';
import QRCode from './QRCode';
import { QRCode as QRCodeType, formatRelativeTime, getQRCodeTypeLabel, getQRCodeStatusLabel } from '@/lib/qrCode';

interface QRCodeCardProps {
  qrCode: QRCodeType;
  onEdit: (qrCode: QRCodeType) => void;
  onDelete: (id: string) => void;
  onDuplicate: (qrCode: QRCodeType) => void;
  baseUrl?: string;
}

export default function QRCodeCard({ qrCode, onEdit, onDelete, onDuplicate, baseUrl = 'https://apparely.co.za' }: QRCodeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const shortUrl = `${baseUrl}/qr/${qrCode.short_url}`;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'inactive':
        return 'bg-gray-100 text-gray-700';
      case 'archived':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'url':
        return 'bg-blue-100 text-blue-700';
      case 'discount':
        return 'bg-purple-100 text-purple-700';
      case 'text':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-purple-100 text-purple-700';
    }
  };

  return (
    <div className="bg-purple-50 rounded-lg border border-purple-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{qrCode.title}</h3>
          <div className="flex flex-wrap gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(qrCode.status)}`}>
              {getQRCodeStatusLabel(qrCode.status).toLowerCase()}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(qrCode.type)}`}>
              {getQRCodeTypeLabel(qrCode.type).toLowerCase()}
            </span>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded"
            aria-label="More options"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
              <div className="py-1">
                <button
                  type="button"
                  onClick={() => {
                    onEdit(qrCode);
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDuplicate(qrCode);
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${qrCode.title}"?`)) {
                      onDelete(qrCode.id);
                    }
                    setMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center mb-4">
        <QRCode value={qrCode.payload} size={180} fgColor="#9333ea" />
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium text-gray-700">Short URL:</span>{' '}
          <div className="flex items-center gap-2 mt-1">
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 hover:underline break-all"
            >
              {shortUrl}
            </a>
            <button
              type="button"
              onClick={handleCopyUrl}
              className="text-purple-600 hover:text-purple-700 focus:outline-none"
              title="Copy URL"
            >
              {copied ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <div>
          <span className="font-medium text-gray-700">Scans:</span> <span className="text-gray-600">{qrCode.scans}</span>
        </div>
        <div className="text-gray-500 text-xs">{formatRelativeTime(qrCode.created_at)}</div>
      </div>
    </div>
  );
}

