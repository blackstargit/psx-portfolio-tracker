import { STOP_LOSS_FACTOR } from './constants'

export function calcPnLPct(buyPrice: number, currentPrice: number): number {
  return ((currentPrice - buyPrice) / buyPrice) * 100
}

export function calcPnLAmount(buyPrice: number, currentPrice: number, quantity: number): number {
  return (currentPrice - buyPrice) * quantity
}

export function calcCurrentValue(currentPrice: number, quantity: number): number {
  return currentPrice * quantity
}

export function calcTotalCost(buyPrice: number, quantity: number): number {
  return buyPrice * quantity
}

export function calcStopLoss(price: number): number {
  return parseFloat((price * STOP_LOSS_FACTOR).toFixed(2))
}

// Monthly planner calculations
export function calcSectorAmount(budget: number, sectorPct: number): number {
  return (budget * sectorPct) / 100
}

export function calcStockAmount(sectorAmount: number, stockPctInSector: number): number {
  return (sectorAmount * stockPctInSector) / 100
}

export function calcSharesToBuy(allocatedAmount: number, pricePerShare: number): number {
  if (pricePerShare <= 0) return 0
  return Math.floor(allocatedAmount / pricePerShare)
}

export function calcRemainingCash(
  allocatedAmount: number,
  sharesToBuy: number,
  pricePerShare: number
): number {
  return allocatedAmount - sharesToBuy * pricePerShare
}

// Average cost across multiple lots
export function calcAvgCost(lots: Array<{ buy_price: number; quantity: number }>): number {
  const totalCost = lots.reduce((sum, lot) => sum + lot.buy_price * lot.quantity, 0)
  const totalQty = lots.reduce((sum, lot) => sum + lot.quantity, 0)
  return totalQty > 0 ? totalCost / totalQty : 0
}

// Portfolio totals
export function calcPortfolioTotals(
  holdings: Array<{
    buy_price: number
    quantity: number
    is_sold: boolean
    current_price?: number
  }>
) {
  const active = holdings.filter((h) => !h.is_sold)
  const totalCost = active.reduce((sum, h) => sum + h.buy_price * h.quantity, 0)
  const currentValue = active.reduce(
    (sum, h) => sum + (h.current_price ?? h.buy_price) * h.quantity,
    0
  )
  const pnlAmount = currentValue - totalCost
  const pnlPct = totalCost > 0 ? (pnlAmount / totalCost) * 100 : 0
  return { totalCost, currentValue, pnlAmount, pnlPct }
}
