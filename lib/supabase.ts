import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL polyfill só é necessário no React Native nativo (web já tem URL built-in)
if (Platform.OS !== 'web') {
  require('react-native-url-polyfill/auto');
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No web, o Supabase precisa detectar tokens de auth na URL (redirects de email)
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type Profile = {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  created_at: string;
};

export type Category = {
  id: number;
  name: string;
  icon_name: string;
};

export type Product = {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  price: number;
  category_id: number | null;
  condition: 'Novo' | 'Seminovo' | 'Usado' | 'Muito usado';
  images: string[];
  status: 'available' | 'sold';
  created_at: string;
  profiles?: Profile;
  categories?: Category;
};

export type Favorite = {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  products?: Product;
};

export type Order = {
  id: string;
  product_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  product_title: string;
  product_price: number;
  commission_rate: number;
  commission_amount: number;
  seller_amount: number;
  status: 'completed' | 'cancelled';
  created_at: string;
};
