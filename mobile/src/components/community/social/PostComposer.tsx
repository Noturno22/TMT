import { useState } from 'react';
import { Alert, Image, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { AppButton, AppInput, AppText, Chip } from '@/components/ui';
import {
  createPost,
  NETWORKS,
  NETWORK_BY_ID,
  parseNetworkLink,
  uploadPostMedia,
} from '@/core/communitySocial';
import { Radius, Spacing, type Palette } from '@/core/theme';
import { useTheme } from '@/hooks/useTheme';
import type { PostMedia, PostVisibility, SocialNetwork } from '@/core/types';

interface LocalMedia {
  uri: string;
  type: PostMedia['type'];
}

export function PostComposer({
  userId,
  onPosted,
  onCancel,
}: {
  userId: string;
  onPosted: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [media, setMedia] = useState<LocalMedia[]>([]);
  const [visibility, setVisibility] = useState<PostVisibility>('public');
  const [busy, setBusy] = useState(false);

  const parsed = link.trim() ? parseNetworkLink(link) : null;

  const pickMedia = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('social.needGalleryPermission'));
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
      allowsMultipleSelection: true,
      selectionLimit: 4,
    });
    if (res.canceled) return;
    const next: LocalMedia[] = res.assets.map((a) => ({
      uri: a.uri,
      type: a.type === 'video' ? 'video' : 'image',
    }));
    setMedia((prev) => [...prev, ...next].slice(0, 6));
  };

  const publish = async () => {
    const text = content.trim();
    if (!text && media.length === 0 && !parsed) {
      Alert.alert(t('social.emptyPost'));
      return;
    }
    setBusy(true);
    try {
      const uploaded: PostMedia[] = [];
      for (const m of media) {
        const up = await uploadPostMedia(userId, m.uri, m.type);
        if (up) uploaded.push(up);
      }
      await createPost({
        authorId: userId,
        content: text,
        media: uploaded,
        visibility,
        network: parsed?.network ?? null,
        externalUrl: parsed?.external_url ?? null,
        externalId: parsed?.external_id ?? null,
        embed: parsed ? { embed_url: parsed.embed_url } : null,
      });
      setContent('');
      setLink('');
      setMedia([]);
      onPosted();
    } catch {
      Alert.alert(t('social.postError'));
    } finally {
      setBusy(false);
    }
  };

  const visibilityOptions: { key: PostVisibility; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: 'public', icon: 'globe-outline', label: t('social.visibilityPublic') },
    { key: 'followers', icon: 'people-outline', label: t('social.visibilityFollowers') },
    { key: 'private', icon: 'lock-closed-outline', label: t('social.visibilityPrivate') },
  ];

  return (
    <View style={styles.wrap}>
      <AppInput
        value={content}
        onChangeText={setContent}
        placeholder={t('social.composerPlaceholder')}
        multiline
        numberOfLines={3}
        style={styles.textArea}
      />

      <AppInput
        value={link}
        onChangeText={setLink}
        placeholder={t('social.linkPlaceholder')}
        autoCapitalize="none"
        keyboardType="url"
      />
      {parsed ? (
        <View style={[styles.preview, { borderColor: NETWORK_BY_ID[parsed.network].color }]}>
          <Ionicons name="link-outline" size={14} color={NETWORK_BY_ID[parsed.network].color} />
          <AppText variant="small" style={{ color: NETWORK_BY_ID[parsed.network].color, flex: 1 }} numberOfLines={1}>
            {NETWORK_BY_ID[parsed.network].label}
          </AppText>
          <Pressable onPress={() => setLink('')}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}

      {media.length > 0 ? (
        <View style={styles.thumbRow}>
          {media.map((m, i) => (
            <View key={i} style={styles.thumb}>
              {m.type === 'image' ? (
                <Image source={{ uri: m.uri }} style={styles.thumbImg} />
              ) : (
                <View style={styles.thumbVid}>
                  <Ionicons name="videocam-outline" size={20} color={colors.textMuted} />
                </View>
              )}
              <Pressable style={styles.thumbX} onPress={() => setMedia((prev) => prev.filter((_, j) => j !== i))}>
                <Ionicons name="close-circle" size={18} color={colors.destructive} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.visibilityRow}>
        {visibilityOptions.map((v) => (
          <Chip
            key={v.key}
            label={v.label}
            active={visibility === v.key}
            onPress={() => setVisibility(v.key)}
          />
        ))}
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.iconAction} onPress={pickMedia}>
          <Ionicons name="image-outline" size={20} color={colors.textMuted} />
        </Pressable>
        {NETWORKS.length > 0 ? (
          <Pressable
            style={styles.iconAction}
            onPress={() => Linking.openURL('https://x.com')}>
            <Ionicons name="newspaper-outline" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }} />
        {onCancel ? (
          <AppButton title={t('common.cancel')} variant="ghost" onPress={onCancel} />
        ) : null}
        <AppButton title={t('social.publish')} onPress={publish} loading={busy} />
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: {
      backgroundColor: c.surface,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      gap: Spacing.sm,
    },
    textArea: { minHeight: 72, textAlignVertical: 'top' },
    preview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.sm,
      paddingVertical: 6,
    },
    thumbRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    thumb: { width: 72, height: 72, borderRadius: Radius.md, overflow: 'hidden' },
    thumbImg: { width: 72, height: 72 },
    thumbVid: {
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surfaceElevated,
    },
    thumbX: { position: 'absolute', top: 2, right: 2, backgroundColor: c.surface, borderRadius: 999 },
    visibilityRow: { flexDirection: 'row', gap: Spacing.sm },
    actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    iconAction: {
      width: 40,
      height: 40,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
