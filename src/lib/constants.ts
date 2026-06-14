export const STOP_LOSS_FACTOR = 0.85 // stop loss = price * 0.85

// Price cache TTLs in milliseconds
export const PRICE_CACHE_TTL_MARKET_HOURS = 5 * 60 * 1000 // 5 minutes
export const PRICE_CACHE_TTL_AFTER_HOURS = 60 * 60 * 1000 // 60 minutes
export const MANUAL_REFRESH_COOLDOWN = 30 * 1000 // 30 seconds

// PSX market hours (UTC+5 = Pakistan Standard Time)
export const PSX_MARKET_OPEN_HOUR = 9 // 9:30 AM PKT
export const PSX_MARKET_OPEN_MINUTE = 30
export const PSX_MARKET_CLOSE_HOUR = 15 // 3:30 PM PKT
export const PSX_MARKET_CLOSE_MINUTE = 30
export const PSX_UTC_OFFSET = 5 // UTC+5

export const CURRENCY = 'PKR'
export const CURRENCY_SYMBOL = '₨'

export const PSX_SYMBOL_SUFFIX = '.KA'
