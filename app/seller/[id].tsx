import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase, Profile, Product } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';
import { getInitials, whatsAppUrl } from '@/lib/helpers';

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

  function handleContact() {
    if (!seller?.phone) return;
    Linking.openURL(whatsAppUrl(seller.phone, 'seus produtos'));
  }

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

      <ScrollView>
        {/* Card do vendedor */}
        <View style={styles.card}>
          {/* Avatar */}
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
            {seller.is_premium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={12} color="#F59E0B" />
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            )}
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

          {/* Botão de contato */}
          {seller.phone ? (
            <TouchableOpacity style={styles.contactBtn} onPress={handleContact}>
              <Ionicons name="logo-whatsapp" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.contactBtnText}>Contatar via WhatsApp</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noContactBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.noContactText}>Vendedor sem contato cadastrado</Text>
            </View>
          )}
        </View>

        {/* Anúncios do vendedor */}
        <Text style={styles.sectionTitle}>
          Anúncios de {seller.name.split(' ')[0]}
        </Text>

        {listings.length === 0 ? (
          <EmptyState emoji="📦" title="Nenhum anúncio ativo" subtitle="Este vendedor não tem produtos disponíveis" />
        ) : (
          <View style={styles.grid}>
            {listings.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </View>
        )}
      </ScrollView>
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
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  premiumBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
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
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.whatsapp,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    justifyContent: 'center',
  },
  contactBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  noContactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  noContactText: { fontSize: 13, color: Colors.textMuted },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.text,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
    justifyContent: 'space-between',
  },
});
