import { useState, useRef, FormEvent, DragEvent, useEffect } from 'react';
import { PixelFormData } from '../../types';
import { validatePixelForm } from '../../utils/validation';
import { Upload, Link, X, Image, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '../../services/api';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PixelFormData) => Promise<void>;
  selectedCoords: { x: number; y: number } | null;
}

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

type ImageTab = 'url' | 'upload';

const compressImageToWebP = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    // SVG dosyalarını dönüştürme (bozulur)
    if (file.type === 'image/svg+xml') {
      return resolve(file);
    }
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Maksimum boyutları sınırla (1000x1000) - piksel art için çok bile
        let width = img.width;
        let height = img.height;
        const maxSize = 1000;
        
        if (width > height && width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file);
          
          const newFileName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
          const newFile = new File([blob], newFileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });
          resolve(newFile);
        }, 'image/webp', 0.85); // %85 kalite
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export function Modal({ isOpen, onClose, onSubmit, selectedCoords }: ModalProps) {
  const [formData, setFormData] = useState<PixelFormData & { email: string }>({
    x: 0, y: 0, w: 1, h: 1,
    imageUrl: '', linkUrl: '', title: '', email: ''
  });
  const [imageTab, setImageTab] = useState<ImageTab>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When paymentToken is set, we need to initialize the iframe resizer
  useEffect(() => {
    if (paymentToken && typeof (window as any).paytrInitIframe === 'function') {
      // Give it a small delay for iframe to render
      setTimeout(() => {
        (window as any).paytrInitIframe();
      }, 500);
    }
  }, [paymentToken]);

  if (!isOpen || !selectedCoords) return null;

  // ── Dosya Yükleme ────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|gif|webp|svg\+xml)$/)) {
      setError('Desteklenen formatlar: JPG, PNG, GIF, WebP, SVG');
      return;
    }
    // Limit 50MB (tarayıcı çökmesin diye) - Gerçek yükleme 100KB'a düşecek
    if (file.size > 50 * 1024 * 1024) {
      setError('Dosya boyutu çok büyük (Max 50MB).');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Resmi tarayıcıda WebP formatına sıkıştır ve boyutlandır
      const processedFile = await compressImageToWebP(file);

      // Lokal preview (sıkıştırılmış haliyle)
      const reader = new FileReader();
      reader.onload = (e) => setUploadedPreview(e.target?.result as string);
      reader.readAsDataURL(processedFile);

      const fd = new FormData();
      fd.append('file', processedFile);

      const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Yükleme başarısız');

      setFormData(prev => ({ ...prev, imageUrl: json.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosya yüklenemedi');
      setUploadedPreview('');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Form Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const data = { ...formData, x: selectedCoords.x, y: selectedCoords.y };
    const errors = validatePixelForm(data);
    if (!data.email || !data.email.includes('@')) {
      errors.push('Geçerli bir e-posta adresi girin');
    }
    
    if (errors.length > 0) { setError(errors.join(', ')); return; }

    setLoading(true);
    try {
      // Start payment process and get PayTR token
      const res = await api.initPayment(data);
      
      if (res.token) {
        setPaymentToken(res.token);
      } else {
        setError('Ödeme tokenı alınamadı.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ödeme başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    onClose();
    setTimeout(() => {
      setFormData({ x: 0, y: 0, w: 1, h: 1, imageUrl: '', linkUrl: '', title: '', email: '' });
      setUploadedPreview('');
      setPaymentToken(null);
      setError('');
    }, 200);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-50">
      <div className="bg-white border-2 md:border-4 border-black brutal-shadow-lg w-full md:max-w-lg flex flex-col max-h-[95vh] md:max-h-[90vh] rounded-t-2xl md:rounded-none">

        {/* Header */}
        <div className="bg-black text-white p-3 md:p-4 flex justify-between items-center shrink-0">
          <h2 className="font-display font-bold text-lg md:text-xl uppercase tracking-wider">
            {paymentToken ? 'Ödeme İşlemi' : 'Alanı Sahiplen'}
          </h2>
          <button onClick={handleModalClose} className="hover:text-red-500 font-mono text-xl font-bold transition-colors">[X]</button>
        </div>

        {paymentToken ? (
          <div className="p-4 md:p-6 bg-[#f4f4f0] overflow-y-auto flex-1">
            <div className="mb-4">
              <button 
                onClick={() => setPaymentToken(null)}
                className="flex items-center gap-2 text-sm font-mono font-bold hover:text-red-600 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Forma Geri Dön
              </button>
            </div>
            <div className="w-full bg-white border-2 border-black brutal-shadow-sm min-h-[400px]">
              <iframe
                src={`https://www.paytr.com/odeme/guvenli/${paymentToken}`}
                id="paytriframe"
                frameBorder="0"
                scrolling="no"
                style={{ width: '100%', minHeight: '500px' }}
                title="PayTR Ödeme Ekranı"
              ></iframe>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-5 bg-[#f4f4f0] overflow-y-auto">

          {/* Koordinatlar */}
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

          {/* Boyutlar */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-2 text-center">Genişlik (Blok)</label>
              <div className="flex border-2 border-black brutal-shadow-sm focus-within:bg-[#ffd700]/20 transition-colors bg-white">
                <button 
                  type="button" 
                  className="px-3 md:px-4 py-2 border-r-2 border-black bg-gray-100 hover:bg-gray-200 active:bg-gray-300 font-bold font-mono text-lg flex items-center justify-center"
                  onClick={() => setFormData(prev => ({ ...prev, w: Math.max(1, (prev.w || 1) - 1) }))}
                >−</button>
                <input
                  type="number" min="1" max="125" required
                  className="w-full p-2 md:p-3 font-mono text-center text-base md:text-lg focus:outline-none bg-transparent appearance-none"
                  value={formData.w || ''}
                  onChange={e => setFormData({ ...formData, w: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                />
                <button 
                  type="button" 
                  className="px-3 md:px-4 py-2 border-l-2 border-black bg-gray-100 hover:bg-gray-200 active:bg-gray-300 font-bold font-mono text-lg flex items-center justify-center"
                  onClick={() => setFormData(prev => ({ ...prev, w: Math.min(125, (prev.w || 0) + 1) }))}
                >+</button>
              </div>
              <p className="font-mono text-xs text-gray-600 mt-1 text-center">Genişlik: {formData.w ? formData.w * 10 : 0} px</p>
            </div>
            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-2 text-center">Yükseklik (Blok)</label>
              <div className="flex border-2 border-black brutal-shadow-sm focus-within:bg-[#ffd700]/20 transition-colors bg-white">
                <button 
                  type="button" 
                  className="px-3 md:px-4 py-2 border-r-2 border-black bg-gray-100 hover:bg-gray-200 active:bg-gray-300 font-bold font-mono text-lg flex items-center justify-center"
                  onClick={() => setFormData(prev => ({ ...prev, h: Math.max(1, (prev.h || 1) - 1) }))}
                >−</button>
                <input
                  type="number" min="1" max="80" required
                  className="w-full p-2 md:p-3 font-mono text-center text-base md:text-lg focus:outline-none bg-transparent appearance-none"
                  value={formData.h || ''}
                  onChange={e => setFormData({ ...formData, h: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                />
                <button 
                  type="button" 
                  className="px-3 md:px-4 py-2 border-l-2 border-black bg-gray-100 hover:bg-gray-200 active:bg-gray-300 font-bold font-mono text-lg flex items-center justify-center"
                  onClick={() => setFormData(prev => ({ ...prev, h: Math.min(80, (prev.h || 0) + 1) }))}
                >+</button>
              </div>
              <p className="font-mono text-xs text-gray-600 mt-1 text-center">Yükseklik: {formData.h ? formData.h * 10 : 0} px</p>
            </div>
          </div>

          {/* Boyut Uyarısı */}
          {(formData.w < 3 || formData.h < 3) ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border-2 border-amber-400 brutal-shadow-sm">
              <span className="text-amber-500 mt-0.5">⚠️</span>
              <p className="font-mono text-xs text-amber-800 leading-snug">
                <strong>Öneri:</strong> Logo okunabilirliği için en az <strong>3×3 blok</strong> önerilir.
                Şu an <strong>{formData.w * 10}×{formData.h * 10} px</strong> — logonuz çok küçük görünebilir.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-400 brutal-shadow-sm">
              <span className="text-green-600">✓</span>
              <p className="font-mono text-xs text-green-800">
                Seçilen alan <strong>{formData.w * 10}×{formData.h * 10} px</strong> — logo net görünecek.
              </p>
            </div>
          )}

          {/* Logo Yükleme: Sekmeler */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase mb-2">Logo / Görsel</label>

            {/* Tab Bar */}
            <div className="flex border-2 border-black mb-3">
              <button
                type="button"
                onClick={() => setImageTab('upload')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold uppercase font-mono transition-colors ${imageTab === 'upload' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
              >
                <Upload className="h-3.5 w-3.5" />
                Dosya Yükle
              </button>
              <button
                type="button"
                onClick={() => setImageTab('url')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold uppercase font-mono transition-colors ${imageTab === 'url' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
              >
                <Link className="h-3.5 w-3.5" />
                URL Gir
              </button>
            </div>

            {/* Upload Tab */}
            {imageTab === 'upload' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />

                {uploadedPreview ? (
                  /* Preview */
                  <div className="relative border-2 border-black bg-white p-3 flex items-center gap-3">
                    <div className="h-16 w-16 shrink-0 border border-gray-200 rounded overflow-hidden bg-gray-50 flex items-center justify-center">
                      {uploading
                        ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                        : <img src={uploadedPreview} alt="önizleme" className="h-full w-full object-contain" />
                      }
                    </div>
                    <div className="min-w-0 flex-1">
                      {uploading
                        ? <p className="font-mono text-xs text-gray-500">Yükleniyor...</p>
                        : <p className="font-mono text-xs text-green-700 font-bold">✓ Yüklendi</p>
                      }
                      <p className="font-mono text-[10px] text-gray-400 mt-0.5 truncate">{formData.imageUrl}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setUploadedPreview(''); setFormData(p => ({ ...p, imageUrl: '' })); }}
                      className="shrink-0 p-1 hover:bg-red-100 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ) : (
                  /* Drop Zone */
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-black bg-[#ffd700]/20' : 'border-gray-400 hover:border-black hover:bg-gray-50'}`}
                  >
                    <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="font-mono text-xs text-gray-600">
                      Dosyayı buraya sürükle veya <span className="font-bold underline">tıkla</span>
                    </p>
                    <p className="font-mono text-[10px] text-gray-400 mt-1">JPG, PNG, GIF, WebP, SVG — max 50 MB</p>
                  </div>
                )}
              </div>
            )}

            {/* URL Tab */}
            {imageTab === 'url' && (
              <input
                type="url"
                placeholder="https://ornek.com/logo.png"
                className="w-full border-2 border-black p-2 md:p-3 font-mono text-sm focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
                value={imageTab === 'url' ? formData.imageUrl : ''}
                onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
              />
            )}
          </div>

          {/* Hedef Link */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase mb-2">Hedef Link</label>
            <input
              type="text" inputMode="url" required
              placeholder="siteniz.com"
              className="w-full border-2 border-black p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
              value={formData.linkUrl}
              onChange={e => setFormData({ ...formData, linkUrl: e.target.value })}
              onBlur={e => {
                let url = e.target.value.trim();
                if (url && !/^https?:\/\//i.test(url)) {
                  url = 'https://' + url;
                  setFormData({ ...formData, linkUrl: url });
                }
              }}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase mb-2">E-posta Adresi</label>
            <input
              type="email" required
              placeholder="Fatura ve onay için gerekli"
              className="w-full border-2 border-black p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {/* Slogan */}
          <div>
            <label className="block font-mono text-xs font-bold uppercase mb-2">Slogan / Marka Adı</label>
            <input
              type="text" required maxLength={100}
              placeholder="Üzerine gelince çıkacak yazı"
              className="w-full border-2 border-black p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Canlı Önizleme */}
          {formData.imageUrl && (
            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-2">Canlı Önizleme (Gerçek Boyut)</label>
              <div className="w-full border-2 border-black bg-white p-4 md:p-6 flex flex-col items-center justify-center brutal-shadow-sm">
                <div 
                  className="bg-white border border-gray-300 shadow-inner relative overflow-hidden"
                  style={{ 
                    width: formData.w * 10, 
                    height: formData.h * 10,
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'10\' height=\'10\' viewBox=\'0 0 10 10\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h5v5H0zM5 5h5v5H5z\' fill=\'%23f3f4f6\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
                    backgroundRepeat: 'repeat'
                  }}
                  title={formData.title || "Önizleme"}
                >
                  <img 
                    src={uploadedPreview || formData.imageUrl} 
                    alt="Canlı Önizleme" 
                    className="w-full h-full object-contain object-center" 
                  />
                </div>
                <p className="font-mono text-[11px] text-gray-500 mt-4 text-center max-w-xs leading-relaxed">
                  Görseliniz grid üzerinde tam olarak bu boyutlarda <strong className="text-black">({formData.w * 10}x{formData.h * 10} px)</strong> görünecektir. Netliğinden emin olun.
                </p>
              </div>
            </div>
          )}

          {/* Hata */}
          {error && (
            <div className="p-2 md:p-3 bg-red-600 text-white font-mono text-xs md:text-sm border-2 border-black brutal-shadow-sm">
              HATA: {error}
            </div>
          )}

          <div className="pt-2 md:pt-4">
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-display font-bold text-xl py-4 border-2 border-black brutal-shadow transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none uppercase"
            >
              {loading ? 'İşleniyor...' : `Güvenli Ödeme Adımına Geç (${(formData.w * formData.h * 100).toLocaleString()} TL)`}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
