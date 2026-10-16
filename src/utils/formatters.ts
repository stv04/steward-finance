/**
 * Centralized currency and numeric formatting utility for Euro (€) base currency
 * Adheres to standard Spanish conventions (1.234,56 €)
 */

export interface FormatEuroOptions {
  showSign?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  compact?: boolean;
}

/**
 * Formats a monetary amount into Euros with Spanish locale conventions:
 * e.g. 1350.5 => "1.350,50 €"
 *      -720   => "-720,00 €"
 *      +350   => "+350,00 €" (with showSign: true)
 */
export function formatEuro(amount: number | undefined | null, options?: FormatEuroOptions): string {
  const value = amount ?? 0;
  const minDigits = options?.minimumFractionDigits ?? 2;
  const maxDigits = options?.maximumFractionDigits ?? 2;
  const safeMaxDigits = Math.max(minDigits, maxDigits);

  if (options?.compact && Math.abs(value) >= 1000) {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M €`;
    }
    return `${(value / 1000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k €`;
  }

  const formattedAbs = Math.abs(value).toLocaleString('es-ES', {
    minimumFractionDigits: minDigits,
    maximumFractionDigits: safeMaxDigits,
  });

  if (value < 0) {
    return `-${formattedAbs} €`;
  }

  if (options?.showSign && value > 0) {
    return `+${formattedAbs} €`;
  }

  return `${formattedAbs} €`;
}

/**
 * Parses user input strings into a clean float, handling commas or dots
 */
export function parseEuroInput(val: string): number {
  if (!val) return 0;
  // Replace comma with dot
  const sanitized = val.replace(/\s+/g, '').replace(',', '.');
  const num = parseFloat(sanitized);
  return isNaN(num) ? 0 : num;
}
