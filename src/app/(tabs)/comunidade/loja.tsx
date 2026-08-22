import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { useSubscription } from '@/hooks/useSubscription';
import { useStoreProducts, type StoreProduct } from '@/hooks/useStoreProducts';
import { Colors, Radius, Spacing } from '@/core/theme';

type Category = 'all' | 'bots' | 'mentorias' | 'ebooks';

const CATEGORIES = [
  { key: 'all' as Category, labelKey: 'store.categoryAll' as const, icon: 'grid-outline' as const },
  { key: 'bots' as Category, labelKey: 'store.categoryBots' as const, icon: 'hardware-chip-outline' as const },
  { key: 'mentorias' as Category, labelKey: 'store.categoryMentorias' as const, icon: 'people-outline' as const },
  { key: 'ebooks' as Category, labelKey: 'store.categoryEbooks' as const, icon: 'book-outline' as const },
] as const;

export default function LojaScreen() {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const { products, refresh } = useStoreProducts();
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [refreshing, setRefreshing] = useState(false);

  const filteredItems =
    selectedCategory === 'all'
      ? products
      : products.filter((item) => item.category === selectedCategory);

  const featuredItem = products.find((item) => item.featured);
  const totalProducts = products.length;
  const freeCount = products.filter((i) => !i.isPremium).length;
  const avgRating =
    totalProducts > 0
      ? (Math.round((products.reduce((acc, i) => acc + (i.rating ?? 0), 0) / totalProducts) * 10) / 10).toFixed(1)
      : '0.0';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handlePress = (item: StoreProduct) => {
    if (item.isPremium && !isPremium) {
      Alert.alert(t('store.premiumRequired'), t('store.premiumMessage'), [
        { text: t('common.close') },
      ]);
      return;
    }
    Alert.alert(item.title, item.description, [
      { text: t('common.close') },
      { text: t('common.confirm') },
    ]);
  };

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Spacing.xl * 3 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        <View style={styles.container}>
          <View style={styles.heroBanner}>
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <View style={styles.heroIconRow}>
                <View style={styles.heroIcon}>
                  <Ionicons name="storefront" size={28} color={Colors.accent} />
                </View>
              </View>
              <AppText variant="title" style={styles.heroTitle}>{t('store.title')}</AppText>
              <AppText variant="body" style={styles.heroSubtitle}>{t('store.subtitle')}</AppText>
              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <AppText variant="h1" style={styles.heroStatValue}>{totalProducts}</AppText>
                  <AppText variant="small" style={styles.heroStatLabel}>Produtos</AppText>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <AppText variant="h1" style={styles.heroStatValue}>{freeCount}</AppText>
                  <AppText variant="small" style={styles.heroStatLabel}>Grátis</AppText>
                </View>
                <View style={styles.heroStatDivider} />
                <View style={styles.heroStat}>
                  <AppText variant="h1" style={styles.heroStatValue}>{avgRating}</AppText>
                  <AppText variant="small" style={styles.heroStatLabel}>Avaliação</AppText>
                </View>
              </View>
            </View>
          </View>

          {featuredItem && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="star" size={16} color={Colors.accent} />
                <AppText variant="label" style={styles.sectionTitle}>Destaques</AppText>
              </View>
              <Pressable onPress={() => handlePress(featuredItem)} style={styles.featuredCard}>
                <View style={[styles.featuredIconBg, { backgroundColor: `${featuredItem.color}20` }]}>
                  <Ionicons name={featuredItem.icon} size={32} color={featuredItem.color} />
                </View>
                <View style={styles.featuredInfo}>
                  <View style={styles.featuredTopRow}>
                    <AppText variant="h2" style={{ color: Colors.text }}>{featuredItem.title}</AppText>
                    {featuredItem.isPremium ? (
                      <View style={styles.featuredPremiumBadge}>
                        <Ionicons name="diamond" size={10} color={Colors.accent} />
                        <AppText variant="small" style={{ color: Colors.accent, fontWeight: '700' }}>PRO</AppText>
                      </View>
                    ) : (
                      <View style={styles.featuredFreeBadge}>
                        <AppText variant="small" style={{ color: Colors.primary, fontWeight: '700' }}>GRÁTIS</AppText>
                      </View>
                    )}
                  </View>
                  <AppText variant="small" style={{ color: Colors.textMuted, lineHeight: 18 }}>
                    {featuredItem.description}
                  </AppText>
                  <View style={styles.featuredBottomRow}>
                    <View style={styles.featuredRating}>
                      <Ionicons name="star" size={12} color={Colors.accent} />
                      <AppText variant="small" style={{ color: Colors.accent, fontWeight: '700' }}>{featuredItem.rating}</AppText>
                      <AppText variant="small" style={{ color: Colors.textFaint }}>({featuredItem.users})</AppText>
                    </View>
                    <AppText variant="h2" style={{ color: Colors.text }}>{featuredItem.price}</AppText>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textFaint} />
              </Pressable>
            </View>
          )}

          <View style={styles.section}>
            <View style={styles.categoryTabs}>
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat.key;
                const count = cat.key === 'all' ? products.length : products.filter((i) => i.category === cat.key).length;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => setSelectedCategory(cat.key)}
                    style={[
                      styles.categoryTab,
                      isActive
                        ? { backgroundColor: Colors.accent, borderColor: Colors.accent }
                        : { backgroundColor: Colors.surface, borderColor: Colors.border },
                    ]}
                  >
                    <Ionicons name={cat.icon} size={14} color={isActive ? '#1A1A2E' : Colors.textMuted} />
                    <AppText variant="small" style={{
                      color: isActive ? '#1A1A2E' : Colors.textMuted,
                      fontWeight: '600',
                    }}>
                      {t(cat.labelKey)}
                    </AppText>
                    <View style={[styles.categoryCount, isActive && styles.categoryCountActive]}>
                      <AppText variant="small" style={{ color: isActive ? '#1A1A2E' : Colors.textFaint, fontSize: 10 }}>
                        {count}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="label" style={styles.sectionTitle}>
                {selectedCategory === 'all' ? 'Todos os Produtos' : t(CATEGORIES.find((c) => c.key === selectedCategory)!.labelKey)}
              </AppText>
              <AppText variant="small" style={{ color: Colors.textFaint }}>{filteredItems.length} itens</AppText>
            </View>

            {filteredItems.length === 0 ? (
              <EmptyState title={t('store.empty')} />
            ) : (
              <View style={styles.productGrid}>
                {filteredItems.map((item) => (
                  <Pressable key={item.id} onPress={() => handlePress(item)} style={styles.productCard}>
                    <View style={styles.productCardTop}>
                      <View style={[styles.productIcon, { backgroundColor: `${item.color}18` }]}>
                        <Ionicons name={item.icon} size={24} color={item.color} />
                      </View>
                      {item.isPremium ? (
                        <View style={styles.productPremiumTag}>
                          <Ionicons name="diamond" size={9} color={Colors.accent} />
                        </View>
                      ) : null}
                    </View>

                    <AppText variant="label" numberOfLines={1} style={styles.productTitle}>
                      {item.title}
                    </AppText>
                    <AppText variant="small" numberOfLines={2} style={styles.productDesc}>
                      {item.description}
                    </AppText>

                    <View style={styles.productFooter}>
                      <View style={styles.productRating}>
                        <Ionicons name="star" size={11} color={Colors.accent} />
                        <AppText variant="small" style={{ color: Colors.accent, fontWeight: '600', fontSize: 11 }}>
                          {item.rating}
                        </AppText>
                      </View>
                      <AppText variant="label" style={styles.productPrice}>
                        {item.price}
                      </AppText>
                    </View>

                    <View style={styles.productCategoryTag}>
                      <AppText variant="small" style={{ color: Colors.textFaint, fontSize: 10, textTransform: 'uppercase' }}>
                        {item.category}
                      </AppText>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBanner: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(22,164,58,0.06)',
  },
  heroContent: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  heroIconRow: {
    marginBottom: Spacing.md,
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,159,10,0.2)',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  heroStatLabel: {
    color: Colors.textMuted,
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.border,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.text,
    flex: 1,
  },
  featuredCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  featuredIconBg: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredInfo: {
    flex: 1,
    gap: 4,
  },
  featuredTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featuredPremiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.accentDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredFreeBadge: {
    backgroundColor: Colors.primaryDim,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  featuredBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  featuredRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  categoryCount: {
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
  },
  categoryCountActive: {
    backgroundColor: 'rgba(26,26,46,0.3)',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  productCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  productCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productPremiumTag: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productTitle: {
    color: Colors.text,
  },
  productDesc: {
    color: Colors.textMuted,
    lineHeight: 17,
    minHeight: 34,
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  productRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  productPrice: {
    color: Colors.text,
    fontWeight: '700',
  },
  productCategoryTag: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
});
