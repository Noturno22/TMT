import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from '@/hooks/useAuth';
import { AiFab } from '@/components/AiFab';
import { useNotificationNavigation, useUpgradeNotification } from '@/hooks/useNotifications';
import { ensureChannel } from '@/lib/notifications';
import { Colors } from '@/core/theme';
import { initI18n, getStoredLanguage, detectDeviceLanguage, i18n } from '@/lib/i18n';

initI18n();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function NotificationInit() {
  useUpgradeNotification();
  return null;
}

function LanguageSync() {
  useEffect(() => {
    let mounted = true;
    const apply = () => {
      getStoredLanguage().then((stored) => {
        if (!mounted) return;
        if (stored) {
          if (i18n.language !== stored) i18n.changeLanguage(stored);
        } else {
          const device = detectDeviceLanguage();
          if (i18n.language !== device) i18n.changeLanguage(device);
        }
      });
    };
    apply();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') apply();
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return null;
}

export default function RootLayout() {
  const { t } = useTranslation();
  useNotificationNavigation();

  useEffect(() => {
    ensureChannel().catch(() => {});
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageSync />
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
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="sinal/[id]" options={{ title: t('sinal.title') }} />
          <Stack.Screen name="sinal/chart/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
          <Stack.Screen name="planos" options={{ title: t('planos.title'), presentation: 'modal' }} />
          <Stack.Screen name="banca" options={{ title: t('banca.title') }} />
          <Stack.Screen name="notificacoes" options={{ title: t('notificacoes.title') }} />
          <Stack.Screen name="definicoes-booms" options={{ title: t('definicoesBooms.title'), presentation: 'modal' }} />
          <Stack.Screen name="suporte-ia" options={{ title: t('suporteIa.title'), presentation: 'modal', headerShown: false }} />
          <Stack.Screen name="idioma" options={{ title: t('language.title'), presentation: 'modal' }} />
          <Stack.Screen name="termos" options={{ title: t('legal.termosTitle') }} />
          <Stack.Screen name="privacidade" options={{ title: t('legal.privacidadeTitle') }} />
          <Stack.Screen name="aviso-risco" options={{ title: t('legal.avisoRiscoTitle') }} />
        </Stack>
        <AiFab />
      </AuthProvider>
    </QueryClientProvider>
  );
}
