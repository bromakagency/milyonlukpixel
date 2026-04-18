import { usePixelContext } from '../context/PixelContext';

export function usePixels() {
  const { pixels, loading, error, fetchPixels, createPixel, deletePixel, updatePixel } = usePixelContext();

  const totalPixels = 1000000;
  const soldPixels = pixels.reduce((acc, p) => acc + (p.w * 10 * p.h * 10), 0);
  const availablePixels = totalPixels - soldPixels;

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
    },
  };
}
