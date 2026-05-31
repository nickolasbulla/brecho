import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase, Favorite } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import { Colors, Spacing } from '@/constants/theme';

export default function FavoritesScreen() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) { setLoading(false); return; }
    isRefresh ? setRefreshing(true) : setLoading(true);
    const { data } = await supabase
      .from('favorites')
      .select('*, products(*, profiles(id, name, avatar_url), categories(id, name, icon_name))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) {
      setFavorites(data);
      setFavSet(new Set(data.map((f) => f.product_id)));
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggleFavorite(productId: string) {
    if (!user) return;
    await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
    setFavorites((prev) => prev.filter((f) => f.product_id !== productId));
    setFavSet((prev) => { const s = new Set(prev); s.delete(productId); return s; });
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState emoji="❤️" title="Faça login para ver favoritos" subtitle="Salve os produtos que você amou!" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.pageTitle}>Favoritos</Text>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />}
          renderItem={({ item }) =>
            item.products ? (
              <ProductCard
                product={item.products as any}
                isFavorited={favSet.has(item.product_id)}
                onToggleFavorite={toggleFavorite}
              />
            ) : null
          }
          ListEmptyComponent={
            <EmptyState emoji="💔" title="Nenhum favorito ainda" subtitle="Toque no ❤️ nos produtos que gostar" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
});
