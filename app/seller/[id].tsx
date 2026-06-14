import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Profile, Product } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';
import { getInitials } from '@/lib/helpers';

export default function SellerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [seller, setSeller] = useState<Profile | null>(null);
  const [listings, setListings] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase
        .from('products')
        .select('*, profiles(id, name, avatar_url), categories(id, name, icon_name)')
        .eq('seller_id', id)
        .eq('status', 'available')
        .order('created_at', { ascending: false }),
    ]).then(([profileRes, productsRes]) => {
      if (profileRes.data) setSeller(profileRes.data);
      if (productsRes.data) setListings(productsRes.data);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return <ActivityIndicator color={Colors.primary} style={{ flex: 1, marginTop: 80 }} size="large" />;
  }

  if (!seller) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={{ textAlign: 'center', color: Colors.textSecondary, marginTop: 40 }}>
          Vendedor não encontrado
        </Text>
      </SafeAreaView>
    );
  }

  const ListHeader = (
    <>
      {/* Card do vendedor */}
      <View style={styles.card}>
        <View style={styles.avatarWrap}>
          {seller.avatar_url ? (
            <Image source={{ uri: seller.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.initials}>{getInitials(seller.name)}</Text>
            </View>
          )}
        </View>

        <View style={styles.nameRow}>
          <Text style={styles.name}>{seller.name}</Text>
        </View>

        {seller.location && (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{seller.location}</Text>
          </View>
        )}

        {seller.bio && (
          <Text style={styles.bio}>{seller.bio}</Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{listings.length}</Text>
            <Text style={styles.statLabel}>Disponíveis</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>
              {new Date(seller.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
            </Text>
            <Text style={styles.statLabel}>Membro desde</Text>
          </View>
        </View>
      </View>

      {/* Título da seção */}
      <Text style={styles.sectionTitle}>
        Anúncios de {seller.name.split(' ')[0]}
      </Text>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header fixo */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Perfil do vendedor</Text>
        <View style={{ width: 38 }} />
      </View>

      <FlatList
        data={listings}
        renderItem={({ item }) => <ProductCard product={item} />}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={<EmptyState emoji="📦" title="Nenhum anúncio ativo" subtitle="Este vendedor não tem produtos disponíveis" />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 38, height: 38,
    borderRadius: Radius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  card: {
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Shadow.cardLg,
  },
  avatarWrap: { marginBottom: Spacing.sm },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.border },
  avatarPlaceholder: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  initials: { fontSize: 32, fontWeight: '700', color: Colors.primary },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap', justifyContent: 'center' },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  infoText: { fontSize: 13, color: Colors.textSecondary },
  bio: {
    fontSize: 13, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 20, marginTop: 6, marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  row: { justifyContent: 'space-between' },
});
