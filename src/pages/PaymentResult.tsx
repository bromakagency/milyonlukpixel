import { useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { XCircle, Copy, Twitter, Link as LinkIcon, Check, Download, Share2, RefreshCw, Clock } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

const SHARE_CARD_WIDTH = 360;
const SHARE_CARD_HEIGHT = 640;
const SHARE_CARD_SCALE = 3;

export function PaymentResult() {
  const location = useLocation();
  const isSuccess = location.pathname.includes('basarili');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'checking' | 'paid' | 'delayed' | 'failed'>(
    isSuccess ? 'checking' : 'failed'
  );
  const [retryKey, setRetryKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Sadece localStorage'da değer varsa al, yoksa null
  const [areaId] = useState(() => {
    const stored = localStorage.getItem('lastPurchasedId') || sessionStorage.getItem('lastPurchasedId');
    if (stored) return stored;
    // localStorage yoksa (farkli tab/browser) OID'nin son 8 karakterinden turetelim
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('oid');
    if (oid && oid.length >= 8) {
      const hash = oid.slice(-8);
      return 'PXL-' + hash.slice(0, 4) + '-' + hash.slice(4);
    }
    return null;
  });

  const [userLogo, setUserLogo] = useState(() => {
    return localStorage.getItem('lastPurchasedLogo') || sessionStorage.getItem('lastPurchasedLogo');
  });

  const [merchantOid] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('oid') || localStorage.getItem('lastMerchantOid') || sessionStorage.getItem('lastMerchantOid');
    if (oid) {
      try {
        localStorage.setItem('lastMerchantOid', oid);
        sessionStorage.setItem('lastMerchantOid', oid);
      } catch {}
    }
    return oid;
  });

  const [orderAccessToken] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('access_token') || localStorage.getItem('lastOrderAccessToken') || sessionStorage.getItem('lastOrderAccessToken');
    if (token) {
      try {
        localStorage.setItem('lastOrderAccessToken', token);
        sessionStorage.setItem('lastOrderAccessToken', token);
      } catch {}
    }
    return token;
  });

  const [base64Logo, setBase64Logo] = useState<string | null>(null);
  const [logoLoading, setLogoLoading] = useState(false);

  useEffect(() => {
    // If inside iframe, break out
    if (window.top !== window.self) {
      window.top!.location.href = window.location.href;
    }

    if (isSuccess && (!merchantOid || !orderAccessToken)) {
      window.location.href = '/';
    }
  }, [isSuccess, areaId, merchantOid, orderAccessToken]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('access_token')) return;

    url.searchParams.delete('access_token');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  useEffect(() => {
    if (!isSuccess && merchantOid && orderAccessToken) {
      fetch('/api/payment/cancel-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantOid, accessToken: orderAccessToken }),
      }).catch((err) => console.error('Cancel order call failed:', err));
    }
  }, [isSuccess, merchantOid, orderAccessToken]);

  useEffect(() => {
    if (!isSuccess || !merchantOid || !orderAccessToken) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 45; // ~85-90 saniye boyunca sorgula

    setPaymentStatus('checking');

    const checkOrder = async () => {
      attempts += 1;
      try {
        const res = await fetch(
          `/api/payment/order-status/${encodeURIComponent(merchantOid)}?access_token=${encodeURIComponent(orderAccessToken)}`
        );
        const json = await res.json();

        if (cancelled) return;

        if (res.ok && json.status === 'paid') {
          setPaymentStatus('paid');
          if (json.imageUrl) {
            setUserLogo((prev) => prev || json.imageUrl);
          }
          return;
        }

        if (res.ok && ['failed', 'rejected'].includes(json.status)) {
          setPaymentStatus('failed');
          return;
        }
      } catch (error) {
        console.error('Payment status check failed:', error);
      }

      if (cancelled) return;

      if (attempts < maxAttempts) {
        // İlk 10 deneme 1.5 sn, sonraki denemeler 2 sn arayla
        const delay = attempts < 10 ? 1500 : 2000;
        setTimeout(checkOrder, delay);
      } else {
        // Süre dolduğunda hemen "başarısız" demek yerine onay aşamasında beklet
        setPaymentStatus('delayed');
      }
    };

    checkOrder();

    return () => {
      cancelled = true;
    };
  }, [isSuccess, merchantOid, orderAccessToken, retryKey]);

  useEffect(() => {
    if (userLogo) {
      setLogoLoading(true);
      // Tüm absolute URL'leri proxy'den geçir (lokal ortamda CORS hatası almamak için)
      const isAbsolute = userLogo.startsWith('http');
      const fetchUrl = isAbsolute
        ? `/api/proxy-image?url=${encodeURIComponent(userLogo)}`
        : userLogo;

      fetch(fetchUrl)
        .then(res => {
          if (!res.ok) throw new Error('Proxy fetch failed');
          return res.blob();
        })
        .then(blob => {
          const reader = new FileReader();
          reader.onloadend = () => {
            setBase64Logo(reader.result as string);
          };
          reader.readAsDataURL(blob);
        })
        .catch((error) => {
          console.error(error);
          setBase64Logo(null);
        })
        .finally(() => setLogoLoading(false));
    } else {
      setLogoLoading(false);
    }
  }, [userLogo]);

  const handleCopyId = () => {
    if (areaId) {
      navigator.clipboard.writeText(areaId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareText = `Milyonluk Piksel'de yerimi aldım! Sen de bu dijital tarihe geçmek istemez misin? Alanım: ${areaId || ''} 🚀`;
  const shareUrl = 'https://milyonlukpiksel.com';
  const fullCopyText = `Milyonluk Piksel'de yerimi aldım! Sen de bu dijital tarihe geçmek istemez misin? https://milyonlukpiksel.com`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullCopyText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
  };

  const createCardImage = async () => {
    if (!cardRef.current) return null;

    return htmlToImage.toPng(cardRef.current, {
      quality: 1,
      width: SHARE_CARD_WIDTH,
      height: SHARE_CARD_HEIGHT,
      pixelRatio: SHARE_CARD_SCALE,
      backgroundColor: '#ffffff',
      filter: (node) => {
        if (node instanceof HTMLElement && node.dataset.html2canvasIgnore === 'true') {
          return false;
        }
        return true;
      }
    });
  };

  const dataUrlToFile = async (dataUrl: string) => {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], 'milyonluk-piksel-1080x1920.png', { type: 'image/png' });
  };

  const handleSystemShare = async () => {
    if (userLogo && logoLoading) {
      alert('Logo hazırlanıyor. Lütfen birkaç saniye sonra tekrar deneyin.');
      return;
    }

    if (!navigator.share) {
      alert('Bu cihaz doğrudan paylaşımı desteklemiyor. Kartı indirip paylaşabilirsiniz.');
      return;
    }

    setSharing(true);
    try {
      const dataUrl = await createCardImage();
      if (!dataUrl) return;

      const file = await dataUrlToFile(dataUrl);

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'Milyonluk Piksel',
          text: fullCopyText,
          url: shareUrl,
          files: [file],
        });
      } else {
        await navigator.share({
          title: 'Milyonluk Piksel',
          text: fullCopyText,
          url: shareUrl,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('System share failed:', error);
      alert('Paylaşım açılamadı. Kartı indirip manuel paylaşabilirsiniz.');
    } finally {
      setSharing(false);
    }
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    if (userLogo && logoLoading) {
      alert('Logo hazırlanıyor. Lütfen birkaç saniye sonra tekrar deneyin.');
      return;
    }

    try {
      const dataUrl = await createCardImage();
      if (!dataUrl) return;

      const link = document.createElement('a');
      link.download = 'milyonluk-piksel-1080x1920.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Kart indirilemedi:', error);
      alert('Kart indirilirken bir hata oluştu. Lütfen farklı bir tarayıcıda deneyin.');
    }
  };
  // Eğer başarılı sayfasındaysa ve ID yoksa render etme (redirect olacak zaten)
  if (isSuccess && !merchantOid) {
    return null;
  }

  if (isSuccess && paymentStatus === 'checking') {
    return (
      <div className="min-h-screen bg-[#f4f4f0] flex flex-col items-center justify-center p-4 selection:bg-red-600 selection:text-white">
        <div className="bg-white border-4 border-black brutal-shadow max-w-md w-full p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto border-2 border-black animate-pulse">
            <RefreshCw className="h-8 w-8 text-black animate-spin" />
          </div>
          <h1 className="font-display font-black text-2xl md:text-3xl uppercase">Ödeme Kontrol Ediliyor</h1>
          <p className="font-mono text-gray-600 text-sm leading-relaxed">
            Banka ve PayTR onayı doğrulanıyor.<br/>Lütfen sayfayı kapatmayınız, işlem tamamlanmak üzere...
          </p>
        </div>
      </div>
    );
  }

  if (isSuccess && paymentStatus === 'delayed') {
    return (
      <div className="min-h-screen bg-[#f4f4f0] flex flex-col items-center justify-center p-4 selection:bg-red-600 selection:text-white">
        <div className="bg-white border-4 border-black brutal-shadow max-w-md w-full p-8 text-center space-y-6">
          <div className="w-16 h-16 bg-[#ffd700] rounded-full flex items-center justify-center mx-auto border-2 border-black brutal-shadow-sm">
            <Clock className="h-8 w-8 text-black" />
          </div>
          <h1 className="font-display font-black text-2xl md:text-3xl uppercase">Ödemeniz Onay Aşamasında</h1>
          <p className="font-mono text-gray-600 text-sm leading-relaxed">
            Banka onayınız alındı. Siparişiniz arka planda sisteme işlenmektedir. Birkaç saniye içinde pikseliniz haritada aktif olacaktır.
          </p>
          <div className="space-y-3 pt-2">
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="w-full flex items-center justify-center gap-2 bg-[#ffd700] hover:bg-[#ffed4a] text-black font-display font-bold text-lg py-3.5 border-2 border-black brutal-shadow transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none uppercase"
            >
              <RefreshCw className="w-5 h-5" /> Durumu Yeniden Kontrol Et
            </button>
            <Link
              to="/"
              className="inline-block w-full bg-black hover:bg-red-600 text-white font-display font-bold text-lg py-3.5 border-2 border-black brutal-shadow transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none uppercase"
            >
              Haritaya Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f4f0] flex flex-col items-center justify-center p-4 selection:bg-red-600 selection:text-white">
      {isSuccess && paymentStatus === 'paid' ? (
        <div className="flex flex-col items-center w-full max-w-[390px]">
          {/* Card to be downloaded */}
          <div 
            ref={cardRef}
            className="bg-white p-7 text-center relative overflow-hidden mb-6 border-2 border-black flex flex-col justify-between"
            style={{
              backgroundColor: '#ffffff',
              width: SHARE_CARD_WIDTH,
              height: SHARE_CARD_HEIGHT,
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            {/* Confetti Effects (CSS only) */}
            <div className="absolute top-6 left-10 w-3 h-3 bg-red-500 rotate-45"></div>
            <div className="absolute top-12 right-12 w-2 h-2 bg-black rotate-12"></div>
            <div className="absolute bottom-32 left-8 w-4 h-4 bg-gray-200"></div>
            <div className="absolute top-24 left-6 w-2 h-2 bg-red-400 rounded-full"></div>
            <div className="absolute top-8 right-24 w-3 h-3 bg-gray-300 rotate-[30deg]"></div>
            
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4 relative z-10 border-2 border-black brutal-shadow-sm">
              <Check className="h-8 w-8 text-white" strokeWidth={3} />
            </div>
            
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-red-600 mb-2">Milyonluk Piksel</p>
            <h1 className="font-display font-black text-[34px] leading-none mb-3 text-gray-900">Yerimi Aldım!</h1>
            <p className="font-mono text-[13px] text-gray-600 mb-7 leading-relaxed">
              Piksel alanını başarıyla satın aldın.<br/>Şimdi paylaş, daha fazla kişi görsün!
            </p>

            {/* Graphic Area */}
            <div className="w-full bg-white border-4 border-black rounded-[24px] h-[300px] mb-7 relative overflow-hidden flex items-center justify-center brutal-shadow-sm">
              {/* Grid pattern */}
              <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '15px 15px' }}></div>
              
              {/* Scattered blocks */}
              <div className="absolute top-8 left-8 w-3 h-3 bg-red-600"></div>
              <div className="absolute top-12 left-16 w-4 h-4 bg-black"></div>
              <div className="absolute bottom-10 left-12 w-2 h-2 bg-black"></div>
              <div className="absolute top-6 right-20 w-4 h-4 bg-black"></div>
              <div className="absolute bottom-12 right-16 w-6 h-4 bg-black"></div>
              <div className="absolute top-1/2 right-10 w-3 h-3 bg-red-600"></div>
              <div className="absolute top-1/3 left-6 w-2 h-2 bg-gray-400"></div>
              
              {/* Dynamic Logo or Placeholder */}
              <div className="relative z-10 flex items-center justify-center w-[210px] h-[145px] p-4 bg-white border-4 border-black brutal-shadow-sm rotate-[-2deg]">
                {logoLoading ? (
                  <div className="font-mono text-xs font-bold text-gray-500">Logo hazırlanıyor</div>
                ) : base64Logo ? (
                  <img src={base64Logo} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : userLogo ? (
                  <div className="font-mono text-xs font-bold text-gray-500">Logo yüklenemedi</div>
                ) : (
                  <div className="bg-red-600 text-white font-display font-black text-2xl px-4 py-3 rotate-[-3deg] border-2 border-black leading-none flex flex-col items-center justify-center">
                    <span>MİLYONLUK</span>
                    <span>PİKSEL</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-2 border-black bg-[#ffd700] px-4 py-3 mb-3">
              <span className="font-display font-black text-xl leading-none">milyonlukpiksel.com</span>
            </div>
          </div>

          {/* Action Buttons (Outside the card, so they don't get snapshotted) */}
          <div className="flex flex-wrap justify-center gap-2 mb-6 w-full">
            <button 
              onClick={shareTwitter}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 bg-[#0f1419] text-white px-3 py-3 rounded-xl font-bold text-[13px] hover:bg-black transition-colors border border-black brutal-shadow-sm"
            >
              <Twitter className="w-4 h-4 fill-current" /> X'te Paylaş
            </button>
            
            <button 
              onClick={handleCopyLink}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 bg-white text-gray-700 border-2 border-gray-200 px-3 py-3 rounded-xl font-bold text-[13px] hover:bg-gray-50 transition-colors brutal-shadow-sm"
            >
              {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <LinkIcon className="w-4 h-4" />} Metni Kopyala
            </button>

            <button 
              onClick={handleSystemShare}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 bg-white text-gray-700 border-2 border-black px-3 py-3 rounded-xl font-bold text-[13px] hover:bg-gray-50 transition-colors brutal-shadow-sm"
            >
              <Share2 className="w-4 h-4" /> {sharing ? 'Hazırlanıyor...' : 'Paylaş'}
            </button>

            <button 
              onClick={downloadCard}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 bg-[#ffd700] text-black border-2 border-black px-3 py-3 rounded-xl font-bold text-[13px] hover:bg-[#ffed4a] transition-colors brutal-shadow-sm"
            >
              <Download className="w-4 h-4" /> Kartı İndir
            </button>
          </div>

          <Link 
            to="/" 
            className="block w-full text-center bg-[#e60000] hover:bg-red-700 text-white font-bold text-sm md:text-base py-4 rounded-xl transition-colors brutal-shadow-sm border-2 border-black"
          >
            Haritaya Geri Dön
          </Link>
        </div>
      ) : (
        <div className="bg-white border-4 border-black brutal-shadow max-w-md w-full p-8 text-center space-y-6">
          <XCircle className="h-20 w-20 text-red-600 mx-auto" />
          <h1 className="font-display font-black text-3xl uppercase">Ödeme Başarısız</h1>
          <p className="font-mono text-gray-600">
            Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin veya bankanızla iletişime geçin.
          </p>
          <Link 
            to="/" 
            className="inline-block w-full bg-black hover:bg-red-600 text-white font-display font-bold text-xl py-4 border-2 border-black brutal-shadow transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none uppercase"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      )}
    </div>
  );
}
