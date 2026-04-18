import { usePixels } from '../../hooks/usePixels';
import { formatNumber } from '../../utils/helpers';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = 'Milyonluk', subtitle = 'Ana Sayfa' }: HeaderProps) {
  const { stats } = usePixels();

  return (
    <header className="w-full border-b-2 md:border-b-4 border-black bg-white pt-12 md:pt-16 pb-6 md:pb-12 px-3 md:px-4 text-center relative z-10">
      <div className="absolute top-0 left-0 w-full h-2 md:h-3 bg-red-600" />
      
      <h1 className="font-display text-3xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-none">
        {title}<br/>{subtitle}
      </h1>
      
      <div className="mt-4 md:mt-6 inline-block bg-red-600 text-white font-display font-bold text-base md:text-2xl px-4 md:px-6 py-1 md:py-2 brutal-shadow rotate-[-2deg]">
        TÜRKİYE EDİSYONU
      </div>
      
      <p className="mt-6 md:mt-10 text-base md:text-xl font-medium max-w-3xl mx-auto border-2 border-black p-3 md:p-4 bg-[#fffdf0] brutal-shadow-sm">
        İnternet tarihinde yerinizi alın. Toplam 1.000.000 piksel.<br/>
        10x10 bloklar halinde satılıyor. Tanesi sadece 1 TL.
      </p>
      
      <div className="flex flex-wrap justify-center gap-3 md:gap-8 mt-6 md:mt-10 font-mono text-sm md:text-lg font-bold">
        <div className="border-2 border-black bg-white px-4 md:px-6 py-2 md:py-3 brutal-shadow-sm flex flex-col items-center min-w-[140px] md:min-w-[200px]">
          <span className="text-xs text-gray-500 uppercase tracking-widest mb-1">Satılan</span>
          <span className="text-xl md:text-2xl">{formatNumber(stats.soldPixels)} PX</span>
        </div>
        <div className="border-2 border-black bg-[#ffd700] px-4 md:px-6 py-2 md:py-3 brutal-shadow-sm flex flex-col items-center min-w-[140px] md:min-w-[200px]">
          <span className="text-xs text-black uppercase tracking-widest mb-1">Kalan</span>
          <span className="text-xl md:text-2xl">{formatNumber(stats.availablePixels)} PX</span>
        </div>
      </div>
    </header>
  );
}
