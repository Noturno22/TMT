import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText, Badge } from '@/components/ui';
import { avatarLetter, displayName } from '@/core/format';
import { Colors, Radius, Spacing } from '@/core/theme';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadUserNotifications } from '@/hooks/useUnreadUserNotifications';
import { analyzeImage } from '@/lib/aiSupport';
import { prepareImageForAnalysis } from '@/lib/imageResize';

const AI_COLORS: [string, string] = [Colors.primary, 'rgba(22,164,58,0.55)'];
const PREVIEW_HEIGHT = 220;

export function DashboardHeader({ isPremium }: { isPremium: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { unread } = useUnreadUserNotifications();
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
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisRemaining, setAnalysisRemaining] = useState<number | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [scanAnim] = useState(() => new Animated.Value(0));
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!analyzing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [analyzing, scanAnim]);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const resetAnalysis = () => {
    setAnalysisImage(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAnalyzing(false);
    setCopied(false);
  };

  const pickImage = async () => {
    if (analyzing) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.permission'), t('components.dashboardHeader.cameraPermission'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
      base64: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setAnalysisImage(asset.uri);
    setAnalysisResult(null);
    setAnalysisError(null);
    setAnalysisRemaining(null);
    setShowAnalysis(true);

    try {
      setAnalyzing(true);
      // Redimensiona/comprime quando o módulo nativo existe; fallback lê o
      // ficheiro original em builds antigas.
      const prepared = await prepareImageForAnalysis(asset.uri, asset.mimeType || 'image/jpeg');
      setAnalysisImage(prepared.uri);

      const res = await analyzeImage(prepared.base64, prepared.mimeType);
      if (res.error) {
        setAnalysisError(res.error);
        setAnalysisRemaining(null);
      } else {
        setAnalysisResult(res.reply);
        setAnalysisRemaining(res.remainingImage ?? null);
      }
    } catch (err: any) {
      setAnalysisError(err?.message || 'Não foi possível analisar a imagem.');
    } finally {
      setAnalyzing(false);
    }
  };

  const copyResult = async () => {
    if (!analysisResult) return;
    await Clipboard.setStringAsync(analysisResult);
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
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
            {unread > 0 ? <View style={styles.bellDot} /> : null}
          </Pressable>
        </View>
      </View>

      <Modal visible={showAnalysis} animationType="slide" presentationStyle="pageSheet">
        <LinearGradient colors={['#07070F', '#0A0A14', '#05050D']} style={styles.modalBg}>
          <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
            <View style={styles.modalHeader}>
              <LinearGradient colors={AI_COLORS} style={styles.headerLogo}>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.flex1}>
                <AppText variant="h2">{t('components.dashboardHeader.setupAnalysis')}</AppText>
                <AppText variant="small" style={styles.subtitle}>
                  {t('components.dashboardHeader.subtitle')}
                </AppText>
              </View>
              <Pressable
                onPress={() => {
                  setShowAnalysis(false);
                  resetAnalysis();
                }}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}>
              {analysisImage && (
                <View style={[styles.previewCard, analyzing && styles.previewScanning]}>
                  <Image
                    source={{ uri: analysisImage }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />
                  {analyzing && (
                    <>
                      <View style={styles.scanDim} pointerEvents="none" />
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          styles.scanLine,
                          {
                            transform: [
                              {
                                translateY: scanAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0, PREVIEW_HEIGHT],
                                }),
                              },
                            ],
                          },
                        ]}
                      />
                      <View style={styles.scanningBadge} pointerEvents="none">
                        <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                        <Text style={styles.scanningBadgeText}>IA</Text>
                      </View>
                    </>
                  )}
                </View>
              )}

              {analyzing && (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <AppText variant="body" style={styles.analyzingTitle}>
                    {t('components.dashboardHeader.analyzing')}
                  </AppText>
                  <AppText variant="small" style={styles.analyzingSub}>
                    {t('components.dashboardHeader.subtitle')}
                  </AppText>
                </View>
              )}

              {!analyzing && analysisResult && (
                <View style={styles.resultCard}>
                  <RichText text={analysisResult} />
                  {analysisRemaining !== null && (
                    <AppText variant="small" style={{ color: Colors.textFaint, marginTop: Spacing.sm }}>
                      {t('suporteIa.remainingImage', { count: analysisRemaining })}
                    </AppText>
                  )}
                </View>
              )}

              {!analyzing && analysisError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={Colors.destructive} />
                  <AppText variant="small" style={styles.errorText}>
                    {analysisError}
                  </AppText>
                </View>
              )}
            </ScrollView>

            <View style={styles.disclaimerRow}>
              <Ionicons name="shield-checkmark-outline" size={13} color={Colors.textFaint} />
              <AppText variant="small" style={styles.disclaimerText}>
                {t('components.dashboardHeader.disclaimer')}
              </AppText>
            </View>

            {!analyzing && analysisImage && (
              <View style={styles.footerRow}>
                <Pressable style={({ pressed }) => [styles.outlineBtn, pressed && { opacity: 0.7 }]} onPress={pickImage}>
                  <Ionicons name="images-outline" size={17} color={Colors.text} />
                  <AppText variant="small" style={styles.outlineBtnText}>
                    {t('components.dashboardHeader.chooseAnother')}
                  </AppText>
                </Pressable>
                {analysisResult && (
                  <Pressable
                    style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                    onPress={copyResult}>
                    <Ionicons
                      name={copied ? 'checkmark' : 'copy-outline'}
                      size={16}
                      color={copied ? Colors.success : '#FFFFFF'}
                    />
                    <AppText variant="small" style={[styles.primaryBtnText, copied && { color: Colors.success }]}>
                      {copied
                        ? t('components.dashboardHeader.copied')
                        : t('components.dashboardHeader.copyResult')}
                    </AppText>
                  </Pressable>
                )}
              </View>
            )}
          </SafeAreaView>
        </LinearGradient>
      </Modal>
    </>
  );
}

