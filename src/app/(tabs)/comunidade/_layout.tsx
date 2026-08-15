import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function ComunidadeLayout() {
  const { t } = useTranslation();
  return (
    <Stack>
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
    </Stack>
  );
}
