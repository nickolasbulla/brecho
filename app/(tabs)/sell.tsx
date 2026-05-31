import { useToast } from '@/components/Toast';
import { Colors, Radius, Shadow, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { generateUUID } from '@/lib/helpers';
import { Category, supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CONDITIONS = ['Novo', 'Seminovo', 'Usado', 'Muito usado'] as const;
const FREE_LIMIT = 5;

export default function SellScreen() {
  const { user } = useAuth();
  const { profile, refetch: refetchProfile } = useProfile(user?.id);
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<string>('Seminovo');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [images, setImages] = useState<{ uri: string; mimeType: string }[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [formError, setFormError] = useState('');
  const [activeCount, setActiveCount] = useState(0);

  // Verifica o número de anúncios ativos do usuário
  const checkLimit = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('status', 'available');
    setActiveCount(count ?? 0);
  }, [user]);

  useFocusEffect(useCallback(() => { refetchProfile(); checkLimit(); }, [refetchProfile, checkLimit]));

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  const isPremium = profile?.is_premium ?? false;
  const isAtLimit = !isPremium && activeCount >= FREE_LIMIT;

  // ── Tela de limite atingido ──────────────────────────────────────
  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <Text style={styles.centerEmoji}>🔒</Text>
          <Text style={styles.centerTitle}>Entre para anunciar</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.ctaBtnText}>Entrar / Cadastrar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isAtLimit) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerBox}>
          <Text style={styles.centerEmoji}>📦</Text>
          <Text style={styles.centerTitle}>Limite atingido</Text>
          <Text style={styles.centerSubtitle}>
            Você já tem {FREE_LIMIT} anúncios ativos.{'\n'}
            Assine o Premium para publicar sem limites.
          </Text>

          <View style={styles.limitCard}>
            <View style={styles.limitRow}>
              <Text style={styles.limitLabel}>Plano gratuito</Text>
              <Text style={styles.limitValue}>{activeCount} / {FREE_LIMIT} anúncios</Text>
            </View>
            <View style={styles.limitBar}>
              <View style={[styles.limitFill, { width: `${(activeCount / FREE_LIMIT) * 100}%` as any }]} />
            </View>
          </View>

          <TouchableOpacity style={styles.premiumBtn} onPress={() => router.push('/premium')}>
            <Ionicons name="star" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.premiumBtnText}>Assinar Premium — R$ 14,90/mês</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.manageBtn} onPress={() => router.push('/(tabs)/profile')}>
            <Text style={styles.manageBtnText}>Gerenciar meus anúncios</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Formulário normal ────────────────────────────────────────────
  async function pickImage() {
    if (images.length >= 5) { setFormError('Máximo de 5 fotos por anúncio.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.7,
      allowsMultipleSelection: false, base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setImages((prev) => [...prev, { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' }]);
      setFormError('');
    }
  }

  async function uploadImages(productId: string): Promise<string[]> {
    if (!user) return [];
    const urls: string[] = [];
    for (let i = 0; i < images.length; i++) {
      setUploadProgress(`Enviando foto ${i + 1} de ${images.length}...`);
      const { uri, mimeType } = images[i];
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      const path = `${user.id}/${productId}_${i}.${ext}`;
      try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const { error } = await supabase.storage
          .from('product-images')
          .upload(path, blob, { contentType: mimeType, upsert: true });
        if (!error) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(path);
          urls.push(data.publicUrl);
        }
      } catch (err) {
        console.warn('Falha ao enviar imagem', i, err);
      }
    }
    setUploadProgress('');
    return urls;
  }

  async function handleSubmit() {
    if (!user) return;
    setFormError('');
    if (!title.trim()) { setFormError('O título é obrigatório.'); return; }
    if (!price || isNaN(Number(price.replace(',', '.')))) {
      setFormError('Informe um preço válido (ex: 29,90).');
      return;
    }

    setLoading(true);
    try {
      const productId = generateUUID();
      const imageUrls = images.length > 0 ? await uploadImages(productId) : [];
      const { error } = await supabase.from('products').insert({
        id: productId,
        seller_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        price: parseFloat(price.replace(',', '.')),
        condition,
        category_id: categoryId,
        images: imageUrls,
        featured_until: isPremium && isFeatured
          ? new Date(Date.now() + 3_600_000).toISOString()
          : null,
        status: 'available',
      });
      if (error) throw error;

      setTitle(''); setDescription(''); setPrice('');
      setImages([]); setCategoryId(null); setIsFeatured(false);
      showToast(isFeatured ? '⭐ Anúncio em destaque publicado!' : '🎉 Anúncio publicado com sucesso!', 'success');
      router.push({ pathname: '/product/[id]', params: { id: productId } });
    } catch (e: any) {
      setFormError((e as any)?.message ?? 'Não foi possível publicar o anúncio. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.titleRow}>
            <Text style={styles.pageTitle}>Novo anúncio</Text>
            {!isPremium && (
              <TouchableOpacity style={styles.freeCountBadge} onPress={() => router.push('/premium')}>
                <Text style={styles.freeCountText}>{activeCount}/{FREE_LIMIT} grátis</Text>
              </TouchableOpacity>
            )}
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={11} color="#F59E0B" />
                <Text style={styles.premiumBadgeText}>Premium</Text>
              </View>
            )}
          </View>

          {/* Erro de formulário */}
          {formError !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          {/* Toggle de destaque — só pro Premium */}
          {isPremium && (
            <TouchableOpacity
              style={[styles.featuredToggle, isFeatured && styles.featuredToggleOn]}
              onPress={() => setIsFeatured(!isFeatured)}
            >
              <View style={styles.featuredToggleLeft}>
                <Text style={styles.featuredToggleEmoji}>⭐</Text>
                <View>
                  <Text style={[styles.featuredToggleTitle, isFeatured && styles.featuredToggleTitleOn]}>
                    Anúncio em Destaque
                  </Text>
                  <Text style={styles.featuredToggleSub}>Aparece no topo do feed · expira em 1h</Text>
                </View>
              </View>
              <View style={[styles.toggle, isFeatured && styles.toggleOn]}>
                <View style={[styles.toggleThumb, isFeatured && styles.toggleThumbOn]} />
              </View>
            </TouchableOpacity>
          )}

          {/* Fotos */}
          <Text style={styles.label}>Fotos <Text style={styles.hint}>(até 5)</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {images.map((img, i) => (
              <View key={i} style={styles.photoBox}>
                <Image source={{ uri: img.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addPhoto} onPress={pickImage}>
                <Ionicons name="camera" size={28} color={Colors.primary} />
                <Text style={styles.addPhotoText}>Adicionar</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Título */}
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={[styles.input, !title && formError ? styles.inputError : null]}
            placeholder="Ex: Vestido floral tamanho M"
            placeholderTextColor={Colors.textMuted}
            value={title}
            onChangeText={(v) => { setTitle(v); setFormError(''); }}
            maxLength={80}
          />

          {/* Descrição */}
          <Text style={styles.label}>Descrição</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Descreva o estado, tamanho, marca..."
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Preço */}
          <Text style={styles.label}>Preço (R$) *</Text>
          <TextInput
            style={[styles.input, !price && formError ? styles.inputError : null]}
            placeholder="0,00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="decimal-pad"
            value={price}
            onChangeText={(v) => { setPrice(v); setFormError(''); }}
          />

          {/* Condição */}
          <Text style={styles.label}>Condição *</Text>
          <View style={styles.optionsRow}>
            {CONDITIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.optionBtn, condition === c && styles.optionBtnSelected]}
                onPress={() => setCondition(c)}
              >
                <Text style={[styles.optionText, condition === c && styles.optionTextSelected]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Categoria — só exibe quando as categorias já carregaram */}
          {categories.length > 0 && (
            <>
              <Text style={styles.label}>Categoria</Text>
              <View style={styles.optionsWrap}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catBtn, categoryId === cat.id && styles.catBtnSelected]}
                    onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                  >
                    <Text style={[styles.catText, categoryId === cat.id && styles.catTextSelected]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Progresso de upload */}
          {uploadProgress !== '' && (
            <View style={styles.progressBox}>
              <ActivityIndicator color={Colors.primary} size="small" />
              <Text style={styles.progressText}>{uploadProgress}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, isFeatured && styles.submitBtnFeatured]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {isFeatured && <Ionicons name="star" size={16} color="#fff" style={{ marginRight: 6 }} />}
                  <Text style={styles.submitText}>
                    {isFeatured ? 'Publicar em Destaque' : 'Publicar anúncio'}
                  </Text>
                </View>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.md, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  pageTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  freeCountBadge: {
    backgroundColor: Colors.border, borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  freeCountText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FEF3C7', borderRadius: Radius.full,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  premiumBadgeText: { fontSize: 12, fontWeight: '700', color: '#92400E' },
  // Tela de limite / sem login
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  centerEmoji: { fontSize: 56, marginBottom: Spacing.md },
  centerTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm, textAlign: 'center' },
  centerSubtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  limitCard: {
    width: '100%', backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.xl, ...Shadow.card,
  },
  limitRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  limitLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  limitValue: { fontSize: 13, color: Colors.error, fontWeight: '700' },
  limitBar: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden' },
  limitFill: { height: '100%', backgroundColor: Colors.error, borderRadius: 4 },
  premiumBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, paddingHorizontal: Spacing.xl,
    width: '100%', marginBottom: Spacing.sm,
  },
  premiumBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  manageBtn: { padding: Spacing.sm },
  manageBtnText: { fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  ctaBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 14, paddingHorizontal: Spacing.xl,
  },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Toggle destaque
  featuredToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 2, borderColor: Colors.border,
  },
  featuredToggleOn: { borderColor: '#F59E0B', backgroundColor: '#FFFBEB' },
  featuredToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featuredToggleEmoji: { fontSize: 22 },
  featuredToggleTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  featuredToggleTitleOn: { color: '#92400E' },
  featuredToggleSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  toggle: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: Colors.border, justifyContent: 'center', padding: 2,
  },
  toggleOn: { backgroundColor: '#F59E0B' },
  toggleThumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleThumbOn: { alignSelf: 'flex-end' },
  // Formulário
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 6, marginTop: Spacing.md },
  hint: { color: Colors.textMuted, fontWeight: '400' },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: Radius.sm,
    padding: Spacing.sm, marginBottom: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.error,
  },
  errorText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '500' },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1.5,
    borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: 15, color: Colors.text,
  },
  inputError: { borderColor: Colors.error },
  textarea: { height: 100 },
  photoRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  photoBox: { position: 'relative', marginRight: Spacing.sm },
  photo: { width: 88, height: 88, borderRadius: Radius.md, backgroundColor: Colors.border },
  removePhoto: { position: 'absolute', top: -6, right: -6 },
  addPhoto: {
    width: 88, height: 88, borderRadius: Radius.md,
    borderWidth: 2, borderColor: Colors.primary,
    borderStyle: 'dashed', alignItems: 'center',
    justifyContent: 'center', backgroundColor: Colors.primaryLight,
  },
  addPhotoText: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  optionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  optionBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  optionBtnSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  optionText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  optionTextSelected: { color: '#fff' },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  catBtn: {
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  catBtnSelected: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  catText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  catTextSelected: { color: '#fff' },
  progressBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.primaryLight, borderRadius: Radius.sm,
    padding: Spacing.sm, marginTop: Spacing.md,
  },
  progressText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center',
    marginTop: Spacing.xl, ...Shadow.card,
  },
  submitBtnFeatured: { backgroundColor: '#D97706' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
