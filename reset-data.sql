-- ============================================================
-- BRECHÓ — Reset de dados (mantém usuários e categorias)
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

-- 1. Apaga pedidos primeiro
delete from public.orders;

-- 2. Apaga favoritos (FK para products e profiles)
delete from public.favorites;

-- 3. Apaga produtos
delete from public.products;

-- 4. Confirma que categorias estão corretas (recria se necessário)
delete from public.categories;
insert into public.categories (name, icon_name) values
  ('Roupas',      'shirt'),
  ('Calçados',    'footprint'),
  ('Acessórios',  'gem'),
  ('Bolsas',      'handbag'),
  ('Eletrônicos', 'phone-portrait'),
  ('Casa',        'home'),
  ('Outros',      'grid');

-- Resultado
select 'orders'     as tabela, count(*) as registros from public.orders
union all
select 'favorites',  count(*) from public.favorites
union all
select 'products',   count(*) from public.products
union all
select 'categories', count(*) from public.categories
union all
select 'profiles',   count(*) from public.profiles;
