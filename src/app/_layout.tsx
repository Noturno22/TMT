import { useEffect } from 'react';
import { AppState } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { AiFab } from '@/components/AiFab';
import { OnboardingTour } from '@/components/OnboardingTour';
import { useNotificationNavigation, useUpgradeNotification } from '@/hooks/useNotifications';
import { ensureChannel } from '@/lib/notifications';
import { AppHeader } from '@/components/AppHeader';
import { Presence } from '@/hooks/usePresence';
import { PushTokenInit } from '@/hooks/usePushToken';
import { Colors } from '@/core/theme';
import { saveReceiptInbox } from '@/lib/receiptInbox';
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

function ShareIntentHandler() {
  const router = useRouter();
  const { user } = useAuth();
  const { isReady, hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (!isReady || !hasShareIntent) return;
    const file = shareIntent.files?.[0];
    if (!file) {
      resetShareIntent();
      return;
    }
    let cancelled = false;
    (async () => {
      await saveReceiptInbox({
        uri: file.path,
        mimeType: file.mimeType,
        fileName: file.fileName,
      });
      if (cancelled) return;
      resetShareIntent();
      if (user) router.replace('/depositos');
    })();
    return () => {
      cancelled = true;
    };
  }, [isReady, hasShareIntent, shareIntent, resetShareIntent, user, router]);

  return null;
}

export default function RootLayout() {
  const { t } = useTranslation();
  useNotificationNavigation();

  useEffect(() => {
    ensureChannel().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <KeyboardProvider>
    <ShareIntentProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ShareIntentHandler />
          <LanguageSync />
          <NotificationInit />
          <Presence />
          <PushTokenInit />
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.bg },
              headerTintColor: Colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: Colors.bg },
              header: (props) => (
                <AppHeader
                  back={props.back != null}
                  onBack={() => props.navigation.goBack()}
                  title={
                    typeof props.options.headerTitle === 'string'
                      ? props.options.headerTitle
                      : props.options.title
                  }
                  headerRight={
                    props.options.headerRight
                      ? props.options.headerRight({ tintColor: Colors.text, canGoBack: props.back != null })
                      : undefined
                  }
                />
              ),
            }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="google-auth" options={{ headerShown: false }} />
            <Stack.Screen name="sinal/[id]" options={{ title: t('sinal.title') }} />
            <Stack.Screen name="sinal/chart/[id]" options={{ presentation: 'fullScreenModal', animation: 'fade' }} />
            <Stack.Screen name="planos" options={{ title: t('planos.title'), presentation: 'modal' }} />
            <Stack.Screen name="depositos" options={{ title: t('depositos.title'), presentation: 'modal' }} />
            <Stack.Screen name="banca" options={{ title: t('banca.title') }} />
            <Stack.Screen name="diario-trader" options={{ title: t('diario.title') }} />
            <Stack.Screen name="admin-gate" options={{ headerShown: false }} />
            <Stack.Screen name="notificacoes" options={{ title: t('notificacoes.title') }} />
            <Stack.Screen name="definicoes-booms" options={{ title: t('definicoesBooms.title'), presentation: 'modal' }} />
            <Stack.Screen name="suporte-ia" options={{ title: t('suporteIa.title'), presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="idioma" options={{ title: t('language.title'), presentation: 'modal' }} />
            <Stack.Screen name="termos" options={{ title: t('legal.termosTitle') }} />
            <Stack.Screen name="privacidade" options={{ title: t('legal.privacidadeTitle') }} />
            <Stack.Screen name="aviso-risco" options={{ title: t('legal.avisoRiscoTitle') }} />
          </Stack>
          <AiFab />
          <OnboardingTour />
        </AuthProvider>
      </QueryClientProvider>
    </ShareIntentProvider>
    </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
