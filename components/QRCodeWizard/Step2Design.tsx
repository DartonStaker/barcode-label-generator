'use client';

import { useState } from 'react';
import QRCodeEnhanced from '../QRCodeEnhanced';
import { QRCodeDesign, QRCodeFrameStyle, QRCodeShape, QRCodeLogoType } from '@/lib/qrCode';

interface Step2DesignProps {
  design: QRCodeDesign;
  onDesignChange: (design: QRCodeDesign) => void;
  qrValue: string;
}

type DesignTab = 'frame' | 'shape' | 'logo';

const FRAME_STYLES: { value: QRCodeFrameStyle; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '✕' },
  { value: 'rounded', label: 'Rounded', icon: '▢' },
  { value: 'circular', label: 'Circular', icon: '○' },
  { value: 'scan_me', label: 'Scan Me', icon: '📱' },
  { value: 'scan_me_simple', label: 'Scan Me Simple', icon: '📱' },
  { value: 'scan_me_qr', label: 'Scan Me QR', icon: '📱' },
  { value: 'scan_me_menu', label: 'Scan Me Menu', icon: '📱' },
];

const SHAPES: { value: QRCodeShape; label: string }[] = [
  { value: 'square', label: 'Square' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'dots', label: 'Dots' },
  { value: 'extra_rounded', label: 'Extra Rounded' },
];

const LOGO_TYPES: { value: QRCodeLogoType; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '✕' },
  { value: 'upload', label: 'Upload', icon: '📤' },
  { value: 'link', label: 'Link', icon: '🔗' },
  { value: 'location', label: 'Location', icon: '📍' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'wifi', label: 'WiFi', icon: '📶' },
  { value: 'contact', label: 'Contact', icon: '👤' },
  { value: 'paypal', label: 'PayPal', icon: '💳' },
  { value: 'bitcoin', label: 'Bitcoin', icon: '₿' },
  { value: 'scan_me', label: 'Scan Me', icon: '📱' },
  { value: 'scan_me_text', label: 'Scan Me Text', icon: '📱' },
  { value: 'scan_me_icon', label: 'Scan Me Icon', icon: '📱' },
];

export default function QRCodeStep2({ design, onDesignChange, qrValue }: Step2DesignProps) {
  const [activeTab, setActiveTab] = useState<DesignTab>('frame');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const handleDesignUpdate = (updates: Partial<QRCodeDesign>) => {
    onDesignChange({ ...design, ...updates });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        handleDesignUpdate({ logoType: 'upload', logoUrl: result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left: Design Options */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            2
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Design your QR Code</h2>
            <p className="text-sm text-gray-600">Customize the appearance of your QR code</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('frame')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'frame'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Frame
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('shape')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'shape'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Shape
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'logo'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Logo
          </button>
        </div>

        {/* Frame Tab */}
        {activeTab === 'frame' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Frame Style</h3>
            <div className="grid grid-cols-3 gap-3">
              {FRAME_STYLES.map((frame) => (
                <button
                  key={frame.value}
                  type="button"
                  onClick={() => handleDesignUpdate({ frameStyle: frame.value })}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    design.frameStyle === frame.value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-2">{frame.icon}</div>
                  <div className="text-xs font-medium">{frame.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foreground Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={design.foregroundColor}
                    onChange={(e) => handleDesignUpdate({ foregroundColor: e.target.value })}
                    className="w-12 h-12 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={design.foregroundColor}
                    onChange={(e) => handleDesignUpdate({ foregroundColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={design.backgroundColor}
                    onChange={(e) => handleDesignUpdate({ backgroundColor: e.target.value })}
                    className="w-12 h-12 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={design.backgroundColor}
                    onChange={(e) => handleDesignUpdate({ backgroundColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shape Tab */}
        {activeTab === 'shape' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Shape</h3>
            <div className="grid grid-cols-2 gap-3">
              {SHAPES.map((shape) => (
                <button
                  key={shape.value}
                  type="button"
                  onClick={() => handleDesignUpdate({ shape: shape.value })}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    design.shape === shape.value
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{shape.label}</div>
                </button>
              ))}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Error Correction Level</label>
              <select
                value={design.errorCorrectionLevel}
                onChange={(e) => handleDesignUpdate({ errorCorrectionLevel: e.target.value as 'L' | 'M' | 'Q' | 'H' })}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="L">Low (L) - ~7%</option>
                <option value="M">Medium (M) - ~15%</option>
                <option value="Q">Quartile (Q) - ~25%</option>
                <option value="H">High (H) - ~30%</option>
              </select>
            </div>
          </div>
        )}

        {/* Logo Tab */}
        {activeTab === 'logo' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Upload Logo</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose File</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
              <p className="mt-1 text-xs text-gray-500">No file chosen</p>
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Or choose from here</h3>
              <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
                {LOGO_TYPES.map((logo) => (
                  <button
                    key={logo.value}
                    type="button"
                    onClick={() => handleDesignUpdate({ logoType: logo.value })}
                    className={`p-3 border-2 rounded-lg text-center transition-all ${
                      design.logoType === logo.value
                        ? 'border-purple-600 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xl mb-1">{logo.icon}</div>
                    <div className="text-xs">{logo.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {design.logoType !== 'none' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo Size</label>
                <input
                  type="range"
                  min="20"
                  max="80"
                  value={design.logoSize || 40}
                  onChange={(e) => handleDesignUpdate({ logoSize: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-center mt-1">{design.logoSize || 40}px</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Preview */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
        <div className="bg-gray-50 rounded-lg p-6 border-2 border-dashed border-gray-300 flex flex-col items-center">
          {qrValue ? (
            <QRCodeEnhanced value={qrValue} size={240} design={design} />
          ) : (
            <div className="text-center text-gray-400 py-12">
              <p>Complete Step 1 to see preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

