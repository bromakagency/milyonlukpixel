import { useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { XCircle, Copy, Twitter, Link as LinkIcon, Check, Download } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

export function PaymentResult() {
  const location = useLocation();
  const isSuccess = location.pathname.includes('basarili');
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const [areaId] = useState(() => {
    return localStorage.getItem('lastPurchasedId') || ('PXL-' + Math.random().toString(16).substring(2, 6).toUpperCase() + '-' + Math.random().toString(16).substring(2, 6).toUpperCase());
  });

  const [userLogo] = useState(() => {
    return localStorage.getItem('lastPurchasedLogo');
  });

  const [base64Logo, setBase64Logo] = useState<string | null>(null);

  useEffect(() => {
    // If inside iframe, break out
    if (window.top !== window.self) {
      window.top!.location.href = window.location.href;
    }
  }, []);

  useEffect(() => {
    if (userLogo) {
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
        .catch(console.error);
    }
  }, [userLogo]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(areaId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Milyonluk Piksel'de yerimi aldım! Sen de bu dijital tarihe geçmek istemez misin? Alanım: ${areaId} 🚀`;
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

  const downloadCard = async () => {
    if (!cardRef.current) return;
    
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff', // Arka planı zorunlu beyaz yapıyoruz (saydamlığı önlemek için)
        filter: (node) => {
          if (node instanceof HTMLElement && node.dataset.html2canvasIgnore === 'true') {
            return false;
          }
          return true;
        }
      });
      
      const link = document.createElement('a');
      link.download = `milyonluk-piksel-${areaId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Kart indirilemedi:', error);
      alert('Kart indirilirken bir hata oluştu. Lütfen farklı bir tarayıcıda deneyin.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] flex flex-col items-center justify-center p-4 selection:bg-red-600 selection:text-white">
      {isSuccess ? (
        <div className="flex flex-col items-center w-full max-w-[440px]">
          {/* Card to be downloaded */}
          <div 
            ref={cardRef}
            className="bg-white w-full p-6 md:p-8 text-center relative overflow-hidden rounded-[32px] mb-6"
            style={{ backgroundColor: '#ffffff' }}
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
            
            <h1 className="font-display font-black text-2xl md:text-3xl mb-2 text-gray-900">Tebrikler!</h1>
            <p className="font-mono text-sm text-gray-600 mb-6 leading-relaxed">
              Piksel alanını başarıyla satın aldın.<br/>Şimdi paylaş, daha fazla kişi görsün!
            </p>

            {/* Graphic Area */}
            <div className="w-full bg-white border border-gray-100 rounded-2xl h-44 mb-6 relative overflow-hidden flex items-center justify-center shadow-[inset_0_0_20px_rgba(0,0,0,0.02)]">
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
              <div className="relative z-10 flex items-center justify-center p-2 bg-white/50 backdrop-blur-sm rounded-lg">
                {(base64Logo || userLogo) ? (
                  <img src={base64Logo || userLogo || undefined} alt="Logo" className="max-w-[120px] max-h-[80px] object-contain border-2 border-black brutal-shadow-sm rotate-[-2deg] bg-white" crossOrigin="anonymous" />
                ) : (
                  <div className="bg-red-600 text-white font-display font-black text-xl md:text-2xl px-4 py-2 rotate-[-5deg] border-2 border-black brutal-shadow-sm leading-none flex flex-col items-center justify-center">
                    <span>MİLYONLUK</span>
                    <span>PİKSEL</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <span className="font-mono text-[15px] font-bold text-gray-800 tracking-wider">milyonlukpiksel.com</span>
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
