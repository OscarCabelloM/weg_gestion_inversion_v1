import { useMemo } from 'react';

/**
 * Calcula posiciones consolidadas y métricas agregadas del portafolio
 * a partir del diario de transacciones y las cotizaciones actuales.
 */
export function usePortfolio(transactions, marketPrices) {
  return useMemo(() => {
    const holdings = {};

    transactions.forEach((tx) => {
      if (!holdings[tx.nemotecnico]) {
        holdings[tx.nemotecnico] = { ticker: tx.nemotecnico, shares: 0, totalInvestedCost: 0 };
      }
      const holding = holdings[tx.nemotecnico];
      const numShares = parseFloat(tx.cantidad) || 0;
      const priceVal = parseFloat(tx.precio) || 0;

      if (tx.tipo === 'COMPRA') {
        holding.shares += numShares;
        holding.totalInvestedCost += numShares * priceVal;
      } else if (tx.tipo === 'VENTA') {
        holding.shares -= numShares;
        if (holding.shares <= 0) {
          holding.shares = 0;
          holding.totalInvestedCost = 0;
        } else {
          holding.totalInvestedCost -= numShares * priceVal;
        }
      }
    });

    let totalPortfolioValue = 0;
    let totalCostBasis = 0;
    let totalDayChangeDollar = 0;

    const list = Object.values(holdings)
      .filter((h) => h.shares > 0)
      .map((h) => {
        const currentPrice = marketPrices[h.ticker]?.currentPrice || h.totalInvestedCost / (h.shares || 1);
        const name = marketPrices[h.ticker]?.name || h.ticker;
        const currentValue = h.shares * currentPrice;
        const avgBuyPrice = h.shares > 0 ? h.totalInvestedCost / h.shares : 0;
        const pnl = currentValue - h.totalInvestedCost;
        const pnlPercent = h.totalInvestedCost > 0 ? (pnl / h.totalInvestedCost) * 100 : 0;

        const dayChangeSingle = marketPrices[h.ticker]?.changeDay || 0;
        const totalAssetDayChange = h.shares * dayChangeSingle;

        totalPortfolioValue += currentValue;
        totalCostBasis += h.totalInvestedCost;
        totalDayChangeDollar += totalAssetDayChange;

        return {
          ...h,
          name,
          currentPrice,
          avgBuyPrice,
          currentValue,
          pnl,
          pnlPercent,
          totalAssetDayChange,
        };
      });

    const overallPnL = totalPortfolioValue - totalCostBasis;
    const overallPnLPercent = totalCostBasis > 0 ? (overallPnL / totalCostBasis) * 100 : 0;

    return {
      holdingsList: list,
      totalPortfolioValue,
      totalCostBasis,
      overallPnL,
      overallPnLPercent,
      totalDayChangeDollar,
      assetCount: list.length,
    };
  }, [transactions, marketPrices]);
}
