import { useMemo } from 'react';
import { toCLP } from '@/lib/formatters';

const EMPTY_USD_HISTORY = {};

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
 * `usdHistory` (mapa fecha → dólar) y `usdclpPrice` se usan para convertir la
 * Inversión Inicial de activos CRYPTO con el valor del dólar de la fecha de ingreso.
 * `mercado` permite filtrar a un solo mercado ('NACIONAL' / 'CRYPTO'); si es
 * null/undefined se consolidan todos.
 */
export function usePortfolio(transactions, marketPrices, usdHistory = EMPTY_USD_HISTORY, usdclpPrice = null, mercado = null) {
  return useMemo(() => {
    const holdings = {};
    const closedPositions = {};
    const dividendos = {};
    const comisiones = {};
    // Para el promedio simple de precios de compra (card Crypto): suma y conteo por nemotécnico.
    const compraPreciosSuma = {};
    const compraPreciosCount = {};

    // Consolidación cronológica: useTransactions entrega fecha_ing DESC,
    // pero COMPRA/VENTA solo cuadra procesando de la más antigua a la más nueva.
    const ordered = transactions.toSorted((a, b) => {
      const byFecha = String(a.fecha_ing ?? '').localeCompare(String(b.fecha_ing ?? ''));
      if (byFecha !== 0) return byFecha;
      return String(a.id ?? '').localeCompare(String(b.id ?? ''), undefined, { numeric: true });
    });

    const txs = mercado ? ordered.filter((tx) => (tx.mercado ?? null) === mercado) : ordered;
    txs.forEach((tx) => {
      if (!holdings[tx.nemotecnico]) {
        holdings[tx.nemotecnico] = { ticker: tx.nemotecnico, shares: 0, totalInvestedCost: 0, mercado: null };
      }
      const h = holdings[tx.nemotecnico];
      // El mercado se toma de la transacción más antigua del activo (procesamos en orden ascendente).
      if (h.mercado == null && tx.mercado) h.mercado = tx.mercado;
      const numShares = parseFloat(tx.cantidad) || 0;
      const priceVal = parseFloat(tx.precio) || 0;

      if (tx.tipo === 'COMPRA') {
        h.shares += numShares;
        // En CRYPTO la Inversión Inicial se convierte a CLP con el dólar de la fecha
        // de ingreso (mismo cálculo que el Monto Total del Registro Diario).
        h.totalInvestedCost += h.mercado === 'CRYPTO'
          ? toCLP(numShares * priceVal, tx.fecha_ing, usdHistory, usdclpPrice)
          : numShares * priceVal;
        compraPreciosSuma[tx.nemotecnico] = (compraPreciosSuma[tx.nemotecnico] || 0) + priceVal;
        compraPreciosCount[tx.nemotecnico] = (compraPreciosCount[tx.nemotecnico] || 0) + 1;
      } else if (tx.tipo === 'VENTA') {
        const closedShares = h.shares > 0 ? Math.min(numShares, h.shares) : 0;
        const closedCost = h.shares > 0 ? (h.totalInvestedCost / h.shares) * closedShares : 0;

        h.shares -= numShares;
        // En CRYPTO la venta también descuenta el costo convertido con el dólar de su fecha.
        h.totalInvestedCost -= h.mercado === 'CRYPTO'
          ? toCLP(numShares * priceVal, tx.fecha_ing, usdHistory, usdclpPrice)
          : numShares * priceVal;

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

    const overrides = extractVentaOverrides(txs);

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
        // CUENTA2.AFP es una cuenta de fondo que no se revaloriza: usa el costo promedio.
        const costoPromedio = h.totalInvestedCost / (h.shares || 1);
        const currentPrice =
          h.ticker === 'CUENTA2.AFP'
            ? costoPromedio
            : (!isOpen && overrides[h.ticker]) ||
              marketPrices[h.ticker]?.currentPrice ||
              costoPromedio;
        const name = marketPrices[h.ticker]?.name || h.ticker;
        // Posición cerrada: la valorización actual es el ingreso de la venta realizada,
        // para que Inicial + P&L = Actual siga cuadrando.
        const closedInfo = isOpen ? null : closedPositions[h.ticker];
        // En CRYPTO el Precio Promedio es el promedio simple de los precios de
        // compra (campo precio de tgi_inversiones); en el resto se mantiene el
        // costo promedio ponderado por cantidad.
        const precioCompraCrypto = h.mercado === 'CRYPTO' && compraPreciosCount[h.ticker] > 0
          ? compraPreciosSuma[h.ticker] / compraPreciosCount[h.ticker]
          : null;
        const avgBuyPrice = precioCompraCrypto != null
          ? precioCompraCrypto
          : h.shares > 0
            ? h.totalInvestedCost / h.shares
            : closedInfo?.closedCost > 0 && closedInfo?.closedShares > 0
              ? closedInfo.closedCost / closedInfo.closedShares
              : 0;
        // Valorización Actual: en CRYPTO = cantidad × precio actual (Yahoo) × dólar de hoy;
        // en el resto = cantidad × precio de mercado.
        const cryptoYahooPrice = isOpen && h.mercado === 'CRYPTO' && marketPrices[h.ticker]?.currentPrice != null && usdclpPrice != null;
        const currentValue = isOpen
          ? cryptoYahooPrice
            ? h.shares * currentPrice * usdclpPrice
            : h.shares * currentPrice
          : (overrides[h.ticker] || 0) * (closedInfo?.closedShares || 0);

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
          pnl = saleRevenue - (closedInfo?.closedCost || 0) + dividendo - comision;
          pnlPercent = closedInfo?.closedCost > 0 ? (pnl / closedInfo.closedCost) * 100 : 0;
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

    return {
      holdingsList: list,
      totalPortfolioValue,
      totalCostBasis,
      overallPnL,
      overallPnLPercent,
      totalDayChangeDollar,
      assetCount: list.filter((h) => !h.closed).length,
    };
  }, [transactions, marketPrices, usdHistory, usdclpPrice, mercado]);
}
