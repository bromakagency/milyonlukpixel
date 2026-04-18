import React, { useState, useEffect, useCallback, MouseEvent, TouchEvent, useRef } from 'react';
import { usePixelContext } from '../../context/PixelContext';

interface GridProps {
  onPixelSelect: (x: number, y: number) => void;
}

export function Grid({ onPixelSelect }: GridProps) {
  const { pixels } = usePixelContext();
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [gridScale, setGridScale] = useState(1);
  const [isTouching, setIsTouching] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculateScale = () => {
      const vw = window.innerWidth;
      const availableWidth = vw - 32;
      const scale = Math.min(availableWidth / 1000, 1);
      setGridScale(scale);
      document.documentElement.style.setProperty('--grid-scale', scale.toString());
    };
    
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // --- Coordinate helper ---
  const getCoordsFromClient = (clientX: number, clientY: number, rect: DOMRect) => {
    // rect.width is the scaled width (1000 * gridScale), but the inner div is 1000px
    // so we map clientX relative to rect directly to 0-1000 range
    const x = Math.floor(((clientX - rect.left) / rect.width) * 100);
    const y = Math.floor(((clientY - rect.top) / rect.height) * 100);
    return { x, y };
  };

  // --- Mouse Events ---
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCoordsFromClient(e.clientX, e.clientY, rect);
    if (x >= 0 && x < 100 && y >= 0 && y < 100) {
      setMousePos({ x, y });
    } else {
      setMousePos(null);
    }
  }, []);

  const handleMouseLeave = () => setMousePos(null);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCoordsFromClient(e.clientX, e.clientY, rect);

    const isOccupied = pixels.some(p =>
      x >= p.x && x < p.x + p.w &&
      y >= p.y && y < p.y + p.h
    );

    if (!isOccupied) {
      onPixelSelect(x, y);
    }
  };

  // --- Touch Events ---
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    // Prevent page scroll while interacting with the grid
    e.preventDefault();
    setIsTouching(true);
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCoordsFromClient(touch.clientX, touch.clientY, rect);
    if (x >= 0 && x < 100 && y >= 0 && y < 100) {
      setMousePos({ x, y });
    }
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCoordsFromClient(touch.clientX, touch.clientY, rect);
    if (x >= 0 && x < 100 && y >= 0 && y < 100) {
      setMousePos({ x, y });
    } else {
      setMousePos(null);
    }
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsTouching(false);

    const touch = e.changedTouches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCoordsFromClient(touch.clientX, touch.clientY, rect);

    if (x < 0 || x >= 100 || y < 0 || y >= 100) {
      setMousePos(null);
      return;
    }

    const isOccupied = pixels.some(p =>
      x >= p.x && x < p.x + p.w &&
      y >= p.y && y < p.y + p.h
    );

    if (!isOccupied) {
      onPixelSelect(x, y);
    }

    // Clear indicator after small delay
    setTimeout(() => setMousePos(null), 300);
  }, [pixels, onPixelSelect]);

  return (
    <>
      <div className="flex justify-between items-center mb-2 font-mono text-xs md:text-sm font-bold">
        <div className="bg-black text-white px-2 md:px-3 py-1 md:py-2 brutal-shadow-sm">
          {mousePos ? `X: ${mousePos.x * 10} | Y: ${mousePos.y * 10}` : 'X: --- | Y: ---'}
        </div>
        <div className="bg-white border-2 border-black px-2 md:px-3 py-1 md:py-2 brutal-shadow-sm">
          1000 x 1000 PX
        </div>
      </div>

      {/* Mobile touch hint - only shown on touch devices */}
      <p className="md:hidden text-center font-mono text-xs text-gray-500 mb-2">
        Parmağınızı kaydırın, bırakınca seçim yapılır
      </p>

      <div
        className="border-2 md:border-4 border-black bg-white brutal-shadow-lg p-0 mx-auto overflow-hidden"
        style={{
          width: 1000 * gridScale,
          height: 1000 * gridScale,
        }}
      >
        <div
          ref={gridRef}
          className="relative pixel-grid"
          style={{ 
            width: 1000, 
            height: 1000, 
            transform: `scale(${gridScale})`,
            transformOrigin: 'top left',
            cursor: isTouching ? 'crosshair' : 'crosshair',
            // Disable browser's native touch actions so we get all touch events
            touchAction: 'none',
          }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {pixels.map((pixel) => (
            <a
              key={pixel.id}
              href={pixel.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={pixel.title}
              className="absolute block overflow-hidden hover:z-30 hover:ring-4 hover:ring-red-600 transition-none"
              style={{
                left: pixel.x * 10,
                top: pixel.y * 10,
                width: pixel.w * 10,
                height: pixel.h * 10,
              }}
              // Prevent link navigation on touch (touch handles selection instead)
              onTouchStart={(e) => e.preventDefault()}
            >
              <img
                src={pixel.imageUrl}
                alt={pixel.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </a>
          ))}

          {mousePos && (
            <div
              className={`absolute pointer-events-none z-20 ${
                isTouching
                  ? 'border-4 border-red-600 bg-red-600/40 ring-4 ring-red-300'
                  : 'border-2 border-red-600 bg-red-600/30'
              }`}
              style={{
                left: mousePos.x * 10,
                top: mousePos.y * 10,
                width: 10,
                height: 10,
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
