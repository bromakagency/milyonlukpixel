import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import { Zap } from 'lucide-react';

interface SaleItem {
  id: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  createdAt: string;
  linkUrl: string;
}

function rowToSaleItem(row: any): SaleItem {
  return {
    id: row.id,
    title: row.title,
    x: row.x,
    y: row.y,
    w: row.w,
    h: row.h,
    linkUrl: row.link_url,
    createdAt: row.created_at,
  };
}

export function SalesFeed() {
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [isNew, setIsNew] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase
      .from('pixels')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data && data.length > 0) setSales(data.map(rowToSaleItem));
      });

    const channel = supabase
      .channel(`sales-ticker-${Math.random()}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pixels' }, (payload) => {
        const newSale = rowToSaleItem(payload.new);
        setSales((prev) => [newSale, ...prev].slice(0, 10));
        setIsNew(true);
        setTimeout(() => setIsNew(false), 6000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel).catch(() => {}); };
  }, []);

  if (sales.length === 0) return null;

  // İçeriği 2× kopyala → sorunsuz döngü
  const items = [...sales, ...sales];

  return (
    <div className="w-full bg-red-600 text-white h-[22px] overflow-hidden flex items-center font-mono">
      {/* Sol badge — sabit */}
      <div className="flex-shrink-0 pl-2 pr-2 flex items-center">
        <span
          className={`flex items-center justify-center gap-1 text-[9px] leading-none font-bold px-1.5 py-0.5 rounded transition-all duration-300 ${
            isNew
              ? 'bg-yellow-300 text-red-700 animate-pulse'
              : 'bg-white text-red-600'
          }`}
        >
          <Zap className="w-2.5 h-2.5" />
          {isNew ? 'SON DAKİKA' : 'SON SATIŞLAR'}
        </span>
      </div>

      {/* Kayan şerit */}
      <div className="flex-1 overflow-hidden relative h-full flex items-center">
        <div
          ref={trackRef}
          className="flex items-center gap-0 whitespace-nowrap h-full"
          style={{ animation: 'ticker-scroll 30s linear infinite' }}
        >
          {items.map((sale, i) => (
            <span key={`${sale.id}-${i}`} className="inline-flex items-center gap-2 px-6 h-full">
              <a
                href={sale.linkUrl}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="font-bold hover:underline decoration-dotted text-[11px] leading-none pb-[1px]"
              >
                {sale.title || 'İsimsiz'}
              </a>
              <span className="text-white/80 text-[10px] leading-none pb-[1px]">
                {sale.w * 10}×{sale.h * 10}px
              </span>
              <span className="text-white/40 text-[9px] leading-none select-none">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}