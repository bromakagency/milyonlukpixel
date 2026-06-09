import { useState, useCallback, MouseEvent, useEffect } from 'react';
import { Plus, Minus, Maximize2, X, ArrowLeft, ArrowRight, ArrowUp, ArrowDown, Check, Undo } from 'lucide-react';
import { usePixelContext } from '../../context/PixelContext';

// ── Grid Sabitleri ──────────────────────────────────────────────────────────
const BLOCKS_X = 125;
const BLOCKS_Y = 80;
const BLOCK_PX = 10;
const GRID_WIDTH_PX  = BLOCKS_X * BLOCK_PX;  // 1250px
const GRID_HEIGHT_PX = BLOCKS_Y * BLOCK_PX;  // 800px

interface GridProps {
  onPixelSelect: (x: number, y: number, w: number, h: number) => void;
}

type SelectionArea = { x: number; y: number; w: number; h: number };

// ── Paylaşılan Piksel Katmanı (hem normal hem tam ekran için) ───────────────
function PixelCanvas({
  pixels,
  zoom,
  selection,
  onSelectionChange,
  onConfirmSelection,
}: {
  pixels: ReturnType<typeof usePixelContext>['pixels'];
  zoom: number;
  selection: SelectionArea | null;
  onSelectionChange: (selection: SelectionArea | null) => void;
  onConfirmSelection: (selection: SelectionArea) => void;
}) {
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [selectionHistory, setSelectionHistory] = useState<SelectionArea[]>([]);
  const approvedPixels = pixels.filter((p) => !p.status || p.status === 'approved');

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
    const isOccupied = approvedPixels.some(
      (p) => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h
    );
    if (!isOccupied) {
      setSelectionHistory([]);
      onSelectionChange({ x, y, w: 1, h: 1 });
    }
  };

  const isAreaAvailable = (area: SelectionArea) => {
    if (area.x < 0 || area.y < 0 || area.x + area.w > BLOCKS_X || area.y + area.h > BLOCKS_Y) {
      return false;
    }

    return !approvedPixels.some((p) =>
      area.x < p.x + p.w &&
      area.x + area.w > p.x &&
      area.y < p.y + p.h &&
      area.y + area.h > p.y
    );
  };

  const growSelection = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selection) return;

    const next = direction === 'up'
      ? { ...selection, y: selection.y - 1, h: selection.h + 1 }
      : direction === 'down'
        ? { ...selection, h: selection.h + 1 }
        : direction === 'left'
          ? { ...selection, x: selection.x - 1, w: selection.w + 1 }
          : { ...selection, w: selection.w + 1 };

    if (isAreaAvailable(next)) {
      setSelectionHistory(prev => [...prev, selection]);
      onSelectionChange(next);
    }
  };

  const handleUndo = () => {
    if (selectionHistory.length > 0) {
      const prev = selectionHistory[selectionHistory.length - 1];
      setSelectionHistory(h => h.slice(0, -1));
      onSelectionChange(prev);
    }
  };

  const getPopupStyle = () => {
    if (!selection) return {};
    const POPUP_W_HALF = 100; // Genişlik yarıçapı + pay
    const POPUP_H = 160;      // Yükseklik tahmini
    
    const idealLeft = (selection.x + selection.w / 2) * BLOCK_PX;
    const clampedLeft = Math.max(POPUP_W_HALF, Math.min(idealLeft, GRID_WIDTH_PX - POPUP_W_HALF));
    
    let idealTop = (selection.y + selection.h) * BLOCK_PX + 8;
    
    if (idealTop + POPUP_H > GRID_HEIGHT_PX) {
      idealTop = (selection.y * BLOCK_PX) - POPUP_H - 8;
      if (idealTop < 8) {
        idealTop = Math.max(8, GRID_HEIGHT_PX - POPUP_H - 8);
      }
    }
    
    return {
      left: clampedLeft,
      top: idealTop,
      transform: 'translateX(-50%)',
    };
  };

  const canGrow = {
    up: selection ? isAreaAvailable({ ...selection, y: selection.y - 1, h: selection.h + 1 }) : false,
    down: selection ? isAreaAvailable({ ...selection, h: selection.h + 1 }) : false,
    left: selection ? isAreaAvailable({ ...selection, x: selection.x - 1, w: selection.w + 1 }) : false,
    right: selection ? isAreaAvailable({ ...selection, w: selection.w + 1 }) : false,
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
        {approvedPixels.map((pixel) => (
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

        {selection && (
          <>
            <div
              className="absolute pointer-events-none z-30 border-2 border-green-500 bg-green-400/25 ring-2 ring-green-300"
              style={{
                left: selection.x * BLOCK_PX,
                top: selection.y * BLOCK_PX,
                width: selection.w * BLOCK_PX,
                height: selection.h * BLOCK_PX,
              }}
            />

            <div
              className="absolute z-40 flex flex-col items-center gap-1"
              style={getPopupStyle()}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => growSelection('up')}
                disabled={!canGrow.up}
                className="h-8 w-8 border-2 border-black bg-white text-black brutal-shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-100 flex items-center justify-center"
                title="Yukarı 1 blok büyüt"
              >
                <ArrowUp className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => growSelection('left')}
                  disabled={!canGrow.left}
                  className="h-8 w-8 border-2 border-black bg-white text-black brutal-shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-100 flex items-center justify-center"
                  title="Sola 1 blok büyüt"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                <div className="bg-black px-2 py-1 font-mono text-[10px] font-bold text-white whitespace-nowrap">
                  {selection.w * 10}x{selection.h * 10}px
                </div>

                <button
                  type="button"
                  onClick={() => growSelection('right')}
                  disabled={!canGrow.right}
                  className="h-8 w-8 border-2 border-black bg-white text-black brutal-shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-100 flex items-center justify-center"
                  title="Sağa 1 blok büyüt"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => growSelection('down')}
                disabled={!canGrow.down}
                className="h-8 w-8 border-2 border-black bg-white text-black brutal-shadow-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-green-100 flex items-center justify-center"
                title="Aşağı 1 blok büyüt"
              >
                <ArrowDown className="h-4 w-4" />
              </button>

              <div className="mt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectionHistory([]);
                    onSelectionChange(null);
                  }}
                  className="h-8 w-8 border-2 border-black bg-white text-black brutal-shadow-sm hover:bg-red-50 flex items-center justify-center"
                  title="Seçimi iptal et"
                >
                  <X className="h-4 w-4" />
                </button>

                {selectionHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="h-8 w-8 border-2 border-black bg-red-50 text-red-600 brutal-shadow-sm hover:bg-red-100 flex items-center justify-center"
                    title="Geri Al"
                  >
                    <Undo className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onConfirmSelection(selection)}
                  className="h-8 min-w-[84px] border-2 border-black bg-green-500 px-2 font-mono text-[10px] font-bold uppercase text-black brutal-shadow-sm hover:bg-green-400 flex items-center justify-center gap-1"
                  title="Bu alanı satın al"
                >
                  <Check className="h-4 w-4" />
                  Devam
                </button>
              </div>
            </div>
          </>
        )}

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
  selection,
  onSelectionChange,
  onConfirmSelection,
  onClose,
}: {
  pixels: ReturnType<typeof usePixelContext>['pixels'];
  selection: SelectionArea | null;
  onSelectionChange: (selection: SelectionArea | null) => void;
  onConfirmSelection: (selection: SelectionArea) => void;
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
            <PixelCanvas
              pixels={pixels}
              zoom={zoom}
              selection={selection}
              onSelectionChange={onSelectionChange}
              onConfirmSelection={onConfirmSelection}
            />
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
  const [selection, setSelection] = useState<SelectionArea | null>(null);

  const confirmSelection = (area: SelectionArea) => {
    onPixelSelect(area.x, area.y, area.w, area.h);
    setIsFullscreen(false);
  };

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
        <PixelCanvas
          pixels={pixels}
          zoom={zoom}
          selection={selection}
          onSelectionChange={setSelection}
          onConfirmSelection={confirmSelection}
        />
      </div>

      {/* ── Tam Ekran Modal ──────────────────────────────────────────────── */}
      {isFullscreen && (
        <FullscreenModal
          pixels={pixels}
          selection={selection}
          onSelectionChange={setSelection}
          onConfirmSelection={confirmSelection}
          onClose={() => setIsFullscreen(false)}
        />
      )}
    </>
  );
}
