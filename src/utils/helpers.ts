export function isValidURL(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('tr-TR').format(num);
}
