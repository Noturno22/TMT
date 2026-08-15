import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/useAuth';
import { AiFab } from '@/components/AiFab';
import { useNotificationNavigation, useUpgradeNotification } from '@/hooks/useNotifications';
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

function NotificationInit() {
  useUpgradeNotification();
  return null;
}

export default function RootLayout() {
  useNotificationNavigation();

  useEffect(() => {
    ensureChannel().catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationInit />
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
          <Stack.Screen name="notificacoes" options={{ title: 'Notificações' }} />
          <Stack.Screen name="definicoes-booms" options={{ title: 'Definições do Boom', presentation: 'modal' }} />
          <Stack.Screen name="suporte-ia" options={{ title: 'Suporte IA', presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="plano-crescimento" options={{ title: 'Plano de Crescimento' }} />
          <Stack.Screen name="termos" options={{ title: 'Termos de Uso' }} />
          <Stack.Screen name="privacidade" options={{ title: 'Privacidade' }} />
          <Stack.Screen name="aviso-risco" options={{ title: 'Aviso de Risco' }} />
        </Stack>
        <AiFab />
      </AuthProvider>
    </QueryClientProvider>
  );
}
