import { usePixelContext } from '../context/PixelContext';

export function usePixels() {
  const { pixels, loading, error, fetchPixels, createPixel, deletePixel, updatePixel } = usePixelContext();

  const totalPixels = 1000000;
  const soldPixels = pixels.reduce((acc, p) => acc + (p.w * 10 * p.h * 10), 0);
  const availablePixels = totalPixels - soldPixels;
  const recentBlocksSold24h = pixels.filter((pixel) => {
    if (!pixel.createdAt) return false;
    const createdAt = new Date(pixel.createdAt);
    const hoursAgo = Date.now() - (24 * 60 * 60 * 1000);
    return createdAt.getTime() >= hoursAgo;
  }).reduce((acc, p) => acc + (p.w * p.h), 0);
  const soldPercent = (soldPixels / totalPixels) * 100;

  return {
    pixels,
    loading,
    error,
    fetchPixels,
    createPixel,
    deletePixel,
    updatePixel,
    stats: {
      totalPixels,
      soldPixels,
      availablePixels,
      soldPercent,
      recentBlocksSold24h,
    },
  };
}
