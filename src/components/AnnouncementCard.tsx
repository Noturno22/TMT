import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';
import { useAnnouncements } from '@/hooks/useAnnouncements';

export function AnnouncementCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const { announcements } = useAnnouncements();
  const ad = announcements[0];

  if (!ad) return null;

  const openLink = () => {
    if (!ad.link) return;
    if (ad.link.startsWith('/')) {
      // @ts-expect-error rota dinâmica gerida pelos admins
      router.push(ad.link);
      return;
    }
    Linking.openURL(ad.link).catch(() => {});
  };

  const cta = (
    <View style={styles.cta}>
      <AppText variant="small" style={styles.ctaText} numberOfLines={1}>
        {ad.link_label || t('inicio.announceCta')}
      </AppText>
      <Ionicons name="chevron-forward" size={13} color="#0A0A0A" />
    </View>
  );

  const content = (
    <>
      {ad.image_url ? <Image source={{ uri: ad.image_url }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      <LinearGradient
        colors={ad.image_url ? ['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.85)'] : [Colors.primaryDim, 'rgba(22,164,58,0.22)']}
        start={{ x: 0, y: 0 }}
        end={ad.image_url ? { x: 1, y: 0 } : { x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.row, !ad.image_url && styles.plainBorder]}>
        <View style={styles.iconWrap}>
          <Ionicons name="megaphone" size={20} color={Colors.success} />
        </View>
        <View style={styles.textWrap}>
          <AppText variant="label" numberOfLines={1}>{ad.title}</AppText>
          {ad.body ? (
            <AppText variant="small" style={styles.body} numberOfLines={2}>
              {ad.body}
            </AppText>
          ) : null}
        </View>
        {ad.link ? cta : null}
      </View>
    </>
  );

  if (ad.link) {
    return (
      <Pressable
        onPress={openLink}
        accessibilityRole="button"
        accessibilityLabel={ad.title}
        style={({ pressed }) => [styles.banner, pressed && { opacity: 0.85 }]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.banner}>{content}</View>;
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginBottom: Spacing.lg,
  },
  plainBorder: {
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.success}1F`,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  body: {
    color: Colors.textMuted,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: Colors.accent,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: 130,
  },
  ctaText: {
    color: '#0A0A0A',
    fontWeight: '800',
  },
});
