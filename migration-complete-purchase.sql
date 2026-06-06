-- ============================================================
-- MIGRAÇÃO: função complete_purchase
-- Cole no SQL Editor do Supabase e execute
-- ============================================================

create or replace function public.complete_purchase(
  p_product_id uuid,
  p_buyer_id    uuid,
  p_commission_rate numeric
)
returns json
language plpgsql
security definer          -- executa com privilégios de admin, bypassa RLS
set search_path = public
as $$
declare
  v_product          record;
  v_commission_amount numeric;
begin
  -- Trava a linha e verifica disponibilidade (evita compra dupla simultânea)
  select * into v_product
  from public.products
  where id = p_product_id and status = 'available'
  for update;

  if not found then
    return json_build_object('error', 'Produto não disponível ou já vendido');
  end if;

  -- Comprador não pode comprar o próprio produto
  if v_product.seller_id = p_buyer_id then
    return json_build_object('error', 'Você não pode comprar seu próprio produto');
  end if;

  v_commission_amount := round(v_product.price * p_commission_rate, 2);

  -- Registra o pedido
  insert into public.orders (
    product_id, buyer_id, seller_id,
    product_title, product_price,
    commission_rate, commission_amount, seller_amount
  ) values (
    p_product_id, p_buyer_id, v_product.seller_id,
    v_product.title, v_product.price,
    p_commission_rate, v_commission_amount, v_product.price
  );

  -- Marca o produto como vendido (sem restrição de RLS pois é security definer)
  update public.products
  set status = 'sold'
  where id = p_product_id;

  return json_build_object('success', true);
end;
$$;
