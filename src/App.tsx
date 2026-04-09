/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, MouseEvent } from 'react';

interface PixelBlock {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  title: string;
}

export default function App() {
  const [pixels, setPixels] = useState<PixelBlock[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [formData, setFormData] = useState({
    w: 1,
    h: 1,
    imageUrl: '',
    linkUrl: '',
    title: ''
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPixels();
  }, []);

  const fetchPixels = async () => {
    try {
      const res = await fetch('/api/pixels');
      const data = await res.json();
      setPixels(data);
    } catch (err) {
      console.error("Pikseller yüklenemedi", err);
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 10);
    const y = Math.floor((e.clientY - rect.top) / 10);
    
    if (x >= 0 && x < 100 && y >= 0 && y < 100) {
      setMousePos({ x, y });
    } else {
      setMousePos(null);
    }
  };

  const handleMouseLeave = () => setMousePos(null);

  const handleGridClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / 10);
    const y = Math.floor((e.clientY - rect.top) / 10);

    // Check if clicked area is already occupied
    const isOccupied = pixels.some(p =>
      x >= p.x && x < p.x + p.w &&
      y >= p.y && y < p.y + p.h
    );

    if (!isOccupied) {
      setSelectedCoords({ x, y });
      setFormData({ ...formData, w: 1, h: 1 });
      setIsModalOpen(true);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoords) return;

    try {
      const res = await fetch('/api/pixels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: selectedCoords.x,
          y: selectedCoords.y,
          ...formData
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setError(errorData.error || 'Bir hata oluştu');
        return;
      }

      await fetchPixels();
      setIsModalOpen(false);
    } catch (err) {
      setError('Bağlantı hatası');
    }
  };

  const totalPixels = 1000000;
  const soldPixels = pixels.reduce((acc, p) => acc + (p.w * 10 * p.h * 10), 0);
  const availablePixels = totalPixels - soldPixels;

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-sans selection:bg-red-600 selection:text-white flex flex-col">
      {/* Header */}
      <header className="w-full border-b-4 border-black bg-white pt-16 pb-12 px-4 text-center relative z-10">
        <div className="absolute top-0 left-0 w-full h-3 bg-red-600"></div>
        
        <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-none">
          Milyonluk<br/>Ana Sayfa
        </h1>
        
        <div className="mt-6 inline-block bg-red-600 text-white font-display font-bold text-xl md:text-2xl px-6 py-2 brutal-shadow rotate-[-2deg]">
          TÜRKİYE EDİSYONU
        </div>
        
        <p className="mt-10 text-lg md:text-xl font-medium max-w-3xl mx-auto border-2 border-black p-4 bg-[#fffdf0] brutal-shadow-sm">
          İnternet tarihinde yerinizi alın. Toplam 1.000.000 piksel.<br/>
          10x10 bloklar halinde satılıyor. Tanesi sadece 1 TL.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mt-10 font-mono text-base md:text-lg font-bold">
          <div className="border-2 border-black bg-white px-6 py-3 brutal-shadow-sm flex flex-col items-center min-w-[200px]">
            <span className="text-xs text-gray-500 uppercase tracking-widest mb-1">Satılan</span>
            <span className="text-2xl">{soldPixels.toLocaleString()} PX</span>
          </div>
          <div className="border-2 border-black bg-[#ffd700] px-6 py-3 brutal-shadow-sm flex flex-col items-center min-w-[200px]">
            <span className="text-xs text-black uppercase tracking-widest mb-1">Kalan</span>
            <span className="text-2xl">{availablePixels.toLocaleString()} PX</span>
          </div>
        </div>
      </header>

      {/* Main Grid Area */}
      <main className="flex-1 w-full overflow-auto p-4 md:p-12 flex justify-center items-start bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9InJnYmEoMCwwLDAsMC4xKSIvPjwvc3ZnPg==')]">
        <div className="relative mb-20">
          
          {/* Coordinates Display */}
          <div className="absolute -top-10 left-0 font-mono text-sm font-bold bg-black text-white px-3 py-2 brutal-shadow-sm">
            {mousePos ? `X: ${mousePos.x * 10} | Y: ${mousePos.y * 10}` : 'X: --- | Y: ---'}
          </div>

          <div className="absolute -top-10 right-0 font-mono text-sm font-bold bg-white border-2 border-black px-3 py-2 brutal-shadow-sm">
            1000 x 1000 PX
          </div>

          <div className="border-4 border-black bg-white brutal-shadow-lg p-0 mx-auto w-fit">
            <div
              className="relative pixel-grid cursor-crosshair"
              style={{ width: 1000, height: 1000 }}
              onClick={handleGridClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Render Sold Pixels */}
              {pixels.map(p => (
                <a
                  key={p.id}
                  href={p.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={p.title}
                  className="absolute block hover:z-30 hover:ring-4 hover:ring-red-600 transition-none"
                  style={{
                    left: p.x * 10,
                    top: p.y * 10,
                    width: p.w * 10,
                    height: p.h * 10,
                    backgroundImage: `url(${p.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#000'
                  }}
                />
              ))}

              {/* Hover Indicator (1x1 block) */}
              {!isModalOpen && mousePos && (
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

              {/* Selection Preview (when modal is open) */}
              {isModalOpen && selectedCoords && (
                <div
                  className="absolute border-4 border-black bg-[#ffd700]/60 pointer-events-none z-20 brutal-shadow-sm"
                  style={{
                    left: selectedCoords.x * 10,
                    top: selectedCoords.y * 10,
                    width: formData.w * 10,
                    height: formData.h * 10
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Buy Modal */}
      {isModalOpen && selectedCoords && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border-4 border-black brutal-shadow-lg w-full max-w-lg flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h2 className="font-display font-bold text-xl uppercase tracking-wider">Alanı Sahiplen</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="hover:text-red-500 font-mono text-xl font-bold transition-colors"
              >
                [X]
              </button>
            </div>
            
            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-[#f4f4f0]">
              
              <div className="flex gap-4">
                <div className="flex-1 bg-white p-3 border-2 border-black brutal-shadow-sm">
                  <label className="block font-mono text-xs font-bold text-gray-500 uppercase mb-1">X Koordinatı</label>
                  <div className="text-xl font-mono font-bold">{selectedCoords.x * 10}</div>
                </div>
                <div className="flex-1 bg-white p-3 border-2 border-black brutal-shadow-sm">
                  <label className="block font-mono text-xs font-bold text-gray-500 uppercase mb-1">Y Koordinatı</label>
                  <div className="text-xl font-mono font-bold">{selectedCoords.y * 10}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-xs font-bold uppercase mb-2">Genişlik (Blok)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    className="w-full border-2 border-black p-3 font-mono text-lg focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
                    value={formData.w}
                    onChange={e => setFormData({...formData, w: parseInt(e.target.value) || 1})}
                  />
                  <p className="font-mono text-xs text-gray-600 mt-2">Genişlik: {formData.w * 10} px</p>
                </div>
                <div>
                  <label className="block font-mono text-xs font-bold uppercase mb-2">Yükseklik (Blok)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    className="w-full border-2 border-black p-3 font-mono text-lg focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
                    value={formData.h}
                    onChange={e => setFormData({...formData, h: parseInt(e.target.value) || 1})}
                  />
                  <p className="font-mono text-xs text-gray-600 mt-2">Yükseklik: {formData.h * 10} px</p>
                </div>
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase mb-2">Görsel URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://ornek.com/logo.png"
                  className="w-full border-2 border-black p-3 font-mono focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase mb-2">Hedef Link</label>
                <input
                  type="url"
                  required
                  placeholder="https://siteniz.com"
                  className="w-full border-2 border-black p-3 font-mono focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
                  value={formData.linkUrl}
                  onChange={e => setFormData({...formData, linkUrl: e.target.value})}
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-bold uppercase mb-2">Slogan / Marka Adı</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  placeholder="Üzerine gelince çıkacak yazı"
                  className="w-full border-2 border-black p-3 font-mono focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-600 text-white font-mono text-sm border-2 border-black brutal-shadow-sm">
                  HATA: {error}
                </div>
              )}

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-display font-bold text-xl py-4 border-2 border-black brutal-shadow transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none uppercase"
                >
                  Satın Al ({(formData.w * formData.h * 100).toLocaleString()} TL)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
