export function uid(prefix: string): string {
  const token = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${token}`;
}

export function percent(value: number, max: number): number {
  if (max === 0) {
    return 0;
  }

  return Math.round((value / max) * 100);
}
