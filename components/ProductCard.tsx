import { TouchableOpacity, View, Text, Image, StyleSheet } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '@/lib/supabase';
import { formatPrice, conditionColor } from '@/lib/helpers';
import { Colors, Radius, Spacing, Shadow } from '@/constants/theme';

interface Props {
  product: Product;
  isFavorited?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export default function ProductCard({ product, isFavorited, onToggleFavorite }: Props) {
  const { width } = useWindowDimensions();
  const CARD_WIDTH = (width - Spacing.md * 2 - Spacing.sm) / 2;
  const IMAGE_HEIGHT = CARD_WIDTH * 1.15; // proporção retangular (tipo fashion app)

  const mainImage = product.images?.[0];

  return (
    <TouchableOpacity
      style={[styles.card, { width: CARD_WIDTH }]}
      onPress={() => router.push(`/product/${product.id}`)}
      activeOpacity={0.9}
    >
      {/* Imagem */}
      <View style={[styles.imageContainer, { height: IMAGE_HEIGHT }]}>
        {mainImage ? (
          <Image
            source={{ uri: mainImage }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={{ fontSize: 28 }}>🛍️</Text>
          </View>
        )}

        {product.status === 'sold' && (
          <View style={styles.soldBadge}>
            <Text style={styles.soldText}>VENDIDO</Text>
          </View>
        )}

        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={() => onToggleFavorite(product.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorited ? Colors.primary : '#fff'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
        <Text style={styles.price}>{formatPrice(product.price)}</Text>
        <View style={[styles.conditionBadge, { backgroundColor: conditionColor(product.condition) + '22' }]}>
          <Text style={[styles.conditionText, { color: conditionColor(product.condition) }]}>
            {product.condition}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadow.card,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.border,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.sold,
    borderRadius: Radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  soldText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radius.full,
    padding: 4,
  },
  info: { padding: Spacing.sm },
  title: { fontSize: 12, fontWeight: '600', color: Colors.text, marginBottom: 3, lineHeight: 16 },
  price: { fontSize: 14, fontWeight: '800', color: Colors.primary, marginBottom: 4 },
  conditionBadge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  conditionText: { fontSize: 9, fontWeight: '700' },
});
