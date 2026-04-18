import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { Zap } from 'lucide-react';

interface SaleItem {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  imageUrl: string;
  linkUrl: string;
  createdAt: string;
}

function rowToSaleItem(row: any): SaleItem {
  return {
    id: row.id,
    title: row.title,
    x: row.x,
    y: row.y,
    w: row.w,
    h: row.h,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    createdAt: row.created_at,
  };
}

export function SalesFeed() {
  const [recentSales, setRecentSales] = useState<SaleItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isNew, setIsNew] = useState(false);

  // İlk yükleme — son 5 satışı al
  useEffect(() => {
    const fetchRecent = async () => {
      const { data } = await supabase
        .from('pixels')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data && data.length > 0) {
        setRecentSales(data.map(rowToSaleItem));
      }
    };

    fetchRecent();

    // Realtime: yeni pixel eklenince listeye ekle ve öne al
    const channel = supabase
      .channel('sales-feed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pixels' },
        (payload) => {
          const newSale = rowToSaleItem(payload.new);
          setRecentSales((prev) => [newSale, ...prev].slice(0, 5));
          setCurrentIndex(0);
          setIsNew(true);
          // "YENİ" badge'i 5 sn sonra kaldır
          setTimeout(() => setIsNew(false), 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Birden fazla satış varsa 4 saniyede bir geç
  useEffect(() => {
    if (recentSales.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % recentSales.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [recentSales.length]);

  if (recentSales.length === 0) return null;

  const sale = recentSales[currentIndex];

  return (
    <div className="w-full bg-red-600 text-white py-1 px-3 text-sm overflow-hidden">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 transition-all duration-300 ${
              isNew && currentIndex === 0
                ? 'bg-yellow-300 text-red-700 animate-pulse'
                : 'bg-white text-red-600'
            }`}
          >
            <Zap className="w-3 h-3" />
            {isNew && currentIndex === 0 ? 'SON DAKİKA' : 'YENİ'}
          </span>

          <a
            href={sale.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate hover:underline decoration-dotted min-w-0"
          >
            <span className="font-bold">{sale.title || 'İsimsiz'}</span>
            <span className="text-white/80 mx-2">•</span>
            <span className="text-white/90 text-xs">
              {sale.w * 10}x{sale.h * 10} px
            </span>
          </a>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Nokta indikatörleri — birden fazla satış varsa */}
          {recentSales.length > 1 && (
            <div className="hidden sm:flex gap-1">
              {recentSales.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
          <div className="text-white/70 text-xs">SON SATIŞ</div>
        </div>
      </div>
    </div>
  );
}