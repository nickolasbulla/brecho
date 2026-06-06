-- ============================================================
-- MIGRAÇÃO: recria tabela orders com schema correto
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

-- Remove a tabela antiga (e suas policies junto)
drop table if exists public.orders cascade;

-- Recria com todas as colunas corretas
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products on delete set null,
  buyer_id uuid references public.profiles on delete set null,
  seller_id uuid references public.profiles on delete set null,
  product_title text not null,
  product_price numeric(10,2) not null,
  commission_rate numeric(4,2) not null default 0.05,
  commission_amount numeric(10,2) not null,
  seller_amount numeric(10,2) not null,
  status text default 'completed' check (status in ('completed','cancelled')),
  created_at timestamptz default now()
);

alter table public.orders enable row level security;

create policy "Comprador vê suas compras"
  on public.orders for select using (auth.uid() = buyer_id);

create policy "Vendedor vê suas vendas"
  on public.orders for select using (auth.uid() = seller_id);

create policy "Comprador registra compra"
  on public.orders for insert with check (auth.uid() = buyer_id);
