export const Colors = {
  primary: '#7B4F2E',       // marrom principal
  primaryLight: '#F3E6D5',  // bege claro
  primaryDark: '#5C3820',   // marrom escuro
  secondary: '#C4956A',     // marrom dourado / caramelo
  background: '#FAF7F4',    // off-white quente
  surface: '#FFFFFF',
  card: '#FFFFFF',
  border: '#EDE3D8',        // borda bege
  text: '#2C1A0E',          // quase preto marrom
  textSecondary: '#7A6251', // marrom médio
  textMuted: '#B09A87',     // marrom claro
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
  sold: '#94A3B8',
  whatsapp: '#25D366',
  tabBar: '#FFFFFF',
  tabBarActive: '#7B4F2E',
  tabBarInactive: '#B09A87',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

import { Platform } from 'react-native';

export const Shadow = {
  card: Platform.select({
    web: { boxShadow: '0 2px 8px rgba(0,0,0,0.08)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
  })!,
  cardLg: Platform.select({
    web: { boxShadow: '0 4px 16px rgba(0,0,0,0.10)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 5,
    },
  })!,
  toast: Platform.select({
    web: { boxShadow: '0 4px 10px rgba(0,0,0,0.25)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    },
  })!,
  modal: Platform.select({
    web: { boxShadow: '0 -4px 12px rgba(0,0,0,0.10)' } as any,
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 8,
    },
  })!,
};
