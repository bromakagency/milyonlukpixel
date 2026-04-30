import { useState, useEffect, useCallback, useRef, MouseEvent } from 'react';
import { usePixelContext } from '../../context/PixelContext';

// ── Grid Sabitleri ──────────────────────────────────────────────────────────
const BLOCKS_X = 125;     // Yatay blok sayısı (1250px)
const BLOCKS_Y = 80;      // Dikey blok sayısı (800px)
const BLOCK_PX = 10;      // Her bloğun görsel boyutu (px)
const GRID_WIDTH_PX = BLOCKS_X * BLOCK_PX; // 1250px
const GRID_HEIGHT_PX = BLOCKS_Y * BLOCK_PX; // 800px

interface GridProps {
  onPixelSelect: (x: number, y: number) => void;
}

export function Grid({ onPixelSelect }: GridProps) {
  const { pixels } = usePixelContext();
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // ── Koordinat yardımcısı ───────────────────────────────────────────────
  // rect.width = GRID_WIDTH_PX * gridScale  →  clientX pozisyonunu blok indeksine çeviriyoruz
  const getCoordsFromRect = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = Math.floor(((clientX - rect.left) / rect.width) * BLOCKS_X);
    const y = Math.floor(((clientY - rect.top) / rect.height) * BLOCKS_Y);
    return { x, y };
  };

  const isInBounds = (x: number, y: number) => x >= 0 && x < BLOCKS_X && y >= 0 && y < BLOCKS_Y;

  // ── Mouse Events ───────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCoordsFromRect(e.clientX, e.clientY, rect);
    setMousePos(isInBounds(x, y) ? { x, y } : null);
  }, []);

  const handleMouseLeave = () => setMousePos(null);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCoordsFromRect(e.clientX, e.clientY, rect);
    if (!isInBounds(x, y)) return;

    const isOccupied = pixels.some(
      (p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h
    );
    if (!isOccupied) onPixelSelect(x, y);
  };

  return (
    <>
      <div className="flex justify-between items-center mb-2 font-mono text-xs md:text-sm font-bold">
        <div className="bg-black text-white px-2 md:px-3 py-1 md:py-2 brutal-shadow-sm">
          {mousePos
            ? `X: ${mousePos.x * BLOCK_PX} | Y: ${mousePos.y * BLOCK_PX}`
            : 'X: --- | Y: ---'}
        </div>
        <div className="bg-white border-2 border-black px-2 md:px-3 py-1 md:py-2 brutal-shadow-sm">
          {GRID_WIDTH_PX} × {GRID_HEIGHT_PX} PX
        </div>
      </div>

      {/* Mobil ipucu */}
      <p className="md:hidden text-center font-mono text-xs text-gray-500 mb-2">
        Piksel seçmek için dokunun, gezmek için kaydırın
      </p>

      {/* Wrapper — overflow-auto sayesinde mobilde sağa/sola ve aşağı/yukarı kaydırılabilir */}
      <div
        className="w-full max-w-[1250px] overflow-auto border-2 md:border-4 border-black bg-[#f4f4f0] brutal-shadow-lg mx-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div
          ref={gridRef}
          className="relative pixel-grid cursor-crosshair"
          style={{
            width: GRID_WIDTH_PX,
            height: GRID_HEIGHT_PX,
            minWidth: GRID_WIDTH_PX,
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
              className="absolute block overflow-hidden bg-white hover:z-30 hover:ring-4 hover:ring-red-600 transition-none"
              style={{
                left: pixel.x * BLOCK_PX,
                top: pixel.y * BLOCK_PX,
                width: pixel.w * BLOCK_PX,
                height: pixel.h * BLOCK_PX,
              }}
            >
              <img
                src={pixel.imageUrl}
                alt={pixel.title}
                className="w-full h-full object-contain object-center"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </a>
          ))}

          {mousePos && (
            <div
              className="absolute pointer-events-none z-20 border-2 border-red-600 bg-red-600/30"
              style={{
                left: mousePos.x * BLOCK_PX,
                top: mousePos.y * BLOCK_PX,
                width: BLOCK_PX,
                height: BLOCK_PX,
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
