import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Image, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { getProduct } from '@/hooks/useProducts';
import { supabase, Category } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

const CONDITIONS = ['Novo', 'Seminovo', 'Usado', 'Muito usado'] as const;

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();

  // form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState<string>('Seminovo');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  // imagens já salvas no storage (URLs)
  const [existingImages, setExistingImages] = useState<string[]>([]);
  // novas imagens escolhidas localmente (ainda não enviadas)
  const [newImages, setNewImages] = useState<{ uri: string; mimeType: string }[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [formError, setFormError] = useState('');

  // carrega produto existente
  useEffect(() => {
    if (!id || !user) return;
    getProduct(id).then((p) => {
      if (!p || p.seller_id !== user.id) { router.back(); return; }
      setTitle(p.title);
      setDescription(p.description ?? '');
      setPrice(String(p.price).replace('.', ','));
      setCondition(p.condition);
      setCategoryId(p.category_id ?? null);
      setExistingImages(p.images ?? []);
      setFetching(false);
    });
  }, [id, user]);

  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  async function pickImage() {
    const total = existingImages.length + newImages.length;
    if (total >= 5) { setFormError('Máximo de 5 fotos por anúncio.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: false,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setNewImages((prev) => [...prev, { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' }]);
      setFormError('');
    }
  }

  async function uploadNewImages(): Promise<string[]> {
    if (!user || !id) return [];
    const urls: string[] = [];
    for (let i = 0; i < newImages.length; i++) {
      setUploadProgress(`Enviando foto ${i + 1} de ${newImages.length}...`);
      const { uri, mimeType } = newImages[i];
      const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
      const path = `${user.id}/${id}_edit_${Date.now()}_${i}.${ext}`;
      try {
        const blob = await (await fetch(uri)).blob();
        const { error } = await supabase.storage
          .from('product-images')
          .upload(path, blob, { contentType: mimeType, upsert: true });
        if (!error) {
          const { data } = supabase.storage.from('product-images').getPublicUrl(path);
          urls.push(data.publicUrl);
        }
      } catch { /* continua */ }
    }
    setUploadProgress('');
    return urls;
  }

  async function handleSave() {
    if (!user || !id) return;
    setFormError('');
    if (!title.trim()) { setFormError('O título é obrigatório.'); return; }
    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (!price || isNaN(parsedPrice)) { setFormError('Informe um preço válido (ex: 29,90).'); return; }

    setLoading(true);
    try {
      const uploaded = newImages.length > 0 ? await uploadNewImages() : [];
      const finalImages = [...existingImages, ...uploaded];

      const { error } = await supabase
        .from('products')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price: parsedPrice,
          condition,
          category_id: categoryId,
          images: finalImages,
        })
        .eq('id', id)
        .eq('seller_id', user.id);

      if (error) throw error;

      showToast('✅ Anúncio atualizado!', 'success');
      router.back();
    } catch (e: any) {
      setFormError(e?.message ?? 'Erro ao salvar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (fetching) {
    return <ActivityIndicator color={Colors.primary} style={{ flex: 1, marginTop: 80 }} size="large" />;
  }

  const totalImages = existingImages.length + newImages.length;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Editar anúncio</Text>
        <TouchableOpacity style={styles.saveTopBtn} onPress={handleSave} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveTopBtnText}>Salvar</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Erro */}
          {formError !== '' && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          )}

          {/* Fotos */}
          <Text style={styles.label}>Fotos <Text style={styles.hint}>(até 5)</Text></Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {/* Imagens já existentes */}
            {existingImages.map((url, i) => (
              <View key={`ex-${i}`} style={styles.photoBox}>
                <Image source={{ uri: url }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setExistingImages((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {/* Novas imagens locais */}
            {newImages.map((img, i) => (
              <View key={`new-${i}`} style={styles.photoBox}>
                <Image source={{ uri: img.uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setNewImages((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {totalImages < 5 && (
              <TouchableOpacity style={styles.addPhoto} onPress={pickImage}>
                <Ionicons name="camera" size={28} color={Colors.primary} />
                <Text style={styles.addPhotoText}>Adicionar</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Título */}
          <Text style={styles.label}>Título *</Text>
          <TextInput
            style={styles.input}
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
            style={styles.input}
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

          {/* Categoria */}
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
                    <Text style={[styles.catText, categoryId === cat.id && styles.catTextSelected]}>
                      {cat.name}
                    </Text>
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

          <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitText}>Salvar alterações</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 38, height: 38, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  saveTopBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 8, minWidth: 70, alignItems: 'center',
  },
  saveTopBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  container: { padding: Spacing.md, paddingBottom: 40 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEE2E2', borderRadius: Radius.sm,
    padding: Spacing.sm, marginBottom: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.error,
  },
  errorText: { flex: 1, fontSize: 13, color: Colors.error, fontWeight: '500' },
  label: { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 6, marginTop: Spacing.md },
  hint: { color: Colors.textMuted, fontWeight: '400' },
  photoRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  photoBox: { position: 'relative', marginRight: Spacing.sm },
  photo: { width: 88, height: 88, borderRadius: Radius.md, backgroundColor: Colors.border },
  removePhoto: { position: 'absolute', top: -6, right: -6 },
  addPhoto: {
    width: 88, height: 88, borderRadius: Radius.md,
    borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primaryLight,
  },
  addPhotoText: { fontSize: 11, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  input: {
    backgroundColor: Colors.surface, borderWidth: 1.5,
    borderColor: Colors.border, borderRadius: Radius.md,
    padding: Spacing.md, fontSize: 15, color: Colors.text,
  },
  textarea: { height: 100 },
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
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
