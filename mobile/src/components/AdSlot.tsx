import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';
import { Radius, Spacing, type Palette } from '@/core/theme';

/**
 * Slot de anuncio Google Ads.
 *
 * Ainda sem SDK nativo (AdMob) integrado, por isso:
 * - em desenvolvimento mostra um contorno tracejado com o rotulo;
 * - em producao nao renderiza nada.
 *
 * Quando EXPO_PUBLIC_GOOGLE_ADS_CLIENT / EXPO_PUBLIC_GOOGLE_ADS_SLOT estiverem
 * definidos, este componente passa a ser o ponto de integracao do AdMob
 * (requer build nativo, nao corre no Expo Go).
 */
export function AdSlot({ label }: { label?: string }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  if (!__DEV__) return null;

  return (
    <View style={styles.slot} accessibilityRole="none">
      <AppText variant="small" style={styles.text}>
        {label ?? t('ads.placeholder')}
      </AppText>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    slot: {
      minHeight: 90,
      marginVertical: Spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    text: {
      color: c.textMuted,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
  });
