import { useState, useEffect } from 'react';
import { api } from '../../services/api';
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

export function SalesFeed() {
  const [recentSale, setRecentSale] = useState<SaleItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecentSale = async () => {
    try {
      const pixels = await api.getPixels();
      const sorted = pixels
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      if (sorted.length > 0) {
        const latest = sorted[0];
        setRecentSale({
          id: latest.id,
          title: latest.title,
          x: latest.x,
          y: latest.y,
          w: latest.w,
          h: latest.h,
          imageUrl: latest.imageUrl,
          linkUrl: latest.linkUrl,
          createdAt: latest.createdAt || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch sales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentSale();
    const interval = setInterval(fetchRecentSale, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !recentSale) {
    return null;
  }

  return (
    <div className="w-full bg-red-600 text-white py-1 px-3 text-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="flex items-center gap-1 bg-white text-red-600 text-xs font-bold px-2 py-0.5 rounded flex-shrink-0">
            <Zap className="w-3 h-3" />
            YENİ
          </span>
          
          <a
            href={recentSale.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate hover:underline decoration-dotted min-w-0"
          >
            <span className="font-bold">{recentSale.title || 'İsimsiz'}</span>
            <span className="text-white/80 mx-2">•</span>
            <span className="text-white/90 text-xs">{recentSale.w * 10}x{recentSale.h * 10} px</span>
          </a>
        </div>
        
        <div className="text-white/70 text-xs flex-shrink-0">
          SON SATIŞ
        </div>
      </div>
    </div>
  );
}