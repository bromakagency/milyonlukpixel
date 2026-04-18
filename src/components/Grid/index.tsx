import { useState, useEffect, useCallback, useRef, MouseEvent } from 'react';
import { usePixelContext } from '../../context/PixelContext';

// ── Grid Sabitleri ──────────────────────────────────────────────────────────
const BLOCKS = 100;       // Her yönde kaç blok (100×100 = 1M piksel)
const BLOCK_PX = 10;      // Her bloğun görsel boyutu (px)
const GRID_PX = BLOCKS * BLOCK_PX; // 1000px

interface GridProps {
  onPixelSelect: (x: number, y: number) => void;
}

export function Grid({ onPixelSelect }: GridProps) {
  const { pixels } = usePixelContext();
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [gridScale, setGridScale] = useState(1);
  const [isTouching, setIsTouching] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);

  // Ref'ler — native listener'larda güncel değerlere erişmek için
  const pixelsRef = useRef(pixels);
  const onPixelSelectRef = useRef(onPixelSelect);
  useEffect(() => { pixelsRef.current = pixels; }, [pixels]);
  useEffect(() => { onPixelSelectRef.current = onPixelSelect; }, [onPixelSelect]);

  // ── Scale hesaplama ────────────────────────────────────────────────────
  useEffect(() => {
    const calculateScale = () => {
      const vw = window.innerWidth;
      const availableWidth = vw - 32;
      const scale = Math.min(availableWidth / GRID_PX, 1);
      setGridScale(scale);
      document.documentElement.style.setProperty('--grid-scale', scale.toString());
    };
    calculateScale();
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, []);

  // ── Koordinat yardımcısı ───────────────────────────────────────────────
  // rect.width = GRID_PX * gridScale  →  clientX pozisyonunu blok indeksine çeviriyoruz
  const getCoordsFromRect = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = Math.floor(((clientX - rect.left) / rect.width) * BLOCKS);
    const y = Math.floor(((clientY - rect.top) / rect.height) * BLOCKS);
    return { x, y };
  };

  const isInBounds = (x: number, y: number) => x >= 0 && x < BLOCKS && y >= 0 && y < BLOCKS;

  // ── Native Touch Listeners { passive: false } ──────────────────────────
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      setIsTouching(true);
      const touch = e.touches[0];
      const rect = el.getBoundingClientRect();
      const { x, y } = getCoordsFromRect(touch.clientX, touch.clientY, rect);
      if (isInBounds(x, y)) setMousePos({ x, y });
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = el.getBoundingClientRect();
      const { x, y } = getCoordsFromRect(touch.clientX, touch.clientY, rect);
      setMousePos(isInBounds(x, y) ? { x, y } : null);
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setIsTouching(false);
      const touch = e.changedTouches[0];
      const rect = el.getBoundingClientRect();
      const { x, y } = getCoordsFromRect(touch.clientX, touch.clientY, rect);

      if (!isInBounds(x, y)) { setMousePos(null); return; }

      const isOccupied = pixelsRef.current.some(
        (p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h
      );
      if (!isOccupied) onPixelSelectRef.current(x, y);
      setTimeout(() => setMousePos(null), 300);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

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
          {GRID_PX} × {GRID_PX} PX
        </div>
      </div>

      {/* Mobil ipucu */}
      <p className="md:hidden text-center font-mono text-xs text-gray-500 mb-2">
        Parmağınızı kaydırın, bırakınca seçim yapılır
      </p>

      {/* Wrapper — scale ile küçülen grid'in gerçek kapladığı alanı tutar */}
      <div
        className="border-2 md:border-4 border-black bg-white brutal-shadow-lg p-0 mx-auto overflow-hidden"
        style={{
          width: GRID_PX * gridScale,
          height: GRID_PX * gridScale,
        }}
      >
        <div
          ref={gridRef}
          className="relative pixel-grid cursor-crosshair"
          style={{
            width: GRID_PX,
            height: GRID_PX,
            transform: `scale(${gridScale})`,
            transformOrigin: 'top left',
            touchAction: 'none',
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
                className="w-full h-full object-fill"
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
