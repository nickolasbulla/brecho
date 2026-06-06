import { useEffect } from 'react';
import { LogBox, Platform, View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

LogBox.ignoreLogs([
  'props.pointerEvents is deprecated',
  '"shadow*" style props are deprecated',
]);
import {
  useFonts,
  Poppins_400Regular,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '@/components/Toast';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  const app = (
    <SafeAreaProvider>
      <ToastProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="product/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="product/edit/[id]" options={{ presentation: 'card' }} />
          <Stack.Screen name="seller/[id]" options={{ presentation: 'card' }} />
        </Stack>
      </ToastProvider>
    </SafeAreaProvider>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webShell}>
        <View style={styles.webFrame}>{app}</View>
      </View>
    );
  }

  return app;
}

const styles = StyleSheet.create({
  webShell: {
    flex: 1,
    backgroundColor: '#D6C4B0',
    alignItems: 'center',
    justifyContent: 'center',
  } as any,
  webFrame: {
    width: 430,
    height: '100%' as any,
    maxHeight: 932,
    overflow: 'hidden' as any,
    backgroundColor: Colors.background,
    boxShadow: '0 0 40px rgba(0,0,0,0.25)',
    borderRadius: 0,
  } as any,
});
