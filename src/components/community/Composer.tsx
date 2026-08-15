import { useState } from 'react';
import { Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { AppButton, AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { uploadCommunityImage } from '@/lib/community';

export function Composer({
  onSend,
  disabled,
  placeholder,
}: {
  onSend: (text: string, imageUrl?: string | null) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase();
    setImage({
      uri: asset.uri,
      name: `img-${Date.now()}.${ext}`,
      type: asset.mimeType || `image/${ext}`,
    });
  };

  const send = async () => {
    if (!user || sending || uploading || disabled) return;
    if (!text.trim() && !image) return;
    setSending(true);
    let imageUrl: string | null = null;
    if (image) {
      setUploading(true);
      imageUrl = await uploadCommunityImage(user.id, image.uri, image.type);
      setUploading(false);
    }
    await onSend(text.trim(), imageUrl);
    setText('');
    setImage(null);
    setSending(false);
  };

  return (
    <View style={styles.composer}>
      {image ? (
        <View style={styles.attachRow}>
          <Image source={{ uri: image.uri }} style={styles.thumb} />
          <Pressable onPress={() => setImage(null)} style={styles.remove}>
            <Ionicons name="close" size={14} color={Colors.text} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.row}>
        <Pressable onPress={pickImage} style={styles.iconBtn} disabled={uploading}>
          <Ionicons name="image-outline" size={22} color={Colors.textMuted} />
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder || t('workspace.composerPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          multiline
          style={styles.input}
        />
        <AppButton
          title={t('common.send')}
          onPress={send}
          loading={sending || uploading}
          disabled={(!text.trim() && !image) || disabled}
          style={styles.sendBtn}
        />
      </View>
      {uploading ? (
        <AppText variant="small" style={{ color: Colors.textMuted }}>
          {t('workspace.uploadingImage')}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { paddingTop: Spacing.sm, gap: Spacing.sm },
  attachRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  thumb: { width: 64, height: 64, borderRadius: Radius.sm },
  remove: {
    position: 'absolute',
    top: 4,
    left: 48,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  iconBtn: { paddingBottom: 10 },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.text,
    minHeight: 42,
    maxHeight: 100,
  },
  sendBtn: { paddingVertical: 10, paddingHorizontal: 18 },
});
