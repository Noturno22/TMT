import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/core/theme';
import { AppHeader } from '@/components/AppHeader';

export default function ComunidadeLayout() {
  const { t } = useTranslation();
  return (
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
      <Stack.Screen name="index" options={{ title: t('tabs.comunidade'), headerShown: false }} />
      <Stack.Screen
        name="canais/[channelId]"
        options={{ title: t('workspace.channels'), headerBackTitle: t('tabs.comunidade') }}
      />
      <Stack.Screen
        name="dm/[conversationId]"
        options={{ title: t('workspace.dms'), headerBackTitle: t('tabs.comunidade') }}
      />
      <Stack.Screen
        name="novo-dm"
        options={{ title: t('workspace.selectUser'), presentation: 'modal' }}
      />
      <Stack.Screen
        name="novo-canal"
        options={{ title: t('workspace.newChannel'), presentation: 'modal' }}
      />
      <Stack.Screen
        name="user/[userId]"
        options={{ title: t('userProfile.title'), headerBackTitle: t('tabs.comunidade') }}
      />
      <Stack.Screen
        name="pesquisa"
        options={{ title: t('workspace.search'), presentation: 'modal' }}
      />
      <Stack.Screen
        name="loja"
        options={{ title: t('store.title'), headerBackTitle: t('tabs.comunidade') }}
      />
    </Stack>
  );
}
