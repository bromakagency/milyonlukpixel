import { useState, FormEvent } from 'react';
import { PixelFormData } from '../../types';
import { validatePixelForm } from '../../utils/validation';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PixelFormData) => Promise<void>;
  selectedCoords: { x: number; y: number } | null;
}

export function Modal({ isOpen, onClose, onSubmit, selectedCoords }: ModalProps) {
  const [formData, setFormData] = useState<PixelFormData>({
    x: 0,
    y: 0,
    w: 1,
    h: 1,
    imageUrl: '',
    linkUrl: '',
    title: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !selectedCoords) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const data = {
      ...formData,
      x: selectedCoords.x,
      y: selectedCoords.y,
    };

    const errors = validatePixelForm(data);
    if (errors.length > 0) {
      setError(errors.join(', '));
      return;
    }

    setLoading(true);
    try {
      await onSubmit(data);
      onClose();
      setFormData({ x: 0, y: 0, w: 1, h: 1, imageUrl: '', linkUrl: '', title: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
      <div className="bg-white border-2 md:border-4 border-black brutal-shadow-lg w-full md:max-w-lg flex flex-col max-h-[95vh] md:max-h-fit rounded-t-2xl md:rounded-none">
        
        <div className="bg-black text-white p-3 md:p-4 flex justify-between items-center">
          <h2 className="font-display font-bold text-lg md:text-xl uppercase tracking-wider">Alanı Sahiplen</h2>
          <button onClick={onClose} className="hover:text-red-500 font-mono text-xl font-bold transition-colors">
            [X]
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6 bg-[#f4f4f0] overflow-y-auto">
          
          <div className="flex gap-3 md:gap-4">
            <div className="flex-1 bg-white p-2 md:p-3 border-2 border-black brutal-shadow-sm">
              <label className="block font-mono text-xs font-bold text-gray-500 uppercase mb-1">X Koordinatı</label>
              <div className="text-lg md:text-xl font-mono font-bold">{selectedCoords.x * 10}</div>
            </div>
            <div className="flex-1 bg-white p-2 md:p-3 border-2 border-black brutal-shadow-sm">
              <label className="block font-mono text-xs font-bold text-gray-500 uppercase mb-1">Y Koordinatı</label>
              <div className="text-lg md:text-xl font-mono font-bold">{selectedCoords.y * 10}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-2">Genişlik (Blok)</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                className="w-full border-2 border-black p-2 md:p-3 font-mono text-base md:text-lg focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
                value={formData.w}
                onChange={e => setFormData({...formData, w: parseInt(e.target.value) || 1})}
              />
              <p className="font-mono text-xs text-gray-600 mt-1 md:mt-2">Genişlik: {formData.w * 10} px</p>
            </div>
            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-2">Yükseklik (Blok)</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                className="w-full border-2 border-black p-2 md:p-3 font-mono text-base md:text-lg focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
                value={formData.h}
                onChange={e => setFormData({...formData, h: parseInt(e.target.value) || 1})}
              />
              <p className="font-mono text-xs text-gray-600 mt-1 md:mt-2">Yükseklik: {formData.h * 10} px</p>
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs font-bold uppercase mb-2">Görsel URL</label>
            <input
              type="url"
              required
              placeholder="https://ornek.com/logo.png"
              className="w-full border-2 border-black p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
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
              className="w-full border-2 border-black p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
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
              className="w-full border-2 border-black p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          {error && (
            <div className="p-2 md:p-3 bg-red-600 text-white font-mono text-xs md:text-sm border-2 border-black brutal-shadow-sm">
              HATA: {error}
            </div>
          )}

          <div className="pt-2 md:pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-display font-bold text-xl py-4 border-2 border-black brutal-shadow transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none uppercase"
            >
              {loading ? 'İşleniyor...' : `Satın Al (${(formData.w * formData.h * 100).toLocaleString()} TL)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
