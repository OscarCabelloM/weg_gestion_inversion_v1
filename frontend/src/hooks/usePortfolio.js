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
    const dividendos = {};
    const comisiones = {};

    // Consolidación cronológica: useTransactions entrega fecha_ing DESC,
    // pero COMPRA/VENTA solo cuadra procesando de la más antigua a la más nueva.
    const ordered = transactions.toSorted((a, b) => {
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
      } else if (tx.tipo === 'DIVIDENDO') {
        // Efectivo recibido: no altera acciones ni costo base
        dividendos[tx.nemotecnico] = (dividendos[tx.nemotecnico] || 0) + numShares * priceVal;
      } else if (tx.tipo === 'COMISION') {
        // Costo transaccional: no altera acciones ni costo base
        comisiones[tx.nemotecnico] = (comisiones[tx.nemotecnico] || 0) + numShares * priceVal;
      }
    });

    const overrides = extractVentaOverrides(transactions);

    let totalPortfolioValue = 0;
    let totalCostBasis = 0;
    let totalDayChangeDollar = 0;
    let totalDividends = 0;
    let totalCommissions = 0;

    const list = Object.values(holdings)
      .map((h) => {
        const isOpen = h.shares > 0;
        // El precio de "Venta Total" solo aplica a posiciones cerradas;
        // si la posición se reabrió, manda la cotización de mercado.
        const currentPrice =
          (!isOpen && overrides[h.ticker]) ||
          marketPrices[h.ticker]?.currentPrice ||
          h.totalInvestedCost / (h.shares || 1);
        const name = marketPrices[h.ticker]?.name || h.ticker;
        // Posición cerrada: la valorización actual es el ingreso de la venta realizada,
        // para que Inicial + P&L = Actual siga cuadrando.
        const closedInfo = isOpen ? null : closedPositions[h.ticker];
        const currentValue = isOpen
          ? h.shares * currentPrice
          : (overrides[h.ticker] || 0) * (closedInfo?.closedShares || 0);
        const avgBuyPrice = h.shares > 0
          ? h.totalInvestedCost / h.shares
          : closedInfo?.closedCost > 0 && closedInfo?.closedShares > 0
            ? closedInfo.closedCost / closedInfo.closedShares
            : 0;

        let pnl, pnlPercent;
        const dividendo = dividendos[h.ticker] || 0;
        const comision = comisiones[h.ticker] || 0;
        const totalPnlRow = (currentValue - h.totalInvestedCost) + dividendo - comision;
        if (isOpen) {
          // P&L puro de capital (dividandas y comisiones se suman a nivel portafolio)
          pnl = currentValue - h.totalInvestedCost;
          pnlPercent = h.totalInvestedCost > 0 ? totalPnlRow / (h.totalInvestedCost / 100) : 0;
        } else {
          const saleRevenue = currentValue;
          pnl = saleRevenue - (closedInfo?.closedCost || 0);
          pnlPercent = closedInfo?.closedCost > 0 ? totalPnlRow / (closedInfo.closedCost / 100) : 0;
        }

        const dayChangeSingle = marketPrices[h.ticker]?.changeDay || 0;
        const changePercent = marketPrices[h.ticker]?.changePercent || 0;
        const totalAssetDayChange = h.shares * dayChangeSingle;

        if (isOpen) {
          totalPortfolioValue += currentValue;
          totalCostBasis += h.totalInvestedCost;
          totalDayChangeDollar += totalAssetDayChange;
          totalDividends += dividendo;
          totalCommissions += comision;
        }

        return {
          ...h,
          name,
          currentPrice,
          changePercent,
          avgBuyPrice,
          currentValue,
          pnl,
          pnlPercent,
          totalAssetDayChange,
          dividends: dividendos[h.ticker] || 0,
          commissions: comisiones[h.ticker] || 0,
          totalPnL: totalPnlRow,
          closedCost: closedInfo?.closedCost || 0,
          closedShares: isOpen ? 0 : closedInfo?.closedShares || 0,
          closed: !isOpen,
        };
      })
      .sort((a, b) => a.closed - b.closed);

    const overallPnL = totalPortfolioValue - totalCostBasis + totalDividends - totalCommissions;
    const overallPnLPercent = totalCostBasis > 0 ? (overallPnL / totalCostBasis) * 100 : 0;
    const adjustedPortfolioValue = totalPortfolioValue + totalDividends - totalCommissions;

    return {
      holdingsList: list,
      totalPortfolioValue,
      totalCostBasis,
      overallPnL,
      overallPnLPercent,
      totalDayChangeDollar,
      totalDividends,
      totalCommissions,
      adjustedPortfolioValue,
      assetCount: list.filter((h) => !h.closed).length,
    };
  }, [transactions, marketPrices]);
}
