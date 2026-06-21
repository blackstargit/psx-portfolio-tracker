-- 003_enable_rls.sql
-- Enable Row Level Security on every table and lock access to authenticated
-- Supabase users only.
--
-- Context: this is a single-user personal app. Authentication is handled by
-- Supabase Auth, and any logged-in user is the owner, so each table grants
-- full access to the `authenticated` role and nothing to `anon`. Because no
-- policy targets `anon`, the public (publishable-key, unauthenticated) role is
-- denied all access once RLS is enabled.
--
-- Server-side API routes read the user's session from cookies, so they also run
-- as `authenticated` and are covered by these same policies — no secret key
-- needed.

-- Helper: enable RLS + grant the authenticated role full access on a table.
do $$
declare
  t text;
  tables text[] := array[
    'sectors',
    'stocks',
    'holdings',
    'monthly_plans',
    'plan_allocations',
    'dividends',
    'price_cache',
    'historical_cache'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security;', t);
    -- Drop first so this migration is idempotent / re-runnable.
    execute format('drop policy if exists "authenticated full access" on public.%I;', t);
    execute format(
      'create policy "authenticated full access" on public.%I '
      || 'for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- The consolidated_holdings view aggregates the holdings table. By default a
-- Postgres view runs with the view *owner's* permissions, which would bypass
-- the RLS above. security_invoker = on makes the view enforce RLS against the
-- querying role instead, so `anon` cannot read holdings through the view.
alter view public.consolidated_holdings set (security_invoker = on);
