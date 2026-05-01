import { useState, useEffect } from 'react';
import { usePixels } from '../../hooks/usePixels';
import { formatNumber } from '../../utils/helpers';
import { PIXEL_BLOCK_NET_PRICE_TRY, getGrossPriceFromBlocks } from '../../utils/pricing';
import { ArrowRight, Eye, ChevronRight, Globe } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = 'Milyonluk', subtitle = 'Ana Sayfa' }: HeaderProps) {
  const { stats, loading, pixels } = usePixels();
  const soldPercent = stats.soldPercent ?? 0;
  const recentBlocksSold24h = stats.recentBlocksSold24h ?? 0;
  const soldPixelsFormatted = formatNumber(stats.soldPixels);
  const availablePixelsFormatted = formatNumber(stats.availablePixels);
  const blockGrossPrice = getGrossPriceFromBlocks(1, 1);

  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Sunucu bazlı gerçek + FOMO ziyaretçi takibi (Polling)
  const [liveUsers, setLiveUsers] = useState(() => {
    const cached = localStorage.getItem('pixel_live_users');
    return cached ? parseInt(cached, 10) : 4;
  });

  useEffect(() => {
    let visitorId = localStorage.getItem('pixel_visitor_id');
    if (!visitorId) {
      visitorId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('pixel_visitor_id', visitorId);
    }
    // Sadece geliştirme (dev) ortamında localhost kullan, canlıda (Vercel) aynı domaini kullan
    const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

    const sendHeartbeat = () => {
      fetch(`${API_URL}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId }),
      }).catch(() => { });
    };

    const fetchLiveCount = async () => {
      try {
        const res = await fetch(`${API_URL}/api/live-count`);
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.count === 'number') {
            setLiveUsers(data.count);
            localStorage.setItem('pixel_live_users', data.count.toString());
          }
        }
      } catch (error) {
        // sessizce geç
      }
    };

    sendHeartbeat();
    fetchLiveCount();

    const heartbeatInterval = setInterval(sendHeartbeat, 30000);
    const countInterval = setInterval(fetchLiveCount, 30000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(countInterval);
    };
  }, []);

  return (
    <section className="w-full border-b-2 md:border-b-4 border-black bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8 py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="min-w-0">
            <img
              src="/images/milyonluk_piksel_logo.svg"
              alt="Milyonluk Piksel Logo"
              className="h-20 md:h-28 lg:h-36 mb-6 object-contain origin-left"
            />
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-black uppercase leading-[1.1] tracking-tight">
              İnternet tarihinde
              <span className="block text-red-600">yerini al</span>
            </h1>

            <p className="mt-5 max-w-xl text-[17px] md:text-[19px] leading-7 text-gray-700">
              İnternetin en büyük ortak tuvalinde yerini al. 10x10 piksellik alanın tamamen senin. Markanı, mesajını veya hayalini bırak.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#grid"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border-2 border-red-600 bg-red-600 px-5 text-sm font-extrabold uppercase text-white transition-transform hover:-translate-y-0.5"
              >
                Piksel Satın Al
                <ArrowRight className="h-4 w-4" />
              </a>
              <button
                onClick={() => setIsGuideOpen(true)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] border-2 border-black bg-white px-5 text-sm font-extrabold uppercase text-black transition-transform hover:-translate-y-0.5 shadow-sm hover:shadow-md"
              >
                Nasıl Kullanılır?
              </button>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-3">
                <img
                  src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Felix"
                  alt="Ziyaretçi"
                  className="h-10 w-10 rounded-full border-2 border-white bg-red-50 shadow-sm"
                />
                <img
                  src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Aneka"
                  alt="Ziyaretçi"
                  className="h-10 w-10 rounded-full border-2 border-white bg-blue-50 shadow-sm"
                />
                <img
                  src="https://api.dicebear.com/7.x/pixel-art/svg?seed=Patches"
                  alt="Ziyaretçi"
                  className="h-10 w-10 rounded-full border-2 border-white bg-gray-50 shadow-sm"
                />
              </div>
              <p className="text-sm leading-5 text-gray-600">
                Son 24 saatte <strong className="text-red-600">{loading ? <span className="animate-pulse">...</span> : recentBlocksSold24h}</strong> blok satıldı
                <br />
                Şu an <strong className="text-red-600">{liveUsers}</strong> kişi alanları inceliyor
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[22px] border border-gray-200 bg-white px-5 py-6 md:px-8 md:py-8 shadow-[0_24px_70px_rgba(0,0,0,0.08)]">
            <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(circle_at_center,_rgba(0,0,0,0.35)_1px,_transparent_1px)] [background-size:12px_12px]" />
            <div className="relative z-10 text-center">
              <span className="inline-block text-sm font-black uppercase tracking-wide text-red-600">
                Türkiye Edisyonu
              </span>

              <p className="mx-auto mt-3 max-w-sm text-[18px] leading-7 text-gray-800">
                İnternet tarihinde yerinizi alın.
                <br />
                Toplam 1.000.000 piksel.
                <br />
                10x10 bloklar halinde satılıyor.
                <br />
                Blok fiyatı {PIXEL_BLOCK_NET_PRICE_TRY} TL + KDV.
              </p>
              <p className="mx-auto mt-3 max-w-sm text-[13px] leading-6 text-gray-500">
                1 blok (10x10 px) net {PIXEL_BLOCK_NET_PRICE_TRY} TL, KDV dahil {blockGrossPrice.toLocaleString('tr-TR')} TL'dir.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-5">
                  <small className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">Satılan</small>
                  <strong className="mt-2 block text-3xl font-black tracking-tight">
                    {loading ? <span className="animate-pulse text-gray-300">...</span> : `${soldPixelsFormatted} PX`}
                  </strong>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-5">
                  <small className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">Kalan</small>
                  <strong className="mt-2 block text-3xl font-black tracking-tight text-red-600">
                    {loading ? <span className="animate-pulse text-red-300">...</span> : `${availablePixelsFormatted} PX`}
                  </strong>
                </div>
              </div>

              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between gap-4 text-[13px] font-medium uppercase text-gray-600">
                  <span>
                    <strong className="text-red-600">%{soldPercent.toFixed(2)}</strong> dolu
                  </span>
                  <span>Hedef 1.000.000 PX</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-red-600"
                    style={{ width: `${Math.max(0.5, Math.min(soldPercent, 100))}%` }}
                  />
                </div>
              </div>

              {/* ── Canlı Aktivite ──────────────────────────────────────────────── */}
              {pixels.length > 0 && (
                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    <h3 className="text-xs font-bold uppercase tracking-wide text-gray-800">
                      CANLI AKTİVİTE
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 bg-white/50 backdrop-blur-sm border border-gray-200 p-2 rounded-[20px] shadow-sm">
                    {[...pixels]
                      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                      .slice(0, 3)
                      .map((pixel) => (
                        <div key={pixel.id} className="flex items-center gap-2.5 p-2 hover:bg-white rounded-[14px] transition-colors min-w-0">
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm p-0.5">
                            <img
                              src={pixel.imageUrl}
                              alt={pixel.title}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <p className="text-[11px] font-semibold text-gray-700 leading-tight">
                            {pixel.w * 10}×{pixel.h * 10}<br />
                            <span className="font-normal text-gray-500">piksel aldı</span>
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nasıl Kullanılır Modal */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border-2 md:border-4 border-black brutal-shadow-lg flex flex-col max-h-[90vh]">
            <div className="bg-black text-white p-3 md:p-4 flex justify-between items-center shrink-0">
              <h2 className="font-display font-bold text-lg md:text-xl uppercase tracking-wider">Nasıl Kullanılır?</h2>
              <button onClick={() => setIsGuideOpen(false)} className="hover:text-red-500 font-mono text-xl font-bold transition-colors">[X]</button>
            </div>
            <div className="p-4 md:p-6 overflow-y-auto space-y-6 bg-[#f4f4f0]">
              
              <div className="flex gap-3 md:gap-4 items-start">
                <div className="shrink-0 w-8 h-8 bg-red-600 text-white font-bold font-mono flex items-center justify-center border-2 border-black brutal-shadow-sm">1</div>
                <div>
                  <h3 className="font-bold uppercase text-black mb-1 text-sm md:text-base">Alanını Seç</h3>
                  <p className="text-gray-700 text-xs md:text-sm">Piksel duvarında istediğin konumu seç ve alanının boyutunu belirle. 1 blok = 10×10 piksel</p>
                </div>
              </div>

              <div className="flex gap-3 md:gap-4 items-start">
                <div className="shrink-0 w-8 h-8 bg-red-600 text-white font-bold font-mono flex items-center justify-center border-2 border-black brutal-shadow-sm">2</div>
                <div>
                  <h3 className="font-bold uppercase text-black mb-1 text-sm md:text-base">Logonu Yükle</h3>
                  <p className="text-gray-700 text-xs md:text-sm">Markanın logosunu yükle veya görsel URL’ni ekle. Logon seçtiğin alana otomatik olarak yerleştirilir.</p>
                </div>
              </div>

              <div className="flex gap-3 md:gap-4 items-start">
                <div className="shrink-0 w-8 h-8 bg-red-600 text-white font-bold font-mono flex items-center justify-center border-2 border-black brutal-shadow-sm">3</div>
                <div>
                  <h3 className="font-bold uppercase text-black mb-1 text-sm md:text-base">Bilgilerini Gir</h3>
                  <p className="text-gray-700 text-xs md:text-sm">Logona tıklandığında açılacak bağlantıyı ekle. İstersen marka adını veya kısa sloganını da yaz.</p>
                </div>
              </div>

              <div className="flex gap-3 md:gap-4 items-start">
                <div className="shrink-0 w-8 h-8 bg-red-600 text-white font-bold font-mono flex items-center justify-center border-2 border-black brutal-shadow-sm">4</div>
                <div>
                  <h3 className="font-bold uppercase text-black mb-1 text-sm md:text-base">Sonsuza Kadar Kal</h3>
                  <p className="text-gray-700 text-xs md:text-sm">İşlemi tamamla, piksel alanın dijital duvarda kalıcı olarak yerini alsın.</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </section>
  );
}
