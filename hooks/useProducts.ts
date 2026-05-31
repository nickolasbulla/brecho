import { useState, useEffect, useRef } from 'react';
import { supabase, Product } from '@/lib/supabase';

const PAGE_SIZE = 20;

interface FetchOptions {
  categoryId?: number | null;
  search?: string;
  condition?: string | null;
  sellerId?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
}

export function useProducts(options: FetchOptions = {}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const loadingRef = useRef(false);

  // Stringify options to detect real changes
  const optionsKey = JSON.stringify(options);

  async function fetchPage(reset: boolean) {
    if (loadingRef.current && !reset) return;
    loadingRef.current = true;

    const page = reset ? 0 : pageRef.current;
    reset ? setRefreshing(true) : (page === 0 && setLoading(true));

    let query = supabase
      .from('products')
      .select('*, profiles(id, name, avatar_url), categories(id, name, icon_name)')
      .eq('status', 'available')
      .order('featured_until', { ascending: false, nullsFirst: false })   // destaques primeiro
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (options.categoryId) query = query.eq('category_id', options.categoryId);
    if (options.search)     query = query.ilike('title', `%${options.search}%`);
    if (options.condition)  query = query.eq('condition', options.condition);
    if (options.sellerId)   query = query.eq('seller_id', options.sellerId);
    if (options.minPrice != null) query = query.gte('price', options.minPrice);
    if (options.maxPrice != null) query = query.lte('price', options.maxPrice);

    const { data, error } = await query;

    if (error) {
      // Coluna ainda não existe no banco (migração pendente) → tenta sem o order de destaque
      console.warn('useProducts error:', error.message);
      let fallbackQuery = supabase
        .from('products')
        .select('*, profiles(id, name, avatar_url), categories(id, name, icon_name)')
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (options.categoryId) fallbackQuery = fallbackQuery.eq('category_id', options.categoryId);
      if (options.search)     fallbackQuery = fallbackQuery.ilike('title', `%${options.search}%`);
      if (options.condition)  fallbackQuery = fallbackQuery.eq('condition', options.condition);
      if (options.sellerId)   fallbackQuery = fallbackQuery.eq('seller_id', options.sellerId);
      if (options.minPrice != null) fallbackQuery = fallbackQuery.gte('price', options.minPrice);
      if (options.maxPrice != null) fallbackQuery = fallbackQuery.lte('price', options.maxPrice);

      const { data: fallback } = await fallbackQuery;
      const results = fallback ?? [];
      setProducts(reset ? results : (prev) => [...prev, ...results]);
      setHasMore(results.length === PAGE_SIZE);
      pageRef.current = reset ? 1 : page + 1;
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
      return;
    }

    const results = data ?? [];

    setProducts(reset ? results : (prev) => [...prev, ...results]);
    setHasMore(results.length === PAGE_SIZE);
    pageRef.current = reset ? 1 : page + 1;

    setLoading(false);
    setRefreshing(false);
    loadingRef.current = false;
  }

  useEffect(() => {
    pageRef.current = 0;
    setHasMore(true);
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey]);

  return {
    products,
    loading,
    refreshing,
    hasMore,
    refresh: () => fetchPage(true),
    loadMore: () => { if (!loadingRef.current && hasMore) fetchPage(false); },
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const { data } = await supabase
    .from('products')
    .select('*, profiles(id, name, avatar_url, location, phone, is_premium), categories(id, name, icon_name)')
    .eq('id', id)
    .single();
  return data ?? null;
}
