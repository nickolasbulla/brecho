import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, ScrollView,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { supabase, Category } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import CategoryChip from '@/components/CategoryChip';
import EmptyState from '@/components/EmptyState';
import { Colors, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const { products, loading, refreshing, hasMore, refresh, loadMore } = useProducts({
    categoryId: selectedCategory,
  });

  useFocusEffect(useCallback(() => { refresh(); }, [selectedCategory]));

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('favorites').select('product_id').eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setFavorites(new Set(data.map((f) => f.product_id)));
      });
  }, [user]);

  const toggleFavorite = useCallback(async (productId: string) => {
    if (!user) { router.push('/(auth)/login'); return; }
    if (favorites.has(productId)) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
      setFavorites((prev) => { const s = new Set(prev); s.delete(productId); return s; });
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
      setFavorites((prev) => new Set(prev).add(productId));
    }
  }, [user, favorites]);

  const renderItem = useCallback(({ item }: any) => (
    <ProductCard
      product={item}
      isFavorited={favorites.has(item.id)}
      onToggleFavorite={toggleFavorite}
    />
  ), [favorites]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>🛍️ Brechó</Text>
          <Text style={styles.subtitle}>tropa do react</Text>
        </View>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {categories.map((cat) => (
          <CategoryChip
            key={cat.id}
            label={cat.name}
            selected={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
          />
        ))}
      </ScrollView>

      {/* Products grid */}
      {loading && products.length === 0 ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<EmptyState emoji="👗" title="Nenhum produto encontrado" subtitle="Seja o primeiro a anunciar!" />}
          ListFooterComponent={hasMore && products.length > 0 ? <ActivityIndicator color={Colors.primary} style={{ margin: 16 }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  brand: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  subtitle: { fontSize: 12, color: Colors.textSecondary },
  loginBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
});
