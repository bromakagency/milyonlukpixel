import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { PixelBlock, PixelFormData } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

interface PixelContextType {
  pixels: PixelBlock[];
  loading: boolean;
  error: string | null;
  isRealtimeConnected: boolean;
  fetchPixels: () => Promise<void>;
  createPixel: (data: PixelFormData) => Promise<void>;
  deletePixel: (id: string) => Promise<void>;
  updatePixel: (id: string, data: Partial<PixelFormData>) => Promise<void>;
}

const PixelContext = createContext<PixelContextType | null>(null);

// DB row → PixelBlock dönüşümü (Context içinde tutuyoruz, api.ts'e bağımlılık yok)
function rowToBlock(row: any): PixelBlock {
  return {
    id: row.id,
    x: row.x,
    y: row.y,
    w: row.w,
    h: row.h,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    title: row.title,
    createdAt: row.created_at,
  };
}

export function PixelProvider({ children }: { children: ReactNode }) {
  const [pixels, setPixels] = useState<PixelBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const fetchPixels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPixels();
      setPixels(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pikseller yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Supabase Realtime Subscription ──────────────────────────────────────
  useEffect(() => {
    // İlk yükleme
    fetchPixels();

    const channel = supabase
      .channel(`pixels-realtime-${Math.random()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pixels' },
        (payload) => {
          const newPixel = rowToBlock(payload.new);
          setPixels((prev) => {
            // Zaten varsa ekleme (optimistic update'ten gelmiş olabilir)
            if (prev.some((p) => p.id === newPixel.id)) return prev;
            return [...prev, newPixel];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pixels' },
        (payload) => {
          const updated = rowToBlock(payload.new);
          setPixels((prev) =>
            prev.map((p) => (p.id === updated.id ? updated : p))
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'pixels' },
        (payload) => {
          const deletedId = payload.old?.id;
          if (deletedId) {
            setPixels((prev) => prev.filter((p) => p.id !== deletedId));
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // ────────────────────────────────────────────────────────────────────────

  const createPixel = useCallback(async (data: PixelFormData) => {
    setLoading(true);
    setError(null);
    try {
      const newPixel = await api.createPixel(data);
      // Realtime INSERT event'i zaten state'i güncelleyecek.
      // Ama realtime bağlantısı yoksa optimistic update yapalım:
      setPixels((prev) => {
        if (prev.some((p) => p.id === newPixel.id)) return prev;
        return [...prev, newPixel];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pixel oluşturulamadı');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deletePixel = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.deletePixel(id);
      // Realtime DELETE event'i state'i güncelleyecek ama yine de optimistic:
      setPixels((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pixel silinemedi');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePixel = useCallback(async (id: string, data: Partial<PixelFormData>) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await api.updatePixel(id, data);
      setPixels((prev) => prev.map((p) => (p.id === id ? updated : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pixel güncellenemedi');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <PixelContext.Provider
      value={{
        pixels,
        loading,
        error,
        isRealtimeConnected,
        fetchPixels,
        createPixel,
        deletePixel,
        updatePixel,
      }}
    >
      {children}
    </PixelContext.Provider>
  );
}

export function usePixelContext() {
  const context = useContext(PixelContext);
  if (!context) throw new Error('usePixelContext must be used within PixelProvider');
  return context;
}
