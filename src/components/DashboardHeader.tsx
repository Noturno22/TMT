import { useState } from 'react';
import { Image, Pressable, StyleSheet, View, Modal, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { AppText, Badge } from '@/components/ui';
import { avatarLetter, displayName } from '@/core/format';
import { Colors, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { analyzeImage } from '@/lib/aiSupport';

export function DashboardHeader({ isPremium }: { isPremium: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const firstName = (displayName(user) || t('common.trader')).split(' ')[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t('components.dashboardHeader.morning')
      : hour < 20
        ? t('components.dashboardHeader.afternoon')
        : t('components.dashboardHeader.evening');

  const idData = (user?.identities?.[0]?.identity_data ?? {}) as { avatar_url?: string };
  const meta = (user?.user_metadata ?? {}) as { avatar_url?: string; picture?: string };
  const avatarUrl = idData.avatar_url ?? meta.avatar_url ?? meta.picture;

  const [showAnalysis, setShowAnalysis] = useState(false);
  const [analysisImage, setAnalysisImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.permission'), t('components.dashboardHeader.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setAnalysisImage(asset.uri);
    setAnalysisResult(null);
    setShowAnalysis(true);

    try {
      setAnalyzing(true);
      const file = new File(asset.uri);
      const base64 = await file.base64();
      const mimeType = asset.mimeType || 'image/jpeg';

      const res = await analyzeImage(base64, mimeType);
      if (res.error) {
        Alert.alert('Erro', res.error);
        setShowAnalysis(false);
      } else {
        setAnalysisResult(res.reply);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível analisar a imagem.');
      setShowAnalysis(false);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <View style={styles.row}>
        <View style={styles.userWrap}>
          <View style={styles.avatar}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <AppText style={styles.avatarText}>{avatarLetter(user)}</AppText>
            )}
          </View>
          <View style={styles.textWrap}>
            <AppText variant="small" style={styles.greeting}>
              {greeting}{user ? `, ${firstName}` : ''}
            </AppText>
            <AppText variant="h2">{t('components.dashboardHeader.appName')}</AppText>
          </View>
        </View>
        <View style={styles.right}>
          {isPremium ? (
            <Badge color={Colors.accent} bg={`${Colors.accent}1F`}>{t('components.dashboardHeader.pro')}</Badge>
          ) : null}
          <Pressable hitSlop={8} onPress={pickImage} accessibilityLabel={t('components.dashboardHeader.scanSetup')}>
            <Ionicons name="scan-outline" size={22} color={Colors.text} />
          </Pressable>
          <Pressable hitSlop={8} onPress={() => router.push('/notificacoes')}>
            <Ionicons name="notifications" size={20} color={Colors.text} />
          </Pressable>
        </View>
      </View>

      <Modal visible={showAnalysis} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <AppText variant="h2">{t('components.dashboardHeader.setupAnalysis')}</AppText>
            <Pressable onPress={() => { setShowAnalysis(false); setAnalysisImage(null); setAnalysisResult(null); }}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalContent}>
            {analysisImage && (
              <Image source={{ uri: analysisImage }} style={styles.previewImage} resizeMode="contain" />
            )}

            {analyzing ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <AppText variant="body" style={{ color: Colors.textMuted, marginTop: Spacing.md }}>
                  {t('components.dashboardHeader.analyzing')}
                </AppText>
              </View>
            ) : analysisResult ? (
              <AppText variant="body" style={styles.resultText}>
                {analysisResult}
              </AppText>
            ) : null}
          </ScrollView>

          {!analyzing && !analysisResult && (
            <View style={styles.modalFooter}>
              <Pressable style={styles.retryBtn} onPress={pickImage}>
                <Ionicons name="camera" size={20} color={Colors.primary} />
                <AppText variant="body" style={{ color: Colors.primary }}>{t('components.dashboardHeader.chooseAnother')}</AppText>
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  userWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryDim,
    borderColor: Colors.primary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: Colors.text, fontWeight: '800', fontSize: 16 },
  avatarImg: { width: '100%', height: '100%', borderRadius: 19 },
  textWrap: { gap: 1 },
  greeting: { color: Colors.textMuted },
  right: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  modalContainer: { flex: 1, backgroundColor: Colors.bg },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  modalBody: { flex: 1 },
  modalContent: { padding: Spacing.md },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    marginBottom: Spacing.md,
  },
  loadingWrap: { alignItems: 'center', paddingVertical: Spacing.xl },
  resultText: { lineHeight: 24 },
  modalFooter: {
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
});
