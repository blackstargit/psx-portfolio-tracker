-- Historical OHLCV cache — one row per PSX symbol, replaced on each daily refresh.
-- The data column holds a JSON array of {date, open, high, low, close, volume} bars
-- sorted oldest → newest, exactly as returned by src/lib/psx/historical.ts.

create table if not exists historical_cache (
  symbol      text primary key,
  data        jsonb not null,
  fetched_at  timestamptz not null default now()
);

comment on table historical_cache is
  'Daily OHLCV history cache per PSX symbol, refreshed at most once per calendar day.';
comment on column historical_cache.symbol    is 'Plain PSX ticker (no .KA suffix), e.g. HBL';
comment on column historical_cache.data      is 'JSON array of {date,open,high,low,close,volume} bars, asc by date';
comment on column historical_cache.fetched_at is 'Timestamp of the last PSX fetch that populated this row';
