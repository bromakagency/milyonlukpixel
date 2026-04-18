import React, { useState, useEffect, useCallback, MouseEvent } from 'react';
import { PixelBlock } from '../../types';
import { usePixelContext } from '../../context/PixelContext';

interface GridProps {
  onPixelSelect: (x: number, y: number) => void;
}

export function Grid({ onPixelSelect }: GridProps) {
  const { pixels } = usePixelContext();
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [gridScale, setGridScale] = useState(1);

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

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 1000 / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / 10);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / 10);
    
    if (x >= 0 && x < 100 && y >= 0 && y < 100) {
      setMousePos({ x, y });
    } else {
      setMousePos(null);
    }
  }, []);

  const handleMouseLeave = () => setMousePos(null);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 1000 / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / 10);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / 10);

    const isOccupied = pixels.some(p =>
      x >= p.x && x < p.x + p.w &&
      y >= p.y && y < p.y + p.h
    );

    if (!isOccupied) {
      onPixelSelect(x, y);
    }
  };

  return (
    <>
      <div className="fixed top-2 left-2 md:absolute md:-top-10 md:left-0 z-30 font-mono text-xs md:text-sm font-bold bg-black text-white px-2 md:px-3 py-1 md:py-2 brutal-shadow-sm">
        {mousePos ? `X: ${mousePos.x * 10} | Y: ${mousePos.y * 10}` : 'X: --- | Y: ---'}
      </div>

      <div className="fixed top-2 right-2 md:absolute md:-top-10 md:right-0 z-30 font-mono text-xs md:text-sm font-bold bg-white border-2 border-black px-2 md:px-3 py-1 md:py-2 brutal-shadow-sm">
        1000 x 1000 PX
      </div>

      <div className="border-2 md:border-4 border-black bg-white brutal-shadow-lg p-0 mx-auto w-fit">
        <div
          className="relative pixel-grid cursor-crosshair"
          style={{ 
            width: 1000, 
            height: 1000, 
            transform: `scale(var(--grid-scale, 1))`,
            transformOrigin: 'top left'
          }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
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
              className="absolute border-2 border-red-600 bg-red-600/30 pointer-events-none z-20"
              style={{
                left: mousePos.x * 10,
                top: mousePos.y * 10,
                width: 10,
                height: 10
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
