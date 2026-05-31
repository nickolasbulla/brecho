import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Colors, Spacing, Radius, Shadow } from '@/constants/theme';

const BENEFITS = [
  { icon: 'infinite-outline',       text: 'Anúncios ilimitados' },
  { icon: 'star-outline',           text: 'Marque anúncios como Destaque ⭐' },
  { icon: 'trending-up-outline',    text: 'Produtos em destaque aparecem primeiro no feed' },
  { icon: 'shield-checkmark-outline', text: 'Selo ✓ Vendedor Premium no perfil' },
  { icon: 'flash-outline',          text: 'Prioridade no suporte' },
];

export default function PremiumScreen() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubscribe() {
    if (!user) { router.replace('/(auth)/login'); return; }
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', user.id);
    setLoading(false);
    if (error) {
      showToast('Erro ao ativar o plano. Tente novamente.', 'error');
      return;
    }
    setSuccess(true);
  }

  if (success) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>Você é Premium!</Text>
          <Text style={styles.successSubtitle}>
            Seu plano está ativo. Agora você pode publicar anúncios ilimitados e usar o Destaque.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Começar a usar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Plano Premium</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.hero}>
          <Text style={styles.heroEmoji}>⭐</Text>
          <Text style={styles.heroTitle}>Vendedor Premium</Text>
          <Text style={styles.heroSubtitle}>Venda mais, apareça primeiro</Text>

          <View style={styles.priceBox}>
            <Text style={styles.priceLabel}>apenas</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceCurrency}>R$</Text>
              <Text style={styles.priceValue}>14</Text>
              <Text style={styles.priceCents}>,90</Text>
            </View>
            <Text style={styles.pricePeriod}>por mês</Text>
          </View>
        </LinearGradient>

        {/* Benefícios */}
        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>O que você ganha</Text>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Ionicons name={b.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        {/* Comparativo */}
        <View style={styles.compareCard}>
          <Text style={styles.benefitsTitle}>Gratuito vs Premium</Text>
          <View style={styles.compareRow}>
            <Text style={styles.compareHeader}>Recurso</Text>
            <Text style={[styles.compareHeader, { textAlign: 'center' }]}>Grátis</Text>
            <Text style={[styles.compareHeader, { textAlign: 'center', color: Colors.primary }]}>Premium</Text>
          </View>
          {[
            ['Anúncios ativos', 'Até 5', 'Ilimitado'],
            ['Anúncio em Destaque', '✗', '✓'],
            ['Posição no feed', 'Normal', '1º lugar'],
            ['Selo no perfil', '✗', '✓ Premium'],
          ].map(([feature, free, premium], i) => (
            <View key={i} style={[styles.compareRow, i % 2 === 0 && styles.compareRowAlt]}>
              <Text style={styles.compareFeature}>{feature}</Text>
              <Text style={styles.compareValue}>{free}</Text>
              <Text style={[styles.compareValue, { color: Colors.primary, fontWeight: '700' }]}>{premium}</Text>
            </View>
          ))}
        </View>

        {/* Nota simulação */}
        <View style={styles.demoNote}>
          <Ionicons name="information-circle-outline" size={15} color={Colors.textMuted} />
          <Text style={styles.demoNoteText}>
            Demonstração acadêmica — nenhum pagamento real é cobrado.
          </Text>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.subscribeBtn} onPress={handleSubscribe} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="star" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.subscribeBtnText}>Assinar por R$ 14,90/mês</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={styles.cancelNote}>Cancele quando quiser</Text>
      </ScrollView>
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
  scroll: { paddingBottom: 40 },
  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: Spacing.lg },
  priceBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.xl, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl },
  priceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end' },
  priceCurrency: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  priceValue: { fontSize: 56, fontWeight: '900', color: '#fff', lineHeight: 60 },
  priceCents: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  pricePeriod: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  // Benefícios
  benefitsCard: {
    backgroundColor: Colors.surface, margin: Spacing.md,
    borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.card,
  },
  benefitsTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: Spacing.md },
  benefitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  benefitIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  benefitText: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  // Comparativo
  compareCard: {
    backgroundColor: Colors.surface, marginHorizontal: Spacing.md, marginBottom: Spacing.md,
    borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.card,
  },
  compareRow: { flexDirection: 'row', paddingVertical: 8 },
  compareRowAlt: { backgroundColor: Colors.background, borderRadius: Radius.sm },
  compareHeader: { flex: 1, fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  compareFeature: { flex: 1.5, fontSize: 13, color: Colors.text },
  compareValue: { flex: 1, fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  // Demo note
  demoNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.md, marginBottom: Spacing.md,
  },
  demoNoteText: { flex: 1, fontSize: 11, color: Colors.textMuted, fontStyle: 'italic' },
  // CTA
  subscribeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    marginHorizontal: Spacing.md, padding: Spacing.md, ...Shadow.card,
  },
  subscribeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  cancelNote: { textAlign: 'center', fontSize: 12, color: Colors.textMuted, marginTop: Spacing.sm },
  // Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successEmoji: { fontSize: 72, marginBottom: Spacing.md },
  successTitle: { fontSize: 28, fontWeight: '900', color: Colors.primary, marginBottom: Spacing.sm },
  successSubtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
  doneBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
