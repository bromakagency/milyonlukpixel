import { useState, useRef, FormEvent, DragEvent, useEffect } from 'react';
import { PixelFormData } from '../../types';
import { validatePixelForm } from '../../utils/validation';
import { Upload, Link, X, Image, Loader2, ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '../../services/api';
import { usePixelContext } from '../../context/PixelContext';
import { getGrossPriceFromBlocks } from '../../utils/pricing';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PixelFormData) => Promise<void>;
  selectedCoords: { x: number; y: number; w?: number; h?: number } | null;
}

const API_URL = import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '';

type ImageTab = 'url' | 'upload';

const MAX_UPLOAD_BYTES = 3.5 * 1024 * 1024;

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

const compressImageToWebP = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        
        // Maksimum boyutları sınırla (1000x1000) - piksel art için çok bile
        let width = img.width;
        let height = img.height;
        const maxSize = 900;
        
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
        
        const webpBlob = await canvasToBlob(canvas, 'image/webp', 0.75);
        const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', 0.78);
        const candidates = [webpBlob, jpegBlob].filter(Boolean) as Blob[];
        const bestBlob = candidates.sort((a, b) => a.size - b.size)[0];

        if (!bestBlob) return resolve(file);

        const extension = bestBlob.type === 'image/webp' ? 'webp' : 'jpg';
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + `.${extension}`;
        resolve(new File([bestBlob], newFileName, {
          type: bestBlob.type,
          lastModified: Date.now(),
        }));
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

