import { usePixels } from '../../hooks/usePixels';
import { formatNumber } from '../../utils/helpers';
import { ArrowRight, Eye } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = 'Milyonluk', subtitle = 'Ana Sayfa' }: HeaderProps) {
  const { stats } = usePixels();
  const soldPercent = stats.soldPercent ?? 0;
  const recentBlocksSold24h = stats.recentBlocksSold24h ?? 0;
  const soldPixelsInBlocks = formatNumber(Math.round(stats.soldPixels / 100));
  const availablePixelsInBlocks = formatNumber(Math.round(stats.availablePixels / 100));

  return (
    <section className="w-full border-b-2 md:border-b-4 border-black bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8 py-10 md:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="min-w-0">
            <h1 className="font-display text-4xl md:text-6xl lg:text-[5.8rem] font-black uppercase leading-[0.92] tracking-tight max-w-[12ch]">
              İnternet tarihinde
              <span className="block text-red-600">yerini al</span>
            </h1>

            <p className="mt-5 max-w-xl text-[17px] md:text-[19px] leading-7 text-gray-700">
              İnternetin en büyük ortak tuvalinde yerini al. 10x10 piksellik alanın tamamen senin. Markanı, mesajını veya hayalini bırak.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#grid"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-[8px] border-2 border-red-600 bg-red-600 px-6 text-sm font-extrabold uppercase text-white transition-transform hover:-translate-y-0.5"
              >
                Piksel Satın Al
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#grid"
                className="inline-flex h-14 items-center justify-center gap-2 rounded-[8px] border border-gray-300 bg-white px-6 text-sm font-extrabold uppercase text-gray-900 transition-colors hover:border-gray-900"
              >
                Örnekleri Gör
                <Eye className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-2">
                <span className="h-10 w-10 rounded-full border-2 border-white bg-gradient-to-br from-gray-300 to-gray-500" />
                <span className="h-10 w-10 rounded-full border-2 border-white bg-gradient-to-br from-red-200 to-red-500" />
                <span className="h-10 w-10 rounded-full border-2 border-white bg-gradient-to-br from-gray-200 to-gray-400" />
              </div>
              <p className="text-sm leading-5 text-gray-600">
                Son 24 saatte <strong className="text-red-600">{recentBlocksSold24h}</strong> blok satıldı
                <br />
                Şu an <strong className="text-red-600">{Math.max(1, Math.min(14, recentBlocksSold24h || 1))}</strong> kişi alan satın alıyor
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
                Tanesi sadece 1 TL.
              </p>

              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-5">
                  <small className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">Satılan</small>
                  <strong className="mt-2 block text-3xl font-black tracking-tight">
                    {soldPixelsInBlocks} PX
                  </strong>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white px-4 py-5">
                  <small className="block text-[11px] font-bold uppercase tracking-wide text-gray-500">Kalan</small>
                  <strong className="mt-2 block text-3xl font-black tracking-tight text-red-600">
                    {availablePixelsInBlocks} PX
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
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