// ---------- Rich text (markdown-lite: **bold**, "- " bullets) ----------

function renderInline(text: string) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') ? (
        <Text key={i} style={styles.boldInline}>
          {part.slice(2, -2)}
        </Text>
      ) : (
        <Text key={i}>{part}</Text>
      ),
    );
}

function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <View style={styles.resultWrap}>
      {lines.map((rawLine, i) => {
        const line = rawLine.trim();
        if (!line) return <View key={i} style={styles.gapSm} />;
        if (/^[-•]\s/.test(line)) {
          return (
            <View key={i} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <AppText variant="body" style={styles.resultText}>
                {renderInline(line.replace(/^[-•]\s/, ''))}
              </AppText>
            </View>
          );
        }
        return (
          <AppText key={i} variant="body" style={styles.resultText}>
            {renderInline(line)}
          </AppText>
        );
      })}
    </View>
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
  bellDot: {
    position: 'absolute',
    top: -2,
    right: -3,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.destructive,
    borderWidth: 1.5,
    borderColor: Colors.bg,
  },

  // Modal
  modalBg: { flex: 1 },
  flex: { flex: 1 },
  flex1: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomColor: Colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { color: Colors.textMuted, marginTop: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },

  previewCard: {
    height: PREVIEW_HEIGHT,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(22,164,58,0.35)',
    backgroundColor: Colors.surfaceElevated,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  previewScanning: { borderColor: Colors.primary },
  previewImage: { width: '100%', height: '100%' },
  scanDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: Colors.live,
    shadowColor: Colors.live,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  scanningBadge: {
    position: 'absolute',
    right: Spacing.sm,
    top: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(7,7,15,0.75)',
    borderColor: 'rgba(22,164,58,0.5)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  scanningBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  loadingWrap: { alignItems: 'center', paddingVertical: Spacing.lg, gap: Spacing.xs },
  analyzingTitle: { color: Colors.text, fontWeight: '600', marginTop: Spacing.xs },
  analyzingSub: { color: Colors.textMuted, textAlign: 'center' },

  resultCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  resultWrap: { gap: Spacing.xs },
  gapSm: { height: Spacing.xs },
  bulletRow: { flexDirection: 'row', gap: Spacing.sm, paddingRight: Spacing.xs },
  bulletDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 8,
  },
  resultText: { lineHeight: 21, flex: 1 },
  boldInline: { color: Colors.text, fontWeight: '700' },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(239,68,68,0.10)',
    borderColor: 'rgba(239,68,68,0.35)',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  errorText: { color: Colors.destructive, flex: 1 },

  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
  },
  disclaimerText: { color: Colors.textFaint, flex: 1 },

  footerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 46,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  outlineBtnText: { color: Colors.text, fontWeight: '600' },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    minHeight: 46,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700' },
});
