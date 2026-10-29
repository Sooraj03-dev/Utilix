export function gini(values: number[]): number {
  if (values.length <= 1) return 0;

  const nonNegative = values.map((v) => Math.max(0, v));
  const n = nonNegative.length;
  const sum = nonNegative.reduce((acc, v) => acc + v, 0);

  if (sum === 0) return 0; // If all have 0, distribution is completely equal

  // Sort ascending
  const sorted = [...nonNegative].sort((a, b) => a - b);
  let numerator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (2 * (i + 1) - n - 1) * sorted[i];
  }

  const g = numerator / (n * sum);
  return Math.round(Math.max(0, Math.min(1, g)) * 10000) / 10000;
}

export function jainIndex(values: number[]): number {
  if (values.length === 0) return 1.0;
  if (values.length === 1) return 1.0;

  const n = values.length;
  const sum = values.reduce((acc, v) => acc + Math.max(0, v), 0);
  if (sum === 0) return 1.0;

  const sumSquares = values.reduce((acc, v) => acc + Math.max(0, v) ** 2, 0);
  if (sumSquares === 0) return 1.0;

  const jain = (sum * sum) / (n * sumSquares);
  return Math.round(Math.max(0, Math.min(1, jain)) * 10000) / 10000;
}

export function utilisation(booked: number, total: number): number {
  if (total <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, booked / total));
  return Math.round(ratio * 10000) / 10000;
}
