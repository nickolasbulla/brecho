import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  ActivityIndicator, Linking, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { getProduct } from '@/hooks/useProducts';
import { supabase, Product } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { formatPrice, conditionColor, timeAgo, getInitials, whatsAppUrl } from '@/lib/helpers';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

export default function ProductDetailScreen() {
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [markingAsSold, setMarkingAsSold] = useState(false);
  const [featuringProduct, setFeaturingProduct] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProduct(id).then((p) => { setProduct(p); setLoading(false); });
    if (user) {
      supabase.from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', id)
        .maybeSingle()
        .then(({ data }) => setIsFavorited(!!data));
    }
  }, [id, user]);

  async function toggleFavorite() {
    if (!user) { router.push('/(auth)/login'); return; }
    if (isFavorited) {
      await supabase.from('favorites').delete().eq('user_id', user.id).eq('product_id', id);
      setIsFavorited(false);
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, product_id: id });
      setIsFavorited(true);
    }
  }

  async function handleMarkAsSold() {
    if (!user || !product) return;
    setMarkingAsSold(true);
    const { error } = await supabase
      .from('products')
      .update({ status: 'sold' })
      .eq('id', product.id)
      .eq('seller_id', user.id);
    setMarkingAsSold(false);
    if (!error) {
      setProduct((prev) => prev ? { ...prev, status: 'sold' } : prev);
      showToast('✅ Produto marcado como vendido!', 'success');
    } else {
      showToast('Erro ao marcar como vendido. Tente novamente.', 'error');
    }
  }

  async function handleDelete() {
    if (!user || !product) return;
    setDeletingProduct(true);
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)
      .eq('seller_id', user.id);
    setDeletingProduct(false);
    if (!error) {
      showToast('🗑️ Anúncio excluído.', 'success');
      router.back();
    } else {
      showToast('Erro ao excluir. Tente novamente.', 'error');
      setShowDeleteConfirm(false);
    }
  }

  async function handleToggleFeatured() {
    if (!user || !product) return;
    setFeaturingProduct(true);
    const isActive = !!product.featured_until && new Date(product.featured_until) > new Date();
    const newValue = isActive ? null : new Date(Date.now() + 3_600_000).toISOString();
    const { error } = await supabase
      .from('products')
      .update({ featured_until: newValue })
      .eq('id', product.id)
      .eq('seller_id', user.id);
    setFeaturingProduct(false);
    if (!error) {
      setProduct((prev) => prev ? { ...prev, featured_until: newValue } : prev);
      showToast(newValue ? '⭐ Anúncio em destaque por 1 hora!' : 'Destaque removido.', 'success');
    } else {
      showToast('Erro ao alterar destaque.', 'error');
    }
  }

  async function handleMarkAsAvailable() {
    if (!user || !product) return;
    const { error } = await supabase
      .from('products')
      .update({ status: 'available' })
      .eq('id', product.id)
      .eq('seller_id', user.id);
    if (!error) {
      setProduct((prev) => prev ? { ...prev, status: 'available' } : prev);
      showToast('Produto disponível novamente!', 'success');
    }
  }

  function handleContact() {
    if (!product?.profiles?.phone) return;
    const url = whatsAppUrl(product.profiles.phone, product.title);
    Linking.openURL(url).catch(() => {
      showToast('Não foi possível abrir o WhatsApp.', 'error');
    });
  }

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ flex: 1, marginTop: 80 }} size="large" />;
  if (!product) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <TouchableOpacity onPress={() => router.back()} style={{ padding: 16 }}>
        <Ionicons name="arrow-back" size={24} color={Colors.text} />
      </TouchableOpacity>
      <Text style={{ textAlign: 'center', color: Colors.textSecondary, marginTop: 40 }}>Produto não encontrado</Text>
    </SafeAreaView>
  );

  const images = product.images?.length > 0 ? product.images : [];
  const seller = product.profiles;
  const isSeller = product.seller_id === user?.id;
  const sellerPhone = seller?.phone ?? null;
  const isPremiumSeller = isSeller && seller?.is_premium === true;
  const isActiveFeatured = !!product.featured_until && new Date(product.featured_until) > new Date();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView>
        {/* Image carousel */}
        <View style={[styles.imageContainer, { height: width }]}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
            >
              {images.map((uri, i) => (
                <Image key={i} source={{ uri }} style={[styles.image, { width, height: width }]} resizeMode="cover" />
              ))}
            </ScrollView>
          ) : (
            <View style={[styles.image, styles.imagePlaceholder, { width, height: width }]}>
              <Text style={{ fontSize: 64 }}>🛍️</Text>
            </View>
          )}

          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>

          {/* Editar (vendedor) ou Favoritar (comprador) */}
          {isSeller ? (
            <TouchableOpacity
              style={styles.favBtn}
              onPress={() => router.push({ pathname: '/product/edit/[id]', params: { id: product.id } })}
            >
              <Ionicons name="create-outline" size={22} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.favBtn} onPress={toggleFavorite}>
              <Ionicons name={isFavorited ? 'heart' : 'heart-outline'} size={22} color={isFavorited ? Colors.primary : Colors.text} />
            </TouchableOpacity>
          )}

          {/* Image dots */}
          {images.length > 1 && (
            <View style={styles.dots}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          )}

          {product.status === 'sold' && (
            <View style={styles.soldOverlay}>
              <Text style={styles.soldOverlayText}>VENDIDO</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Category + condition */}
          <View style={styles.badges}>
            {product.categories && (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{product.categories.name}</Text>
              </View>
            )}
            <View style={[styles.condBadge, { backgroundColor: conditionColor(product.condition) + '22' }]}>
              <Text style={[styles.condBadgeText, { color: conditionColor(product.condition) }]}>
                {product.condition}
              </Text>
            </View>
          </View>

          <Text style={styles.title}>{product.title}</Text>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          <Text style={styles.date}>Publicado {timeAgo(product.created_at)}</Text>

          {product.description && (
            <>
              <Text style={styles.sectionTitle}>Descrição</Text>
              <Text style={styles.description}>{product.description}</Text>
            </>
          )}

          {/* Seller card */}
          {seller && (
            <TouchableOpacity
              style={styles.sellerCard}
              onPress={() => router.push({ pathname: '/seller/[id]', params: { id: seller.id } })}
              activeOpacity={0.8}
            >
              <View style={styles.sellerAvatar}>
                {seller.avatar_url ? (
                  <Image source={{ uri: seller.avatar_url }} style={styles.sellerImg} />
                ) : (
                  <View style={[styles.sellerImg, styles.sellerImgPlaceholder]}>
                    <Text style={styles.sellerInitials}>{getInitials(seller.name)}</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sellerLabel}>Vendedor</Text>
                <View style={styles.sellerNameRow}>
                  <Text style={styles.sellerName}>{seller.name}</Text>
                  {seller.is_premium && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name="star" size={10} color="#F59E0B" />
                      <Text style={styles.premiumBadgeText}>Premium</Text>
                    </View>
                  )}
                </View>
                {sellerPhone && !isSeller && (
                  <Text style={styles.sellerPhone}>
                    <Ionicons name="logo-whatsapp" size={12} color={Colors.whatsapp} /> {sellerPhone}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {product.status === 'sold' ? (
          // Produto vendido
          <View style={styles.row}>
            <View style={[styles.actionBtn, styles.soldBtn]}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.sold} style={{ marginRight: 8 }} />
              <Text style={styles.soldBtnText}>Produto vendido</Text>
            </View>
            {/* Vendedor pode reativar */}
            {isSeller && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleMarkAsAvailable}>
                <Text style={styles.secondaryBtnText}>Reativar</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : isSeller ? (
          // Vendedor vendo o próprio produto
          <View style={styles.row}>
            {/* Botão de destaque — só para Premium */}
            {isPremiumSeller && (
              <TouchableOpacity
                style={[styles.featuredBtn, isActiveFeatured && styles.featuredBtnActive]}
                onPress={handleToggleFeatured}
                disabled={featuringProduct}
              >
                {featuringProduct ? (
                  <ActivityIndicator color={isActiveFeatured ? '#92400E' : Colors.textSecondary} size="small" />
                ) : (
                  <>
                    <Ionicons name="star" size={18} color={isActiveFeatured ? '#D97706' : Colors.textSecondary} />
                    <Text style={[styles.featuredBtnText, isActiveFeatured && styles.featuredBtnTextActive]}>
                      {isActiveFeatured ? 'Em destaque' : 'Destacar 1h'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, styles.markSoldBtn, { flex: 1 }]}
              onPress={handleMarkAsSold}
              disabled={markingAsSold}
            >
              {markingAsSold ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.btnInner}>
                  <Ionicons name="checkmark-done-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.actionBtnText}>Marcar como vendido</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : sellerPhone ? (
          // Comprador com contato disponível
          <TouchableOpacity style={[styles.actionBtn, styles.contactBtn]} onPress={handleContact}>
            <Ionicons name="logo-whatsapp" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.actionBtnText}>Contatar via WhatsApp</Text>
          </TouchableOpacity>
        ) : (
          // Sem contato cadastrado
          <View style={styles.noContactBox}>
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.noContactText}>Vendedor não cadastrou contato</Text>
          </View>
        )}

        {/* Excluir anúncio — só para o vendedor */}
        {isSeller && (
          showDeleteConfirm ? (
            <View style={styles.deleteConfirmBox}>
              <Text style={styles.deleteConfirmText}>Tem certeza? Esta ação não pode ser desfeita.</Text>
              <View style={styles.deleteConfirmRow}>
                <TouchableOpacity
                  style={styles.deleteCancelBtn}
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text style={styles.deleteCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteConfirmBtn}
                  onPress={handleDelete}
                  disabled={deletingProduct}
                >
                  {deletingProduct
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.deleteConfirmBtnText}>Excluir</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.deleteLink} onPress={() => setShowDeleteConfirm(true)}>
              <Ionicons name="trash-outline" size={14} color={Colors.error} />
              <Text style={styles.deleteLinkText}>Excluir anúncio</Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  imageContainer: { position: 'relative' },
  image: { backgroundColor: Colors.border },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.full, padding: 8,
    ...Shadow.card,
  },
  favBtn: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.full, padding: 8,
    ...Shadow.card,
  },
  dots: {
    position: 'absolute', bottom: 12,
    flexDirection: 'row', alignSelf: 'center', gap: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 16 },
  soldOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  soldOverlayText: { color: '#fff', fontSize: 32, fontWeight: '900', letterSpacing: 4 },
  content: { padding: Spacing.md },
  badges: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  catBadge: {
    backgroundColor: Colors.secondary + '22',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full,
  },
  catBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.secondary },
  condBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  condBadgeText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  price: { fontSize: 28, fontWeight: '900', color: Colors.primary, marginBottom: 4 },
  date: { fontSize: 12, color: Colors.textMuted, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  description: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22, marginBottom: Spacing.md },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadow.card,
  },
  sellerAvatar: { marginRight: Spacing.sm },
  sellerImg: { width: 44, height: 44, borderRadius: 22 },
  sellerImgPlaceholder: { backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sellerInitials: { fontWeight: '700', color: Colors.primary },
  sellerLabel: { fontSize: 11, color: Colors.textMuted },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  sellerName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', borderRadius: 99,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  premiumBadgeText: { fontSize: 10, fontWeight: '700', color: '#92400E' },
  sellerPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  // Footer
  footer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  row: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Botão "Produto vendido": fundo claro + texto escuro (cinza não contrasta com branco)
  soldBtn: { backgroundColor: '#F1F5F9' },
  soldBtnText: { color: Colors.sold, fontSize: 16, fontWeight: '700' },
  contactBtn: { backgroundColor: Colors.whatsapp },
  markSoldBtn: { backgroundColor: Colors.primary },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  featuredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  featuredBtnActive: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  featuredBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  featuredBtnTextActive: {
    color: '#92400E',
  },
  noContactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.border,
    borderRadius: Radius.md,
  },
  noContactText: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  deleteLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, marginTop: Spacing.sm, paddingVertical: 4,
  },
  deleteLinkText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  deleteConfirmBox: {
    marginTop: Spacing.sm,
    backgroundColor: '#FEE2E2', borderRadius: Radius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: '#FECACA',
  },
  deleteConfirmText: { fontSize: 13, color: Colors.error, fontWeight: '600', marginBottom: Spacing.sm },
  deleteConfirmRow: { flexDirection: 'row', gap: Spacing.sm },
  deleteCancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.md, padding: 10, alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  deleteCancelText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  deleteConfirmBtn: {
    flex: 1, backgroundColor: Colors.error,
    borderRadius: Radius.md, padding: 10, alignItems: 'center',
  },
  deleteConfirmBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
