import { useMemo } from 'react';

/**
 * Extrae precios de venta de las notas con formato "Venta Total, precio $XXXX".
 * Devuelve un mapa { nemotecnico: precio } para sobreescribir el precio actual.
 */
function extractVentaOverrides(transactions) {
  const overrides = {};
  for (const tx of transactions) {
    if (tx.tipo !== 'VENTA') continue;
    const notas = String(tx.notas ?? '');
    if (/venta\s+total/i.test(notas)) {
      const match = notas.match(/\$\s*([\d.,]+)/);
      if (match) {
        overrides[tx.nemotecnico] = parseFloat(match[1].replace(/,/g, ''));
      }
    }
  }
  return overrides;
}

/**
 * Calcula posiciones consolidadas del portafolio.
 * Incluye posiciones cerradas con P&L basado en "Venta Total, precio $XX".
 */
export function usePortfolio(transactions, marketPrices) {
  return useMemo(() => {
    const holdings = {};
    const closedPositions = {};

    // Consolidación cronológica: useTransactions entrega fecha_ing DESC,
    // pero COMPRA/VENTA solo cuadra procesando de la más antigua a la más nueva.
    const ordered = [...transactions].sort((a, b) => {
      const byFecha = String(a.fecha_ing ?? '').localeCompare(String(b.fecha_ing ?? ''));
      if (byFecha !== 0) return byFecha;
      return String(a.id ?? '').localeCompare(String(b.id ?? ''), undefined, { numeric: true });
    });

    ordered.forEach((tx) => {
      if (!holdings[tx.nemotecnico]) {
        holdings[tx.nemotecnico] = { ticker: tx.nemotecnico, shares: 0, totalInvestedCost: 0 };
      }
      const h = holdings[tx.nemotecnico];
      const numShares = parseFloat(tx.cantidad) || 0;
      const priceVal = parseFloat(tx.precio) || 0;

      if (tx.tipo === 'COMPRA') {
        h.shares += numShares;
        h.totalInvestedCost += numShares * priceVal;
      } else if (tx.tipo === 'VENTA') {
        const closedShares = h.shares > 0 ? Math.min(numShares, h.shares) : 0;
        const closedCost = h.shares > 0 ? (h.totalInvestedCost / h.shares) * closedShares : 0;

        h.shares -= numShares;
        h.totalInvestedCost -= numShares * priceVal;

        if (h.shares <= 0) {
          h.shares = 0;
          h.totalInvestedCost = 0;
          if (closedShares > 0) {
            closedPositions[tx.nemotecnico] = { closedShares, closedCost };
          }
        }
      }
    });

    const overrides = extractVentaOverrides(transactions);

    let totalPortfolioValue = 0;
    let totalCostBasis = 0;
    let totalDayChangeDollar = 0;

    const list = Object.values(holdings)
      .map((h) => {
        const isOpen = h.shares > 0;
        const currentPrice =
          overrides[h.ticker] || marketPrices[h.ticker]?.currentPrice || h.totalInvestedCost / (h.shares || 1);
        const name = marketPrices[h.ticker]?.name || h.ticker;
        const currentValue = h.shares * currentPrice;
        const avgBuyPrice = h.shares > 0 ? h.totalInvestedCost / h.shares : 0;

        let pnl, pnlPercent;
        if (isOpen) {
          pnl = currentValue - h.totalInvestedCost;
          pnlPercent = h.totalInvestedCost > 0 ? (pnl / h.totalInvestedCost) * 100 : 0;
        } else {
          const closed = closedPositions[h.ticker];
          const salePrice = overrides[h.ticker] || 0;
          const saleRevenue = closed ? salePrice * closed.closedShares : 0;
          pnl = saleRevenue - (closed?.closedCost || 0);
          pnlPercent = closed?.closedCost > 0 ? (pnl / closed.closedCost) * 100 : 0;
        }

        const dayChangeSingle = marketPrices[h.ticker]?.changeDay || 0;
        const totalAssetDayChange = h.shares * dayChangeSingle;

        if (isOpen) {
          totalPortfolioValue += currentValue;
          totalCostBasis += h.totalInvestedCost;
          totalDayChangeDollar += totalAssetDayChange;
        }

        return {
          ...h,
          name,
          currentPrice,
          avgBuyPrice,
          currentValue,
          pnl,
          pnlPercent,
          totalAssetDayChange,
          closed: !isOpen,
        };
      })
      .sort((a, b) => a.closed - b.closed);

    const overallPnL = totalPortfolioValue - totalCostBasis;
    const overallPnLPercent = totalCostBasis > 0 ? (overallPnL / totalCostBasis) * 100 : 0;

    return {
      holdingsList: list,
      totalPortfolioValue,
      totalCostBasis,
      overallPnL,
      overallPnLPercent,
      totalDayChangeDollar,
      assetCount: list.filter((h) => !h.closed).length,
    };
  }, [transactions, marketPrices]);
}
