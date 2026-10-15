/**
 * Utility functions for date normalization, validation, and timeframe iterations (Monthly, Quarterly, Annual)
 * Ensures strict canonical 'YYYY-MM-DD' storage in Firestore for indexed range querying and sorting.
 */

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Normalizes and validates any date string (DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, ISO timestamps)
 * into a canonical Firestore-compatible 'YYYY-MM-DD' string.
 */
export function normalizeAndValidateDate(rawDate: string): string {
  if (!rawDate || typeof rawDate !== 'string') {
    return new Date().toISOString().slice(0, 10);
  }

  const trimmed = rawDate.trim();

  // If already matches YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1970 && y <= 2100) {
      return trimmed;
    }
  }

  // Handle DD/MM/YYYY, DD-MM-YYYY, or DD.MM.YYYY (very common in Spain & European banks)
  const dmyMatch = trimmed.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1970 && year <= 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Handle YYYY/MM/DD
  const ymdMatch = trimmed.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1970 && year <= 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Fallback try Date.parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getUTCFullYear();
    const month = parsed.getUTCMonth() + 1;
    const day = parsed.getUTCDate();
    if (year >= 1970 && year <= 2100) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  // Default to today in YYYY-MM-DD
  return new Date().toISOString().slice(0, 10);
}

export interface TimeframePeriod {
  year: number;
  month: number; // 0 to 11
  quarter: 1 | 2 | 3 | 4;
}

export function getMonthLabel(year: number, monthIndex: number): string {
  return `${MONTH_NAMES_ES[monthIndex]} ${year}`;
}

export function getQuarterLabel(year: number, quarter: 1 | 2 | 3 | 4): string {
  const qNames = {
    1: 'Q1 (Ene - Mar)',
    2: 'Q2 (Abr - Jun)',
    3: 'Q3 (Jul - Sep)',
    4: 'Q4 (Oct - Dic)',
  };
  return `${qNames[quarter]} ${year}`;
}

export function getYearLabel(year: number): string {
  return `Año ${year}`;
}

/**
 * Returns date range strings [startDate, endDate] inclusive for a specific timeframe
 */
export function getTimeframeRange(
  timeframe: 'monthly' | 'quarterly' | 'annual' | 'historic',
  period: TimeframePeriod
): { startDate: string; endDate: string; label: string } {
  const { year, month, quarter } = period;

  if (timeframe === 'monthly') {
    const mStr = String(month + 1).padStart(2, '0');
    // Get last day of month
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return {
      startDate: `${year}-${mStr}-01`,
      endDate: `${year}-${mStr}-${String(lastDay).padStart(2, '0')}`,
      label: getMonthLabel(year, month),
    };
  }

  if (timeframe === 'quarterly') {
    const startMonths = { 1: '01', 2: '04', 3: '07', 4: '10' };
    const endMonths = { 1: '03-31', 2: '06-30', 3: '09-30', 4: '12-31' };
    return {
      startDate: `${year}-${startMonths[quarter]}-01`,
      endDate: `${year}-${endMonths[quarter]}`,
      label: getQuarterLabel(year, quarter),
    };
  }

  if (timeframe === 'annual') {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      label: getYearLabel(year),
    };
  }

  return {
    startDate: '1970-01-01',
    endDate: '2100-12-31',
    label: 'Todo el Histórico',
  };
}

/**
 * Checks if a transaction date string (YYYY-MM-DD) falls within the selected period
 */
export function isDateInSelectedPeriod(
  dateStr: string,
  timeframe: 'monthly' | 'quarterly' | 'annual' | 'historic',
  period: TimeframePeriod
): boolean {
  if (timeframe === 'historic') return true;
  if (!dateStr) return false;

  const normalized = normalizeAndValidateDate(dateStr);
  const { startDate, endDate } = getTimeframeRange(timeframe, period);
  return normalized >= startDate && normalized <= endDate;
}
