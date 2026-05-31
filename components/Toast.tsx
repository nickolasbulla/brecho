import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Radius, Spacing, Shadow } from '@/constants/theme';

// ─── Tipos ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

// ─── Provider (envolve o app inteiro) ─────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Renderiza os toasts por cima de tudo */}
      <View style={styles.container}>
        {toasts.map((toast) => (
          <View key={toast.id} style={[styles.toast, styles[toast.type]]}>
            <Ionicons
              name={
                toast.type === 'success'
                  ? 'checkmark-circle'
                  : toast.type === 'error'
                  ? 'alert-circle'
                  : 'information-circle'
              }
              size={20}
              color="#fff"
            />
            <Text style={styles.text}>{toast.message}</Text>
          </View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
    gap: Spacing.sm,
    pointerEvents: 'none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    ...Shadow.toast,
  },
  success: { backgroundColor: '#22C55E' },
  error:   { backgroundColor: '#EF4444' },
  info:    { backgroundColor: '#3B82F6' },
  text: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '600' },
});