export function Modal({ isOpen, onClose, onSubmit, selectedCoords }: ModalProps) {
  const { pixels } = usePixelContext();
  const approvedPixels = pixels.filter((p) => !p.status || p.status === 'approved');
  const [formData, setFormData] = useState<PixelFormData & { email: string }>({
    x: 0, y: 0, w: 1, h: 1,
    imageUrl: '', linkUrl: '', title: '', email: ''
  });
  const [imageTab, setImageTab] = useState<ImageTab>('upload');
  const [uploading, setUploading] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentToken, setPaymentToken] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PayTR iframe resizer - script yüklenmesini ve DOM'u bekleyerek başlat
  useEffect(() => {
    if (!paymentToken) return;

    let attempts = 0;
    const maxAttempts = 40; // 4 saniye (100ms x 40)

    const init = () => {
      const iframeEl = document.getElementById('paytriframe');
      const resizerReady = typeof (window as any).iFrameResize === 'function';

      if (iframeEl && resizerReady) {
        (window as any).iFrameResize({}, '#paytriframe');
        return;
      }

      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(init, 100);
      } else {
        console.warn('PayTR iFrame resizer başlatılamadı.');
      }
    };

    // İlk denemeden önce iframe’ın render olması için kısa bir bekleme
    setTimeout(init, 200);
  }, [paymentToken]);

  useEffect(() => {
    if (!isOpen || !selectedCoords) return;
    setFormData(prev => ({
      ...prev,
      x: selectedCoords.x,
      y: selectedCoords.y,
      w: selectedCoords.w || 1,
      h: selectedCoords.h || 1,
    }));
  }, [isOpen, selectedCoords?.x, selectedCoords?.y, selectedCoords?.w, selectedCoords?.h]);


  if (!isOpen || !selectedCoords) return null;

  // ── Anlık clamp hesabı (reaktif, submit beklemez) ──────────────────────
  const areaX = formData.x;
  const areaY = formData.y;
  const maxW = 125 - areaX;
  const maxH = 80 - areaY;
  let effectiveW = Math.min(Math.max(formData.w || 1, 1), maxW);
  let effectiveH = Math.min(Math.max(formData.h || 1, 1), maxH);

  // Başka pixellerin üzerine gelmeyi (overlap) engelle
  let hitPixelW = false;
  let hitPixelH = false;

  // X yönündeki (sağa doğru) genişlemeyi y'deki kesişimlere göre sınırla
  let maxWForH = maxW;
  for (const p of approvedPixels) {
    // Eğer y ekseninde kesişiyorsak
    if (areaY < p.y + p.h && areaY + effectiveH > p.y) {
      if (p.x >= areaX) {
        maxWForH = Math.min(maxWForH, p.x - areaX);
      } else if (p.x + p.w > areaX) {
        maxWForH = 0;
      }
    }
  }
  if (effectiveW > maxWForH) {
    effectiveW = maxWForH;
    hitPixelW = true;
  }

  // Y yönündeki (aşağı doğru) genişlemeyi yeni (sınırlandırılmış) x genişliğine göre sınırla
  let maxHForW = maxH;
  for (const p of approvedPixels) {
    // Eğer x ekseninde kesişiyorsak
    if (areaX < p.x + p.w && areaX + effectiveW > p.x) {
      if (p.y >= areaY) {
        maxHForW = Math.min(maxHForW, p.y - areaY);
      } else if (p.y + p.h > areaY) {
        maxHForW = 0;
      }
    }
  }
  if (effectiveH > maxHForW) {
    effectiveH = maxHForW;
    hitPixelH = true;
  }

  const isClamped  = effectiveW !== formData.w || effectiveH !== formData.h;
  const isPixelCollision = hitPixelW || hitPixelH;
  const grossAmount = getGrossPriceFromBlocks(effectiveW, effectiveH);

  // ── Dosya Yükleme ────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|gif|webp)$/)) {
      setError('Desteklenen formatlar: JPG, PNG, GIF, WebP');
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
      if (processedFile.size > MAX_UPLOAD_BYTES) {
        throw new Error('Görsel mobil yükleme için hâlâ büyük. Lütfen daha küçük bir görsel deneyin.');
      }

      // Lokal preview (sıkıştırılmış haliyle)
      const reader = new FileReader();
      reader.onload = (e) => setUploadedPreview(e.target?.result as string);
      reader.readAsDataURL(processedFile);
      setPendingUploadFile(processedFile);
      setFormData(prev => ({ ...prev, imageUrl: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosya yüklenemedi');
      setUploadedPreview('');
      setPendingUploadFile(null);
    } finally {
      setUploading(false);
    }
  };

  const uploadPendingFile = async (file: File, merchantOid: string) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('merchantOid', merchantOid);

    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: fd });
    } catch {
      throw new Error('Görsel yükleme sunucusuna ulaşılamadı. Sayfayı yenileyip tekrar deneyin.');
    }
    let json: any;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      json = await res.json();
    } else {
      const text = await res.text();
      throw new Error(text || `Sunucu hatasi: ${res.status}`);
    }

    if (!res.ok) throw new Error(json.error || 'Yukleme basarisiz');
    return String(json.url || '');
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

    const x = areaX;
    const y = areaY;
    // effectiveW ve effectiveH render sırasında en güncel limitlere (grid sonu + diğer pikseller) göre hesaplandı.
    // formData.w veya formData.h farklıysa arka planda güncelleyelim ama asıl submit edilecek data "effective" olanlar.
    if (isClamped) {
      setFormData(prev => ({ ...prev, w: effectiveW, h: effectiveH }));
    }

    const hasPendingUpload = imageTab === 'upload' && !!pendingUploadFile;
    const data = {
      ...formData,
      x,
      y,
      w: effectiveW,
      h: effectiveH,
      imageUrl: hasPendingUpload ? 'https://milyonlukpiksel.com/pending-upload.webp' : formData.imageUrl,
    };
    const errors = validatePixelForm(data);
    if (!data.email || !data.email.includes('@')) {
      errors.push('Geçerli bir e-posta adresi girin');
    }

    if (errors.length > 0) { setError(errors.join(', ')); return; }

    setLoading(true);
    try {
      // Save logo and temporary ID to show on the success screen
      const tempId = 'PXL-' + Math.random().toString(16).substring(2, 6).toUpperCase() + '-' + Math.random().toString(16).substring(2, 6).toUpperCase();
      localStorage.setItem('lastPurchasedId', tempId);

      // Start payment process and get PayTR token
      const res = await api.initPayment(data);
      
      if (res.token) {
        if (res.oid) {
          localStorage.setItem('lastMerchantOid', res.oid);
        }
        if (res.orderAccessToken) {
          localStorage.setItem('lastOrderAccessToken', res.orderAccessToken);
        }
        if (hasPendingUpload && pendingUploadFile) {
          if (!res.oid) throw new Error('Siparis numarasi alinamadi.');
          const imageUrl = await uploadPendingFile(pendingUploadFile, res.oid);
          data.imageUrl = imageUrl;
          setFormData(prev => ({ ...prev, imageUrl }));
          setPendingUploadFile(null);
        }
        localStorage.setItem('lastPurchasedLogo', data.imageUrl);
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
      setPendingUploadFile(null);
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
              <div className="text-lg md:text-xl font-mono font-bold">{areaX * 10}</div>
            </div>
            <div className="flex-1 bg-white p-2 md:p-3 border-2 border-black brutal-shadow-sm">
              <label className="block font-mono text-xs font-bold text-gray-500 uppercase mb-1">Y Koordinatı</label>
              <div className="text-lg md:text-xl font-mono font-bold">{areaY * 10}</div>
            </div>
          </div>

          {/* Boyutlar */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div>
              <label htmlFor="pixel-width" className="block font-mono text-xs font-bold uppercase mb-2 text-center">Genişlik (Blok)</label>
              <div className="flex border-2 border-black brutal-shadow-sm focus-within:bg-[#ffd700]/20 transition-colors bg-white">
                <button 
                  type="button" 
                  className="px-3 md:px-4 py-2 border-r-2 border-black bg-gray-100 hover:bg-gray-200 active:bg-gray-300 font-bold font-mono text-lg flex items-center justify-center"
                  onClick={() => setFormData(prev => ({ ...prev, w: Math.max(1, (prev.w || 1) - 1) }))}
                >−</button>
                <input
                  id="pixel-width"
                  name="width"
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
              <p className="font-mono text-xs mt-1 text-center">
                {isClamped && effectiveW !== formData.w
                  ? <><span className="line-through text-gray-400">{(formData.w||0)*10} px</span> <span className="text-orange-600 font-bold">→ max {effectiveW*10} px</span></>
                  : <span className="text-gray-600">{effectiveW*10} px</span>}
              </p>
            </div>
            <div>
              <label htmlFor="pixel-height" className="block font-mono text-xs font-bold uppercase mb-2 text-center">Yükseklik (Blok)</label>
              <div className="flex border-2 border-black brutal-shadow-sm focus-within:bg-[#ffd700]/20 transition-colors bg-white">
                <button 
                  type="button" 
                  className="px-3 md:px-4 py-2 border-r-2 border-black bg-gray-100 hover:bg-gray-200 active:bg-gray-300 font-bold font-mono text-lg flex items-center justify-center"
                  onClick={() => setFormData(prev => ({ ...prev, h: Math.max(1, (prev.h || 1) - 1) }))}
                >−</button>
                <input
                  id="pixel-height"
                  name="height"
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
              <p className="font-mono text-xs mt-1 text-center">
                {isClamped && effectiveH !== formData.h
                  ? <><span className="line-through text-gray-400">{(formData.h||0)*10} px</span> <span className="text-orange-600 font-bold">→ max {effectiveH*10} px</span></>
                  : <span className="text-gray-600">{effectiveH*10} px</span>}
              </p>
            </div>
          </div>

          {/* Anlık Sığdırma + Boyut Uyarısı */}
          {isClamped ? (
            <div className={`p-3 border-2 brutal-shadow-sm space-y-1 ${isPixelCollision ? 'bg-purple-50 border-purple-400' : 'bg-orange-50 border-orange-400'}`}>
              <p className={`font-mono text-xs font-bold flex items-center gap-1.5 ${isPixelCollision ? 'text-purple-800' : 'text-orange-800'}`}>
                {isPixelCollision ? '🧱 Başka bir piksele çarptınız — alan otomatik sınırlandırıldı' : '📐 Grid köşesine yakınsınız — alan otomatik sınırlandırıldı'}
              </p>
              <div className={`flex gap-4 font-mono text-xs ${isPixelCollision ? 'text-purple-700' : 'text-orange-700'}`}>
                <span>İstediğiniz: <strong>{formData.w}×{formData.h} blok</strong> ({(formData.w||0)*10}×{(formData.h||0)*10} px)</span>
              </div>
              <div className="flex gap-4 font-mono text-xs text-green-800 font-bold">
                <span>✓ Gerçek alan: <strong>{effectiveW}×{effectiveH} blok</strong> ({effectiveW*10}×{effectiveH*10} px)</span>
              </div>
            </div>
          ) : (effectiveW < 3 || effectiveH < 3) ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border-2 border-amber-400 brutal-shadow-sm">
              <span className="text-amber-500 mt-0.5">⚠️</span>
              <p className="font-mono text-xs text-amber-800 leading-snug">
                <strong>Öneri:</strong> Logo okunabilirliği için en az <strong>3×3 blok</strong> önerilir.
                Şu an <strong>{effectiveW*10}×{effectiveH*10} px</strong> — logonuz çok küçük görünebilir.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-green-50 border-2 border-green-400 brutal-shadow-sm">
              <span className="text-green-600">✓</span>
              <p className="font-mono text-xs text-green-800">
                Seçilen alan <strong>{effectiveW*10}×{effectiveH*10} px</strong> — logo net görünecek.
              </p>
            </div>
          )}

          {/* Logo Yükleme: Sekmeler */}
          <div>
            <label htmlFor={imageTab === 'upload' ? 'pixel-image-file' : 'pixel-image-url'} className="block font-mono text-xs font-bold uppercase mb-2">Logo / Görsel</label>

            {/* Tab Bar */}
            <div className="flex border-2 border-black mb-3">
              <button
                type="button"
                onClick={() => { setImageTab('upload'); setFormData(p => ({ ...p, imageUrl: '' })); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold uppercase font-mono transition-colors ${imageTab === 'upload' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
              >
                <Upload className="h-3.5 w-3.5" />
                Dosya Yükle
              </button>
              <button
                type="button"
                onClick={() => { setImageTab('url'); setPendingUploadFile(null); setUploadedPreview(''); }}
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
                  id="pixel-image-file"
                  name="imageFile"
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
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
                        : <p className="font-mono text-xs text-green-700 font-bold">Hazır</p>
                      }
                      <p className="font-mono text-[10px] text-gray-400 mt-0.5 truncate">Ödeme adımına geçerken yüklenecek</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setUploadedPreview(''); setPendingUploadFile(null); setFormData(p => ({ ...p, imageUrl: '' })); }}
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
                    <p className="font-mono text-[10px] text-gray-400 mt-1">JPG, PNG, GIF, WebP — max 50 MB</p>
                  </div>
                )}
              </div>
            )}

            {/* URL Tab */}
            {imageTab === 'url' && (
              <input
                id="pixel-image-url"
                name="imageUrl"
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
            <label htmlFor="pixel-link-url" className="block font-mono text-xs font-bold uppercase mb-2">Hedef Link</label>
            <input
              id="pixel-link-url"
              name="linkUrl"
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
            <label htmlFor="pixel-email" className="block font-mono text-xs font-bold uppercase mb-2">E-posta Adresi</label>
            <input
              id="pixel-email"
              name="email"
              type="email" required
              autoComplete="email"
              placeholder="Fatura ve onay için gerekli"
              className="w-full border-2 border-black p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          {/* Slogan */}
          <div>
            <label htmlFor="pixel-title" className="block font-mono text-xs font-bold uppercase mb-2">Slogan / Marka Adı</label>
            <input
              id="pixel-title"
              name="title"
              type="text" required maxLength={100}
              placeholder="Üzerine gelince çıkacak yazı"
              className="w-full border-2 border-black p-2 md:p-3 font-mono text-sm md:text-base focus:outline-none focus:bg-[#ffd700]/20 brutal-shadow-sm transition-colors"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Canlı Önizleme */}
          {(formData.imageUrl || uploadedPreview) && (
            <div>
              <label className="block font-mono text-xs font-bold uppercase mb-2">Canlı Önizleme (Gerçek Boyut)</label>
              <div className="w-full border-2 border-black bg-white p-4 md:p-6 flex flex-col items-center justify-center brutal-shadow-sm">
                <div className="flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => undefined}
                    disabled
                    className="hidden"
                    title="Yukarı 1 blok ekle"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => undefined}
                    disabled
                    className="hidden"
                    title="Sola 1 blok ekle"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  <div className="flex items-center justify-center">
                    <div 
                      className="bg-white border border-gray-300 shadow-inner relative overflow-hidden transition-all duration-200"
                      style={{ 
                        width: effectiveW * 10, 
                        height: effectiveH * 10,
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
                  </div>

                  <button
                    type="button"
                    onClick={() => undefined}
                    disabled
                    className="hidden"
                    title="Sağa 1 blok ekle"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => undefined}
                    disabled
                    className="hidden"
                    title="Aşağı 1 blok ekle"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="hidden">
                  <span className="border border-gray-200 bg-white px-2 py-1 text-center">X: {areaX * 10}</span>
                  <span className="border border-gray-200 bg-white px-2 py-1 text-center">Y: {areaY * 10}</span>
                  <span className="border border-gray-200 bg-white px-2 py-1 text-center">{effectiveW}x{effectiveH} blok</span>
                </div>
                <p className="font-mono text-[11px] mt-4 text-center max-w-xs leading-relaxed">
                  {isClamped
                    ? <><span className="text-orange-600 font-bold">📐 Sığdırıldı:</span> <strong className="text-black">{effectiveW*10}×{effectiveH*10} px</strong> <span className="text-gray-400 line-through">({(formData.w||0)*10}×{(formData.h||0)*10} px)</span></>
                    : <span className="text-gray-500">Görseliniz grid üzerinde tam olarak <strong className="text-black">({effectiveW*10}×{effectiveH*10} px)</strong> görünecektir.</span>
                  }
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

          <div className="border-2 border-black bg-white p-3 md:p-4 brutal-shadow-sm">
            <div className="flex items-center justify-between font-mono text-sm md:text-base font-bold">
              <span>Toplam Tutar ({formData.w * formData.h} Blok)</span>
              <span className="text-red-600">{grossAmount.toLocaleString('tr-TR')} TL</span>
            </div>
            <p className="mt-2 font-mono text-[11px] text-gray-500">1 blok (10x10 px) = 100 TL</p>
          </div>

          <div className="pt-2 md:pt-4">
            <button
              type="submit"
              disabled={loading || uploading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-display font-bold text-xl py-4 border-2 border-black brutal-shadow transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none uppercase"
            >
              {loading ? 'İşleniyor...' : `Güvenli Ödeme Adımına Geç (${grossAmount.toLocaleString('tr-TR')} TL)`}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
