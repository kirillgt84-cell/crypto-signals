import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number, decimals = 2): string {
  if (num >= 1e9) return (num / 1e9).toFixed(decimals) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(decimals) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(decimals) + 'K'
  return num.toFixed(decimals)
}

export function formatPrice(price: number): string {
  return '$' + price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatPercent(percent: number, withSign = true): string {
  const sign = withSign && percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}
