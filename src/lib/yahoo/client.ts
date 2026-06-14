import YahooFinance from 'yahoo-finance2'

// v3.x: pass config to constructor, not setGlobalConfig()
const yahooFinance = new YahooFinance({
  validation: { logErrors: false, logOptionsErrors: false },
})

export default yahooFinance
