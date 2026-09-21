import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ExternalLink,
  Move,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUp,
  ChevronsDown,
  LocateFixed,
  MousePointer,
} from 'lucide-react';

interface ImageZoomLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  caption?: string;
}

export const ImageZoomLightbox: React.FC<ImageZoomLightboxProps> = ({
  isOpen,
  onClose,
  imageUrl,
  title,
  caption,
}) => {
  // Zoom level: 1 = fit to container, > 1 = zoomed in, < 1 = zoomed out
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [fitMode, setFitMode] = useState<'fit' | 'actual' | 'custom'>('fit');
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [wheelMode, setWheelMode] = useState<'scroll' | 'zoom'>('scroll');

  // Touch tracking for mobile/touchscreens
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state when a new image opens
  useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setFitMode('fit');
      setPanOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, imageUrl]);

  // Image load to measure native resolution
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({
      width: img.naturalWidth,
      height: img.naturalHeight,
    });
  };

  // Safe pan offset clamp helper to prevent image from escaping viewport
  const clampOffset = useCallback(
    (offset: { x: number; y: number }, zoom: number) => {
      const stage = containerRef.current?.getBoundingClientRect();
      const stageW = stage?.width || window.innerWidth;
      const stageH = stage?.height || window.innerHeight;

      // Generous bounds based on zoom scale
      const maxScrollX = Math.max(200, (stageW * zoom) / 2 + 100);
      const maxScrollY = Math.max(300, (stageH * zoom) / 2 + 200);

      return {
        x: Math.min(Math.max(offset.x, -maxScrollX), maxScrollX),
        y: Math.min(Math.max(offset.y, -maxScrollY), maxScrollY),
      };
    },
    []
  );

  const handleZoomIn = () => {
    setFitMode('custom');
    setZoomLevel((prev) => Math.min(prev + 0.25, 4.0));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  const handleResetFit = () => {
    setFitMode('fit');
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleActualSize = () => {
    setFitMode('actual');
    setZoomLevel(1.5); // high crispness scale for 100% text reading
    setPanOffset({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Incremental scroll / pan step functions
  const scrollByAmount = useCallback(
    (deltaX: number, deltaY: number) => {
      setPanOffset((prev) => clampOffset({ x: prev.x + deltaX, y: prev.y + deltaY }, zoomLevel));
    },
    [clampOffset, zoomLevel]
  );

  const scrollToTop = () => {
    const stageH = containerRef.current?.clientHeight || window.innerHeight;
    const targetY = Math.max(150, (stageH * zoomLevel) / 3);
    setPanOffset((prev) => ({ ...prev, y: targetY }));
  };

  const scrollToBottom = () => {
    const stageH = containerRef.current?.clientHeight || window.innerHeight;
    const targetY = -Math.max(150, (stageH * zoomLevel) / 3);
    setPanOffset((prev) => ({ ...prev, y: targetY }));
  };

  const centerImage = () => {
    setPanOffset({ x: 0, y: 0 });
  };

  // Keyboard navigation: arrows scroll up/down/left/right, +/- zoom
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetFit();
      } else if (e.key === '1') {
        e.preventDefault();
        handleActualSize();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollByAmount(0, 90);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollByAmount(0, -90);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollByAmount(90, 0);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollByAmount(-90, 0);
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        scrollByAmount(0, 260);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        scrollByAmount(0, -260);
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToTop();
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToBottom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, zoomLevel, onClose, scrollByAmount]);

  // Mouse wheel handler:
  // - If Ctrl/Cmd is held OR wheelMode === 'zoom': zoom in / out
  // - Otherwise: SCROLL the zoomed image UP/DOWN and LEFT/RIGHT!
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();

      // If user holds Ctrl/Cmd or mode is explicitly set to Zoom
      if (e.ctrlKey || e.metaKey || wheelMode === 'zoom') {
        const delta = e.deltaY > 0 ? -0.15 : 0.15;
        setFitMode('custom');
        setZoomLevel((prev) => Math.min(Math.max(prev + delta, 0.4), 4.0));
        return;
      }

      // If at default fit (1.0) and user scrolls down, auto-switch to zoomed view and scroll!
      if (zoomLevel === 1 && Math.abs(e.deltaY) > 5) {
        setFitMode('custom');
        setZoomLevel(1.4);
      }

      // Natural scroll: scrolling down on mouse wheel moves image UP so you can see lower content
      const scrollSpeed = 1.15;
      const moveY = -e.deltaY * scrollSpeed;
      const moveX = -(e.shiftKey ? e.deltaY : e.deltaX) * scrollSpeed;

      setPanOffset((prev) =>
        clampOffset(
          {
            x: prev.x + moveX,
            y: prev.y + moveY,
          },
          zoomLevel > 1 ? zoomLevel : 1.4
        )
      );
    },
    [wheelMode, zoomLevel, clampOffset]
  );

  // Pan / Drag handlers for mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    // Left mouse button only
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPanOffset(clampOffset({ x: newX, y: newY }, zoomLevel));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for tablets and mobile devices
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      touchStartRef.current = {
        x: touch.clientX - panOffset.x,
        y: touch.clientY - panOffset.y,
      };
    } else if (e.touches.length === 2) {
      // Pinch to zoom distance start
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartRef.current.dist = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const newX = touch.clientX - touchStartRef.current.x;
      const newY = touch.clientY - touchStartRef.current.y;
      setPanOffset(clampOffset({ x: newX, y: newY }, zoomLevel));
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const diff = (dist - touchStartRef.current.dist) / 150;
      touchStartRef.current.dist = dist;
      setFitMode('custom');
      setZoomLevel((prev) => Math.min(Math.max(prev + diff, 0.5), 4.0));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartRef.current.dist = undefined;
  };

  // Double click toggles between fit and zoomed
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      handleResetFit();
    } else {
      setFitMode('custom');
      setZoomLevel(1.75);
      // Center on clicked area if possible
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const clickX = e.clientX - rect.left - rect.width / 2;
        const clickY = e.clientY - rect.top - rect.height / 2;
        setPanOffset(clampOffset({ x: -clickX * 0.8, y: -clickY * 0.8 }, 1.75));
      }
    }
  };

  // Open raw image in new tab for 100% crisp browser rendering
  const handleOpenInNewTab = () => {
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title || 'High-Resolution Diagram'}</title>
            <style>
              body {
                margin: 0;
                background-color: #0f172a;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: system-ui, sans-serif;
                color: #e2e8f0;
              }
              img {
                max-width: 98vw;
                max-height: 94vh;
                object-fit: contain;
                border-radius: 8px;
                box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5);
                image-rendering: auto;
              }
              .caption {
                margin-top: 12px;
                font-size: 14px;
                color: #94a3b8;
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="Full Resolution" />
            ${caption ? `<div class="caption">${caption}</div>` : ''}
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      ref={containerRef}
      id="image-zoom-lightbox-modal"
      className="fixed inset-0 z-50 flex flex-col bg-slate-950/95 backdrop-blur-md select-none animate-in fade-in duration-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Floating Control Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 shrink-0 z-20 gap-2">
        <div className="flex items-center gap-2.5 truncate max-w-xs sm:max-w-md">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shrink-0 shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="truncate">
            <h4 className="text-xs font-bold text-white truncate">
              {title || caption || 'Question Diagram & Stimulus'}
            </h4>
            {naturalSize.width > 0 && (
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
                {naturalSize.width} × {naturalSize.height} px · Scroll mouse to move up/down
              </span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Wheel Mode Toggle: Scroll vs Zoom */}
          <button
            type="button"
            onClick={() => setWheelMode((m) => (m === 'scroll' ? 'zoom' : 'scroll'))}
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              wheelMode === 'scroll'
                ? 'bg-indigo-950/70 border-indigo-500/50 text-indigo-300 hover:bg-indigo-900/80'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Toggle whether mouse wheel scrolls the image or zooms (Ctrl+Wheel always zooms)"
          >
            <MousePointer className="h-3.5 w-3.5" />
            <span>Wheel: {wheelMode === 'scroll' ? 'Scroll Up/Down' : 'Zoom'}</span>
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>

          {/* Zoom Percent Pill */}
          <div className="px-2 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-xs font-mono font-bold text-indigo-300 min-w-[54px] text-center">
            {Math.round(zoomLevel * 100)}%
          </div>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Fit to Screen */}
          <button
            type="button"
            onClick={handleResetFit}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              fitMode === 'fit' && zoomLevel === 1
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Fit to Window (0)"
          >
            Fit Page
          </button>

          {/* Actual 100% / 150% Size */}
          <button
            type="button"
            onClick={handleActualSize}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              fitMode === 'actual' || zoomLevel >= 1.5
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="100% Crisp Pixel Resolution (1)"
          >
            100% Text
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer hidden sm:inline-flex"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>

          {/* Open in New Window */}
          <button
            type="button"
            onClick={handleOpenInNewTab}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            title="Open in New Tab"
          >
            <ExternalLink className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          {/* Close Modal */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors cursor-pointer shadow-xs ml-1"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Image Stage / Pan & Scroll Canvas */}
      <div
        className={`flex-1 relative overflow-hidden flex items-center justify-center p-2 sm:p-6 cursor-grab active:cursor-grabbing`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className={`max-w-full max-h-full flex items-center justify-center ${
            isDragging ? 'transition-none' : 'transition-transform duration-100 ease-out'
          }`}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'center center',
          }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt={caption || title || 'Enlarged Question Diagram'}
            onLoad={handleImageLoad}
            draggable={false}
            className="max-h-[84vh] max-w-[95vw] object-contain rounded-xl shadow-2xl bg-white ring-1 ring-slate-800 pointer-events-none"
            style={{
              imageRendering: 'auto',
              WebkitFontSmoothing: 'antialiased',
            }}
          />
        </div>

        {/* Floating Quick Scroll Controls (Right Side Rail) */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 p-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-xl z-20">
          <button
            type="button"
            onClick={scrollToTop}
            className="p-2 rounded-xl text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
            title="Scroll to Top (Home)"
          >
            <ChevronsUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollByAmount(0, 120)}
            className="p-2 rounded-xl text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
            title="Scroll Up (ArrowUp)"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={centerImage}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer text-[10px] font-mono"
            title="Center Image"
          >
            <LocateFixed className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={() => scrollByAmount(0, -120)}
            className="p-2 rounded-xl text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
            title="Scroll Down (ArrowDown)"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={scrollToBottom}
            className="p-2 rounded-xl text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
            title="Scroll to Bottom (End)"
          >
            <ChevronsDown className="h-4 w-4" />
          </button>
        </div>

        {/* Horizontal Scroll Arrows (Bottom center when wide or zoomed) */}
        {zoomLevel > 1.2 && (
          <div className="absolute bottom-4 right-20 hidden sm:flex items-center gap-1.5 p-1 bg-slate-900/85 backdrop-blur-md border border-slate-700/90 rounded-xl shadow-xl z-20">
            <button
              type="button"
              onClick={() => scrollByAmount(100, 0)}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
              title="Scroll Left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[10px] text-slate-400 font-mono px-1">Pan H</span>
            <button
              type="button"
              onClick={() => scrollByAmount(-100, 0)}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors cursor-pointer"
              title="Scroll Right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Floating Pan & Scroll Helper Pill */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 text-[11px] text-slate-300 px-3 py-1.5 rounded-xl pointer-events-none shadow-md">
          <Move className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
          <span>
            {zoomLevel > 1
              ? 'Scroll mouse wheel or use Arrow Keys to move up & down · Drag to pan freely'
              : 'Scroll mouse wheel or double-click to zoom in and scroll'}
          </span>
        </div>
      </div>

      {/* Bottom Caption Bar */}
      {caption && (
        <div className="px-6 py-2 bg-slate-900/90 border-t border-slate-800 text-center shrink-0 z-20">
          <p className="text-xs font-semibold text-slate-200 truncate">
            {caption}
          </p>
        </div>
      )}
    </div>
  );
};
