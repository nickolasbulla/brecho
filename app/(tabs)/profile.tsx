import { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useToast } from '@/components/Toast';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase, Product } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';
import { getInitials } from '@/lib/helpers';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const { profile, loading, updateProfile, refetch: refetchProfile } = useProfile(user?.id);
  const [listings, setListings] = useState<Product[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const loadData = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setListings(data);
    setDataLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { refetchProfile(); loadData(); }, [refetchProfile, loadData]));

async function handleSaveProfile() {
    setProfileError('');
    try {
      await updateProfile({ name: editName, bio: editBio, location: editLocation, phone: editPhone || null });
      setEditing(false);
      showToast('Perfil salvo!', 'success');
    } catch {
      setProfileError('Erro ao salvar perfil. Tente novamente.');
    }
  }

  async function handlePickAvatar() {
    if (!user) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `avatars/${user.id}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    await supabase.storage.from('product-images').upload(path, blob, { contentType: `image/${ext}`, upsert: true });
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    await updateProfile({ avatar_url: data.publicUrl });
  }

  async function confirmLogout() {
    setShowLogoutConfirm(false);
    await signOut();
    router.replace('/(auth)/login');
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <EmptyState emoji="👤" title="Você não está logado" subtitle="Entre para ver seu perfil" />
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginBtnText}>Entrar / Cadastrar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (loading) return <ActivityIndicator color={Colors.primary} style={{ marginTop: 80 }} size="large" />;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrap}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.initials}>{getInitials(profile?.name ?? 'U')}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          {editing ? (
            <View style={styles.editForm}>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nome"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                style={styles.editInput}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Bio"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                style={styles.editInput}
                value={editLocation}
                onChangeText={setEditLocation}
                placeholder="Cidade"
                placeholderTextColor={Colors.textMuted}
              />
              <View style={styles.phoneInputRow}>
                <Ionicons name="logo-whatsapp" size={16} color={Colors.whatsapp} style={{ marginRight: 6 }} />
                <TextInput
                  style={[styles.editInput, { flex: 1 }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="WhatsApp (ex: 11999999999)"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
                  <Text style={styles.saveBtnText}>Salvar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.userInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{profile?.name}</Text>
                {profile?.is_premium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={11} color="#F59E0B" />
                    <Text style={styles.premiumBadgeText}>Premium</Text>
                  </View>
                )}
              </View>
              {profile?.location && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={13} color={Colors.textSecondary} />
                  <Text style={styles.infoText}>{profile.location}</Text>
                </View>
              )}
              {profile?.phone && (
                <View style={styles.infoRow}>
                  <Ionicons name="logo-whatsapp" size={13} color={Colors.whatsapp} />
                  <Text style={styles.infoText}>{profile.phone}</Text>
                </View>
              )}
              {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  setEditName(profile?.name ?? '');
                  setEditBio(profile?.bio ?? '');
                  setEditLocation(profile?.location ?? '');
                  setEditPhone(profile?.phone ?? '');
                  setEditing(true);
                }}
              >
                <Ionicons name="pencil" size={13} color={Colors.primary} />
                <Text style={styles.editBtnText}>Editar perfil</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity onPress={() => setShowLogoutConfirm(true)} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={22} color={Colors.error} />
          </TouchableOpacity>
        </View>

        {/* Aviso se não tiver telefone cadastrado */}
        {!profile?.phone && !editing && (
          <TouchableOpacity
            style={styles.phoneWarning}
            onPress={() => {
              setEditName(profile?.name ?? '');
              setEditBio(profile?.bio ?? '');
              setEditLocation(profile?.location ?? '');
              setEditPhone('');
              setEditing(true);
            }}
          >
            <Ionicons name="logo-whatsapp" size={16} color={Colors.whatsapp} />
            <Text style={styles.phoneWarningText}>
              Adicione seu WhatsApp para que compradores possam te contatar
            </Text>
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Banner de erro ao salvar perfil */}
        {profileError !== '' && (
          <View style={styles.inlineError}>
            <Ionicons name="alert-circle" size={15} color={Colors.error} />
            <Text style={styles.inlineErrorText}>{profileError}</Text>
            <TouchableOpacity onPress={() => setProfileError('')}>
              <Ionicons name="close" size={15} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}

        {/* Banner de confirmação de logout */}
        {showLogoutConfirm && (
          <View style={styles.logoutBanner}>
            <Text style={styles.logoutBannerText}>Tem certeza que deseja sair?</Text>
            <View style={styles.logoutBannerActions}>
              <TouchableOpacity style={styles.logoutBannerCancel} onPress={() => setShowLogoutConfirm(false)}>
                <Text style={styles.logoutBannerCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBannerConfirm} onPress={confirmLogout}>
                <Text style={styles.logoutBannerConfirmText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{listings.length}</Text>
            <Text style={styles.statLabel}>Anúncios</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{listings.filter((p) => p.status === 'available').length}</Text>
            <Text style={styles.statLabel}>Disponíveis</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{listings.filter((p) => p.status === 'sold').length}</Text>
            <Text style={styles.statLabel}>Vendidos</Text>
          </View>
        </View>

        {/* Banner de upgrade — só pra usuários não-premium */}
        {!profile?.is_premium && (
          <TouchableOpacity style={styles.upgradeCard} onPress={() => router.push('/premium')}>
            <View style={styles.upgradeLeft}>
              <Text style={styles.upgradeEmoji}>⭐</Text>
              <View>
                <Text style={styles.upgradeTitle}>Assine o Premium</Text>
                <Text style={styles.upgradeSub}>Anúncios ilimitados + Destaque no feed</Text>
              </View>
            </View>
            <View style={styles.upgradeBtn}>
              <Text style={styles.upgradeBtnText}>R$ 14,90/mês</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Meus anúncios */}
        <Text style={styles.sectionTitle}>Meus Anúncios</Text>

        {dataLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 24 }} />
        ) : listings.length === 0 ? (
          <EmptyState emoji="📦" title="Nenhum anúncio" subtitle="Toque em Vender para publicar" />
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.border },
  avatarPlaceholder: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  initials: { fontSize: 24, fontWeight: '700', color: Colors.primary },
  cameraIcon: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primary, borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  infoText: { fontSize: 12, color: Colors.textSecondary },
  bio: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  editBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  logoutBtn: { padding: 4 },
  editForm: { flex: 1, gap: Spacing.sm },
  editInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: 6, fontSize: 14, color: Colors.text,
    backgroundColor: Colors.background,
  },
  phoneInputRow: { flexDirection: 'row', alignItems: 'center' },
  editActions: { flexDirection: 'row', gap: Spacing.sm },
  saveBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.sm,
    padding: 8, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm,
    padding: 8, alignItems: 'center',
  },
  cancelBtnText: { color: Colors.textSecondary, fontSize: 13 },
  phoneWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#F0FDF4',
    borderBottomWidth: 1,
    borderBottomColor: '#BBF7D0',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  phoneWarningText: { flex: 1, fontSize: 13, color: '#166534', fontWeight: '500' },
  stats: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  sectionTitle: {
    fontSize: 16, fontWeight: '700', color: Colors.text,
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },
  loginBtn: {
    margin: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  inlineError: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FEE2E2', padding: Spacing.sm,
    borderLeftWidth: 3, borderLeftColor: Colors.error,
  },
  inlineErrorText: { flex: 1, fontSize: 13, color: Colors.error },
  logoutBanner: {
    backgroundColor: '#FFF7ED',
    borderBottomWidth: 1, borderBottomColor: '#FED7AA',
    padding: Spacing.md,
  },
  logoutBannerText: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  logoutBannerActions: { flexDirection: 'row', gap: Spacing.sm },
  logoutBannerCancel: {
    flex: 1, borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: Radius.sm, padding: 10, alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  logoutBannerCancelText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  logoutBannerConfirm: {
    flex: 1, backgroundColor: Colors.error,
    borderRadius: Radius.sm, padding: 10, alignItems: 'center',
  },
  logoutBannerConfirmText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  // Premium badge no nome
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  premiumBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEF3C7', borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  premiumBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400E' },
  // Banner de upgrade
  upgradeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadow.card,
  },
  upgradeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  upgradeEmoji: { fontSize: 24 },
  upgradeTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
  upgradeSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 },
  upgradeBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  upgradeBtnText: { fontSize: 12, fontWeight: '800', color: '#fff' },
});
