export const eur = (n: number, digits = 0) =>
  n.toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });

export const eurCourt = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} k€`;
  return eur(n);
};

export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)} %`;
