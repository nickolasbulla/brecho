-- ============================================================
-- E-BUY — Setup completo do banco de dados
-- Cole tudo no SQL Editor do Supabase e execute
-- ============================================================

-- 1. Perfis de usuário
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  bio text,
  avatar_url text,
  location text,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Perfil público visível" on public.profiles for select using (true);
create policy "Usuário edita próprio perfil" on public.profiles for update using (auth.uid() = id);
create policy "Usuário insere próprio perfil" on public.profiles for insert with check (auth.uid() = id);

-- 2. Categorias
create table public.categories (
  id serial primary key,
  name text not null,
  icon_name text not null
);
insert into public.categories (name, icon_name) values
  ('Roupas',      'shirt'),
  ('Calçados',    'footprint'),
  ('Acessórios',  'gem'),
  ('Bolsas',      'handbag'),
  ('Eletrônicos', 'phone-portrait'),
  ('Casa',        'home'),
  ('Outros',      'grid');

-- 3. Produtos
create table public.products (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.profiles on delete cascade not null,
  title text not null,
  description text,
  price numeric(10,2) not null,
  category_id int references public.categories,
  condition text not null check (condition in ('Novo','Seminovo','Usado','Muito usado')),
  images text[] default '{}',
  status text default 'available' check (status in ('available','sold')),
  created_at timestamptz default now()
);
alter table public.products enable row level security;
create policy "Produtos visíveis para todos" on public.products for select using (true);
create policy "Vendedor insere produto" on public.products for insert with check (auth.uid() = seller_id);
create policy "Vendedor edita produto" on public.products for update using (auth.uid() = seller_id);
create policy "Vendedor deleta produto" on public.products for delete using (auth.uid() = seller_id);

-- 4. Favoritos
create table public.favorites (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  product_id uuid references public.products on delete cascade not null,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);
alter table public.favorites enable row level security;
create policy "Usuário vê seus favoritos" on public.favorites for select using (auth.uid() = user_id);
create policy "Usuário insere favorito" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Usuário remove favorito" on public.favorites for delete using (auth.uid() = user_id);

-- 5. Pedidos
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
create policy "Comprador vê suas compras" on public.orders for select using (auth.uid() = buyer_id);
create policy "Vendedor vê suas vendas" on public.orders for select using (auth.uid() = seller_id);
create policy "Comprador registra compra" on public.orders for insert with check (auth.uid() = buyer_id);

-- 6. Trigger: criar perfil automático ao registrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. Função de compra (atomic, bypassa RLS para marcar produto como vendido)
create or replace function public.complete_purchase(
  p_product_id      uuid,
  p_buyer_id        uuid,
  p_commission_rate numeric
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product           record;
  v_commission_amount numeric;
begin
  select * into v_product
  from public.products
  where id = p_product_id and status = 'available'
  for update;

  if not found then
    return json_build_object('error', 'Produto não disponível ou já vendido');
  end if;

  if v_product.seller_id = p_buyer_id then
    return json_build_object('error', 'Você não pode comprar seu próprio produto');
  end if;

  v_commission_amount := round(v_product.price * p_commission_rate, 2);

  insert into public.orders (
    product_id, buyer_id, seller_id,
    product_title, product_price,
    commission_rate, commission_amount, seller_amount
  ) values (
    p_product_id, p_buyer_id, v_product.seller_id,
    v_product.title, v_product.price,
    p_commission_rate, v_commission_amount, v_product.price
  );

  update public.products set status = 'sold' where id = p_product_id;

  return json_build_object('success', true);
end;
$$;

-- 8. Storage bucket para imagens de produtos
-- Vá em Storage > New bucket > nome: "product-images" > marque "Public bucket"
-- Depois adicione esta policy no bucket:
--   Policy name: "Upload autenticado"
--   Allowed operations: INSERT
--   Target roles: authenticated
--   Policy definition: bucket_id = 'product-images'
