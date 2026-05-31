-- ============================================================
-- BRECHÓ APP — Supabase Schema
-- Cole este SQL no SQL Editor do seu projeto Supabase
-- ============================================================

-- 1. Perfis de usuário
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  bio text,
  avatar_url text,
  location text,
  phone text,
  is_premium boolean default false,
  created_at timestamptz default now()
);

-- MIGRAÇÃO (rode se o banco já existia antes):
-- alter table public.profiles add column if not exists phone text;
-- alter table public.profiles add column if not exists is_premium boolean default false;
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
  ('Roupas', 'shirt'),
  ('Calçados', 'footprint'),
  ('Acessórios', 'gem'),
  ('Bolsas', 'handbag'),
  ('Eletrônicos', 'phone-portrait'),
  ('Casa', 'home'),
  ('Outros', 'grid');

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
  featured_until timestamptz default null,
  status text default 'available' check (status in ('available','sold')),
  created_at timestamptz default now()
);
-- MIGRAÇÃO (rode no SQL Editor do Supabase):
-- alter table public.products add column if not exists featured_until timestamptz default null;
alter table public.products enable row level security;
create policy "Produtos visíveis para todos" on public.products for select using (true);
create policy "Vendedor insere produto" on public.products for insert with check (auth.uid() = seller_id);
create policy "Vendedor edita produto" on public.products for update using (auth.uid() = seller_id);
create policy "Vendedor deleta produto" on public.products for delete using (auth.uid() = seller_id);

-- 4. (removido) — O app funciona como marketplace de contato direto.
--    Não há sistema de pagamento. O vendedor marca o produto como vendido
--    manualmente após combinar com o comprador via WhatsApp.

-- 5. Favoritos
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

-- 6. Trigger: criar perfil automático ao registrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end;
$$ language plpgsql security definer;

-- MIGRAÇÃO: rode este SQL no Supabase para atualizar a função existente:
-- (copie e cole a função acima no SQL Editor e execute)

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 7. (removido) — Função buy_product não é mais necessária.
--    O vendedor atualiza o status diretamente via RLS ("Vendedor edita produto").

-- 8. Storage bucket para imagens de produtos
-- Vá em Storage > New bucket > nome: "product-images" > marque "Public bucket"
-- Depois adicione esta policy no bucket:
-- Policy name: "Upload autenticado"
-- Allowed operations: INSERT
-- Target roles: authenticated
-- Policy definition: bucket_id = 'product-images'
