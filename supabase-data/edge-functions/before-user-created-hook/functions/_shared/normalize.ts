export function normalizeTrim(value: unknown): string {
  return String(value ?? '').trim();
}

export function normalizeLower(value: unknown): string {
  return normalizeTrim(value).toLowerCase();
}

export function parseInteger(value: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function parseBoolean(value: unknown, fallback = false): boolean {
  const normalized = normalizeLower(value);

  if (!normalized) {
    return fallback;
  }

  if (normalized === '1' || normalized === 'true' || normalized === 'yes') {
    return true;
  }

  if (normalized === '0' || normalized === 'false' || normalized === 'no') {
    return false;
  }

  return fallback;
}

export function parseCsvSet(value: unknown, toLower = true): Set<string> {
  const raw = normalizeTrim(value);

  if (!raw) {
    return new Set();
  }

  return new Set(
    raw
      .split(',')
      .map((item) => (toLower ? normalizeLower(item) : normalizeTrim(item)))
      .filter(Boolean)
  );
}

export function pickFirstEnv(names: string[]): string {
  for (const name of names) {
    const value = normalizeTrim(Deno.env.get(name));

    if (value) {
      return value;
    }
  }

  return '';
}
