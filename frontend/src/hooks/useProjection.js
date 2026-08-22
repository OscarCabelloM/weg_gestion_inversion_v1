import { useMemo, useState } from 'react';

const DEFAULT_PARAMS = {
  initialCapital: 10000,
  monthlyContribution: 500,
  annualReturnRate: 12, // 12% promedio histórico
  inflationRate: 3.5,
};

/**
 * Simulador de interés compuesto a 36 meses (3 años).
 * Expone los parámetros ajustables y la serie mensual proyectada.
 */
export function useProjection() {
  const [params, setParams] = useState(DEFAULT_PARAMS);

  const series = useMemo(() => {
    const months = 36; // horizonte fijo: 3 años
    const monthlyRate = Math.pow(1 + params.annualReturnRate / 100, 1 / 12) - 1;
    let balance = params.initialCapital;
    let totalInvested = params.initialCapital;

    const list = [];
    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + monthlyRate) + params.monthlyContribution;
      totalInvested += params.monthlyContribution;
      const profit = balance - totalInvested;

      list.push({
        month: m,
        year: Math.ceil(m / 12),
        monthInYear: ((m - 1) % 12) + 1,
        totalInvested: Math.round(totalInvested),
        totalBalance: Math.round(balance),
        profit: Math.round(profit),
      });
    }
    return list;
  }, [params]);

  return { params, setParams, series };
}
