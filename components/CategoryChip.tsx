import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

interface Props {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export default function CategoryChip({ label, selected, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: Spacing.sm,
  },
  chipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  text: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  textSelected: { color: '#fff' },
});
