import { useState, useCallback, useRef, MouseEvent, useEffect } from 'react';
import { Plus, Minus, Maximize2, X } from 'lucide-react';
import { usePixelContext } from '../../context/PixelContext';

// ── Grid Sabitleri ──────────────────────────────────────────────────────────
const BLOCKS_X = 125;
const BLOCKS_Y = 80;
const BLOCK_PX = 10;
const GRID_WIDTH_PX  = BLOCKS_X * BLOCK_PX;  // 1250px
const GRID_HEIGHT_PX = BLOCKS_Y * BLOCK_PX;  // 800px

interface GridProps {
  onPixelSelect: (x: number, y: number) => void;
}

// ── Paylaşılan Piksel Katmanı (hem normal hem tam ekran için) ───────────────
function PixelCanvas({
  pixels,
  zoom,
  onPixelSelect,
}: {
  pixels: ReturnType<typeof usePixelContext>['pixels'];
  zoom: number;
  onPixelSelect: (x: number, y: number) => void;
}) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const getCoordsFromRect = (clientX: number, clientY: number, rect: DOMRect) => ({
    x: Math.floor(((clientX - rect.left) / rect.width)  * BLOCKS_X),
    y: Math.floor(((clientY - rect.top)  / rect.height) * BLOCKS_Y),
  });

  const isInBounds = (x: number, y: number) =>
    x >= 0 && x < BLOCKS_X && y >= 0 && y < BLOCKS_Y;

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, y } = getCoordsFromRect(e.clientX, e.clientY, rect);
    setMousePos(isInBounds(x, y) ? { x, y } : null);
  }, []);

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
    <div
      style={{
        width:    GRID_WIDTH_PX  * zoom,
        height:   GRID_HEIGHT_PX * zoom,
        position: 'relative',
      }}
    >
      <div
        className="relative pixel-grid cursor-crosshair origin-top-left"
        style={{
          width:     GRID_WIDTH_PX,
          height:    GRID_HEIGHT_PX,
          transform: `scale(${zoom})`,
        }}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setMousePos(null)}
      >
        {pixels.map((pixel) => (
          <a
            key={pixel.id}
            href={pixel.linkUrl}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            title={pixel.title}
            className="absolute block overflow-hidden bg-white hover:z-30 hover:ring-4 hover:ring-red-600 transition-none"
            style={{
              left:   pixel.x * BLOCK_PX,
              top:    pixel.y * BLOCK_PX,
              width:  pixel.w * BLOCK_PX,
              height: pixel.h * BLOCK_PX,
            }}
          >
            <img
              src={pixel.imageUrl}
              alt={pixel.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-contain object-center"
              onError={(e) => {
                const el = e.target as HTMLImageElement;
                el.style.opacity = '0';
              }}
            />
          </a>
        ))}

        {mousePos && (
          <div
            className="absolute pointer-events-none z-20 border-2 border-red-600 bg-red-600/30"
            style={{
              left:   mousePos.x * BLOCK_PX,
              top:    mousePos.y * BLOCK_PX,
              width:  BLOCK_PX,
              height: BLOCK_PX,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Tam Ekran Modal ──────────────────────────────────────────────────────────
function FullscreenModal({
  pixels,
  onPixelSelect,
  onClose,
}: {
  pixels: ReturnType<typeof usePixelContext>['pixels'];
  onPixelSelect: (x: number, y: number) => void;
  onClose: () => void;
}) {
  // Ekran boyutuna sığacak zoom hesapla (padding ile)
  const fitZoom = Math.min(
    (window.innerWidth  - 32) / GRID_WIDTH_PX,
    (window.innerHeight - 96) / GRID_HEIGHT_PX
  );
  const [zoom, setZoom] = useState(parseFloat(fitZoom.toFixed(2)));

  // ESC ile kapat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col bg-black/90 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Üst bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black border-b-2 border-white/20 shrink-0">
        <div className="flex items-center gap-2 font-mono text-xs text-white">
          <span className="font-bold text-red-500">TAM EKRAN</span>
          <span className="text-white/40">|</span>
          <span>{GRID_WIDTH_PX} × {GRID_HEIGHT_PX} PX</span>
        </div>

        {/* Zoom kontrolleri */}
        <div className="flex items-center gap-1 bg-white/10 border border-white/20 rounded p-1 font-mono text-xs text-white">
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.1))}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Uzaklaştır"
          >
            <Minus className="h-4 w-4" />
          </button>
          <div className="px-2 min-w-[56px] text-center border-x border-white/20">
            %{Math.round(zoom * 100)}
          </div>
          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.1, 4))}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Yakınlaştır"
          >
            <Plus className="h-4 w-4" />
          </button>
          <div className="w-[1px] h-5 bg-white/20 mx-1" />
          <button
            onClick={() => setZoom(parseFloat(fitZoom.toFixed(2)))}
            className="px-2 py-1 hover:bg-white/20 rounded text-[10px] uppercase transition-colors"
          >
            Sığdır
          </button>
        </div>

        {/* Kapat */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded transition-colors"
        >
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Kapat (ESC)</span>
        </button>
      </div>

      {/* Scrollable piksel alanı */}
      <div className="flex-1 overflow-auto">
        <div className="min-h-full flex items-start justify-center p-4">
          <div className="border-4 border-white/30 bg-[#f4f4f0]">
            <PixelCanvas pixels={pixels} zoom={zoom} onPixelSelect={onPixelSelect} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Ana Grid Bileşeni ────────────────────────────────────────────────────────
export function Grid({ onPixelSelect }: GridProps) {
  const { pixels } = usePixelContext();
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 justify-between items-center mb-4 font-mono text-xs md:text-sm font-bold">
        <div className="bg-black text-white px-2 md:px-3 py-1 md:py-2 brutal-shadow-sm hidden sm:block">
          {GRID_WIDTH_PX} × {GRID_HEIGHT_PX} PX
        </div>

        {/* Zoom + Tam Ekran */}
        <div className="flex items-center gap-1 bg-white border-2 border-black p-1 brutal-shadow-sm ml-auto">
          <button
            onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.5))}
            className="p-1 md:p-2 hover:bg-gray-100 rounded transition-colors"
            title="Uzaklaştır"
          >
            <Minus className="h-4 w-4" />
          </button>

          <div className="px-2 min-w-[60px] text-center border-x border-gray-200">
            %{Math.round(zoom * 100)}
          </div>

          <button
            onClick={() => setZoom(prev => Math.min(prev + 0.25, 4))}
            className="p-1 md:p-2 hover:bg-gray-100 rounded transition-colors"
            title="Yakınlaştır"
          >
            <Plus className="h-4 w-4" />
          </button>

          <div className="w-[1px] h-6 bg-gray-200 mx-1" />

          <button
            onClick={() => setIsFullscreen(true)}
            className="flex items-center gap-1 px-2 md:px-3 py-1 md:py-2 hover:bg-gray-100 rounded uppercase text-[10px] md:text-xs transition-colors"
            title="Tam Ekran"
          >
            <Maximize2 className="h-3 w-3 md:h-4 md:w-4" />
            <span>Tümünü Gör</span>
          </button>
        </div>
      </div>

      {/* Mobil ipucu */}
      <p className="md:hidden text-center font-mono text-xs text-gray-500 mb-2">
        Piksel seçmek için dokunun, gezmek için kaydırın
      </p>

      {/* ── Normal Grid ─────────────────────────────────────────────────── */}
      <div
        className="w-full max-w-[1250px] overflow-auto border-2 md:border-4 border-black bg-[#f4f4f0] brutal-shadow-lg mx-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <PixelCanvas pixels={pixels} zoom={zoom} onPixelSelect={onPixelSelect} />
      </div>

      {/* ── Tam Ekran Modal ──────────────────────────────────────────────── */}
      {isFullscreen && (
        <FullscreenModal
          pixels={pixels}
          onPixelSelect={(x, y) => { onPixelSelect(x, y); setIsFullscreen(false); }}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
}
