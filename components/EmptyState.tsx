import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';

interface Props {
  emoji?: string;
  title: string;
  subtitle?: string;
}

export default function EmptyState({ emoji = '🔍', title, subtitle }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emoji: { fontSize: 48, marginBottom: Spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.sm },
});
