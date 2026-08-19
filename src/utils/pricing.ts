export const PIXEL_BLOCK_NET_PRICE_TRY = 100;
export const KDV_RATE = 0;

export function getBlockCount(w: number, h: number): number {
  return w * h;
}

export function getNetPriceFromBlocks(w: number, h: number): number {
  return getBlockCount(w, h) * PIXEL_BLOCK_NET_PRICE_TRY;
}

export function getKdvAmountFromNet(_netAmount: number): number {
  return 0;
}

export function getGrossPriceFromNet(netAmount: number): number {
  return netAmount;
}

export function getGrossPriceFromBlocks(w: number, h: number): number {
  return getNetPriceFromBlocks(w, h);
}

