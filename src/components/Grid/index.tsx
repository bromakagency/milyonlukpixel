import { useState, useEffect, useCallback, useRef, MouseEvent } from 'react';
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

  // Ref'ler — native listener'lar içinde güncel state'e erişmek için
  const pixelsRef = useRef(pixels);
  const onPixelSelectRef = useRef(onPixelSelect);
  useEffect(() => { pixelsRef.current = pixels; }, [pixels]);
  useEffect(() => { onPixelSelectRef.current = onPixelSelect; }, [onPixelSelect]);

  // ── Scale hesaplama ──────────────────────────────────────────────────────
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

  // ── Koordinat yardımcısı ────────────────────────────────────────────────
  const getCoordsFromRect = (clientX: number, clientY: number, rect: DOMRect) => {
    const x = Math.floor(((clientX - rect.left) / rect.width) * 100);
    const y = Math.floor(((clientY - rect.top) / rect.height) * 100);
    return { x, y };
  };

  // ── Native Touch Listeners (passive: false) ─────────────────────────────
  // React 17+ touch event'lerini passive bağlar → preventDefault() çalışmaz.
  // Çözüm: native addEventListener ile { passive: false }.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault(); // sayfanın scroll/zoom yapmasını engelle
      setIsTouching(true);
      const touch = e.touches[0];
      const rect = el.getBoundingClientRect();
      const { x, y } = getCoordsFromRect(touch.clientX, touch.clientY, rect);
      if (x >= 0 && x < 100 && y >= 0 && y < 100) {
        setMousePos({ x, y });
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = el.getBoundingClientRect();
      const { x, y } = getCoordsFromRect(touch.clientX, touch.clientY, rect);
      if (x >= 0 && x < 100 && y >= 0 && y < 100) {
        setMousePos({ x, y });
      } else {
        setMousePos(null);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setIsTouching(false);

      const touch = e.changedTouches[0];
      const rect = el.getBoundingClientRect();
      const { x, y } = getCoordsFromRect(touch.clientX, touch.clientY, rect);

      if (x < 0 || x >= 100 || y < 0 || y >= 100) {
        setMousePos(null);
        return;
      }

      const isOccupied = pixelsRef.current.some(
        (p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h
      );

      if (!isOccupied) {
        onPixelSelectRef.current(x, y);
      }

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
  }, []); // gridRef sabit kalır, ref'ler her render'da güncellenir

  // ── Mouse Events ────────────────────────────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCoordsFromRect(e.clientX, e.clientY, rect);
    if (x >= 0 && x < 100 && y >= 0 && y < 100) {
      setMousePos({ x, y });
    } else {
      setMousePos(null);
    }
  }, []);

  const handleMouseLeave = () => setMousePos(null);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCoordsFromRect(e.clientX, e.clientY, rect);

    const isOccupied = pixels.some(
      (p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h
    );

    if (!isOccupied) {
      onPixelSelect(x, y);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
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

      {/* Mobil ipucu */}
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
          className="relative pixel-grid cursor-crosshair"
          style={{
            width: 1000,
            height: 1000,
            transform: `scale(${gridScale})`,
            transformOrigin: 'top left',
            touchAction: 'none', // CSS seviyesinde scroll'u engelle
          }}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          // Touch event'leri React'a bırakmıyoruz → native ile yönetiliyor
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
