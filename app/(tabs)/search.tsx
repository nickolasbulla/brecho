import { useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProducts } from '@/hooks/useProducts';
import { supabase } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import CategoryChip from '@/components/CategoryChip';
import EmptyState from '@/components/EmptyState';
import { Colors, Spacing, Radius } from '@/constants/theme';

const CONDITIONS = ['Novo', 'Seminovo', 'Usado', 'Muito usado'];

export default function SearchScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [condition, setCondition] = useState<string | null>(null);
  const [minPriceText, setMinPriceText] = useState('');
  const [maxPriceText, setMaxPriceText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const minPrice = minPriceText ? parseFloat(minPriceText.replace(',', '.')) : null;
  const maxPrice = maxPriceText ? parseFloat(maxPriceText.replace(',', '.')) : null;

  const { products, loading } = useProducts({ search, condition, minPrice, maxPrice });

  // Recarrega favoritos toda vez que a aba recebe foco (atualiza corações ao voltar de um produto)
  const loadFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('product_id')
      .eq('user_id', user.id);
    if (data) setFavorites(new Set(data.map((f) => f.product_id)));
  }, [user]);

  useFocusEffect(useCallback(() => { loadFavorites(); }, [loadFavorites]));

  async function toggleFavorite(productId: string) {
    if (!user) { router.push('/(auth)/login'); return; }
    if (favorites.has(productId)) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', productId);
      setFavorites((prev) => { const s = new Set(prev); s.delete(productId); return s; });
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, product_id: productId });
      setFavorites((prev) => new Set(prev).add(productId));
    }
  }

  function applySearch() { setSearch(query); }

  const renderItem = useCallback(({ item }: any) => (
    <ProductCard
      product={item}
      isFavorited={favorites.has(item.id)}
      onToggleFavorite={toggleFavorite}
    />
  ), [favorites]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.input}
            placeholder="Buscar produtos..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={applySearch}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearch(''); }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="options-outline" size={20} color={showFilters ? Colors.primary : Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersBox}>
          <Text style={styles.filterLabel}>Condição</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6, marginBottom: 12 }}>
            <CategoryChip label="Todas" selected={condition === null} onPress={() => setCondition(null)} />
            {CONDITIONS.map((c) => (
              <CategoryChip
                key={c} label={c} selected={condition === c}
                onPress={() => setCondition(c === condition ? null : c)}
              />
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Faixa de preço</Text>
          <View style={styles.priceRow}>
            <View style={styles.priceInputWrap}>
              <Text style={styles.pricePrefix}>R$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Mín."
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={minPriceText}
                onChangeText={setMinPriceText}
              />
              {minPriceText.length > 0 && (
                <TouchableOpacity onPress={() => setMinPriceText('')}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.priceSep}>—</Text>
            <View style={styles.priceInputWrap}>
              <Text style={styles.pricePrefix}>R$</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="Máx."
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                value={maxPriceText}
                onChangeText={setMaxPriceText}
              />
              {maxPriceText.length > 0 && (
                <TouchableOpacity onPress={() => setMaxPriceText('')}>
                  <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} size="large" />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          ListEmptyComponent={
            search || condition
              ? <EmptyState emoji="🔍" title="Nenhum resultado" subtitle="Tente outros filtros" />
              : <EmptyState emoji="👗" title="Busque por produtos" subtitle="Use a barra acima para começar" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 15, color: Colors.text },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersBox: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
  priceRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 6,
  },
  priceInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderWidth: 1.5,
    borderColor: Colors.border, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
  },
  pricePrefix: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginRight: 4 },
  priceInput: { flex: 1, fontSize: 14, color: Colors.text },
  priceSep: { fontSize: 16, color: Colors.textMuted, fontWeight: '600' },
});
