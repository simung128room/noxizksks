import React, { useState, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2 } from 'lucide-react';

interface ImageViewerModalProps {
  imageUrl: string | null;
  imageName?: string;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  imageUrl,
  imageName = 'Image',
  onClose,
}) => {
  const [scale, setScale] = useState(1);
  const [hasError, setHasError] = useState(false);

  // Reset zoom and error on image change
  useEffect(() => {
    setScale(1);
    setHasError(false);
  }, [imageUrl]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.3, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.3, 0.5));
  const handleResetZoom = () => setScale(1);

  const handleDownload = useCallback(() => {
    if (!imageUrl) return;
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = imageName || 'downloaded-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageUrl, imageName]);

  if (!imageUrl) return null;

  return (
    <div
      id="image-viewer-backdrop"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header Controls */}
      <div className="w-full max-w-5xl flex items-center justify-between z-10 py-2 text-white">
        <div className="flex items-center gap-2 max-w-[60%]">
          <span className="font-medium text-sm sm:text-base truncate">
            {imageName}
          </span>
          <span className="text-xs text-neutral-400 bg-neutral-800/80 px-2 py-0.5 rounded-full border border-neutral-700/60 shrink-0">
            {Math.round(scale * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <button
            id="btn-zoom-out"
            onClick={handleZoomOut}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/60 transition-all active:scale-95"
            title="ย่อขนาด (-)"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            id="btn-zoom-reset"
            onClick={handleResetZoom}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/60 transition-all active:scale-95"
            title="รีเซ็ตขนาด (100%)"
            aria-label="Reset zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="btn-zoom-in"
            onClick={handleZoomIn}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/60 transition-all active:scale-95"
            title="ขยายขนาด (+)"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Download button */}
          <button
            id="btn-download-image"
            onClick={handleDownload}
            className="p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700/60 transition-all active:scale-95"
            title="ดาวน์โหลดรูปภาพ"
            aria-label="Download image"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Close button */}
          <button
            id="btn-close-image-viewer"
            onClick={onClose}
            className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white border border-red-500/30 transition-all active:scale-95 ml-1"
            title="ปิด (Esc)"
            aria-label="Close image viewer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="flex-1 w-full flex items-center justify-center overflow-hidden cursor-zoom-in my-2"
        onClick={() => !hasError && setScale((s) => (s > 1 ? 1 : 1.8))}
      >
        {!hasError ? (
          <img
            src={imageUrl}
            alt={imageName}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            style={{
              transform: `scale(${scale})`,
              transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="max-h-[82vh] max-w-[92vw] object-contain rounded-lg shadow-2xl"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-neutral-300 bg-neutral-900/80 rounded-2xl border border-neutral-800">
            <p className="text-sm font-medium mb-1">ไม่สามารถโหลดรูปภาพได้</p>
            <p className="text-xs text-neutral-400">รูปภาพอาจหมดอายุ หรือที่อยู่ไม่ถูกต้อง</p>
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="text-center text-xs text-neutral-400 py-1 select-none">
        คลิกที่รูปเพื่อซูมเข้า/ออก • กด ESC เพื่อปิด
      </div>
    </div>
  );
};
