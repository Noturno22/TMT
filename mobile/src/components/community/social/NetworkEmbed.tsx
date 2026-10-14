import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui';
import { NETWORK_BY_ID, type ParsedNetworkLink } from '@/core/communitySocial';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';

const EMBED_HEIGHT: Record<string, number> = {
  youtube: 210,
  tiktok: 420,
  instagram: 380,
  telegram: 420,
  x: 320,
};

export function NetworkEmbed({ link }: { link: ParsedNetworkLink }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const meta = NETWORK_BY_ID[link.network];

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={[styles.tag, { backgroundColor: `${meta.color}22` }]}>
          <AppText variant="small" style={{ color: meta.color, fontWeight: '800' }}>
            {meta.label.split(' ')[0]}
          </AppText>
        </View>
        <Pressable style={styles.open} onPress={() => Linking.openURL(link.external_url)}>
          <AppText variant="small" style={{ color: colors.primary, fontWeight: '700' }}>
            {meta.label.split(' ')[0]}
          </AppText>
          <Ionicons name="open-outline" size={13} color={colors.primary} />
        </Pressable>
      </View>

      {link.embed_url ? (
        <WebView
          source={{ uri: link.embed_url }}
          style={{ height: EMBED_HEIGHT[link.network] ?? 240, backgroundColor: '#000' }}
          allowsFullscreenVideo
          mediaPlaybackRequiresUserAction
          javaScriptEnabled
        />
      ) : (
        <Pressable style={styles.linkRow} onPress={() => Linking.openURL(link.external_url)}>
          <AppText variant="small" style={{ color: colors.primary }} numberOfLines={1}>
            {link.external_url}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      marginTop: Spacing.sm,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: `${c.surfaceElevated}88`,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    open: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
    linkRow: { padding: Spacing.md },
  });
