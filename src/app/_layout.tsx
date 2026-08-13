import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { useNotificationNavigation } from '@/hooks/useNotifications';
import { ensureChannel } from '@/lib/notifications';
import { Colors } from '@/core/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  useNotificationNavigation();

  useEffect(() => {
    ensureChannel().catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.bg },
            headerTintColor: Colors.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: Colors.bg },
          }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="sinal/[id]" options={{ title: 'Análise Completa' }} />
          <Stack.Screen name="planos" options={{ title: 'Planos', presentation: 'modal' }} />
          <Stack.Screen name="banca" options={{ title: 'Gestão de Banca' }} />
          <Stack.Screen name="plano-crescimento" options={{ title: 'Plano de Crescimento' }} />
          <Stack.Screen name="termos" options={{ title: 'Termos de Uso' }} />
          <Stack.Screen name="privacidade" options={{ title: 'Privacidade' }} />
          <Stack.Screen name="aviso-risco" options={{ title: 'Aviso de Risco' }} />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
