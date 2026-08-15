import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText, Badge, Chip, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { supabase, isAdminEmail } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import * as adminApi from '@/lib/adminApi';
import { formatSymbol, formatTimeframe } from '@/core/format';
import type { BoomHour, BoomTime } from '@/core/types';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type Tab = 'dashboard' | 'signals' | 'boom' | 'boom_times' | 'posts' | 'users';

const TABS = [
  { key: 'dashboard' as const, labelKey: 'admin.tabDashboard' as const },
  { key: 'signals' as const, labelKey: 'admin.tabSignals' as const },
  { key: 'boom' as const, labelKey: 'admin.tabBoom' as const },
  { key: 'boom_times' as const, labelKey: 'admin.tabBoomTimes' as const },
  { key: 'posts' as const, labelKey: 'admin.tabPosts' as const },
  { key: 'users' as const, labelKey: 'admin.tabUsers' as const },
];

interface PostRow {
  id: string;
  title: string;
  content?: string;
  pair?: string;
  signal_type?: string;
  image_url?: string;
  is_active?: boolean;
  created_at: string;
}

export default function AdminScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, tp: 0, sl: 0, users: 0, premium: 0 });
  const [signals, setSignals] = useState<any[]>([]);
  const [boomHours, setBoomHours] = useState<BoomHour[]>([]);
  const [boomTimes, setBoomTimes] = useState<BoomTime[]>([]);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [users, setUsers] = useState<{ id: string; email: string; created_at: string; last_sign_in_at: string | null }[]>([]);

  const loadData = useCallback(async () => {
    const [sRes, usersRes, boomHoursRes, boomTimesRes, postsRes] = await Promise.all([
      supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(60),
      supabase.rpc('get_users_count'),
      supabase.from('boom_hours').select('*').order('time_wat', { ascending: true }),
      supabase.from('boom_times').select('*').order('boom_time', { ascending: false }).limit(20),
      supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50),
    ]);
    const s = sRes.data || [];
    setSignals(s);
    setBoomHours((boomHoursRes.data || []) as BoomHour[]);
    setBoomTimes((boomTimesRes.data || []) as BoomTime[]);
    setPosts((postsRes.data || []) as PostRow[]);
    const premium = await adminApi.premiumCount().catch(() => 0);
    setStats({
      total: s.length,
      active: s.filter((x: any) => x.status === 'active').length,
      tp: s.filter((x: any) => x.status === 'tp').length,
      sl: s.filter((x: any) => x.status === 'sl').length,
      users: usersRes.data || 0,
      premium,
    });
    adminApi.listUsers().then(setUsers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || !isAdminEmail(user.email)) return;
    const timer = setTimeout(() => {
      loadData().finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timer);
  }, [user, loadData]);

  if (!user) return <Spinner label={t('admin.checkingAccess')} />;
  if (!isAdminEmail(user.email)) {
    return (
      <Screen>
        <View style={styles.restricted}>
          <Ionicons name="lock-closed" size={44} color={Colors.textMuted} />
          <AppText variant="h1" style={{ textAlign: 'center' }}>{t('admin.restrictedTitle')}</AppText>
          <AppText variant="muted" style={{ textAlign: 'center' }}>
            {t('admin.restrictedDesc')}
          </AppText>
        </View>
      </Screen>
    );
  }
  if (loading) return <Spinner label={t('admin.loadingAdmin')} />;

  const run = async (label: string, fn: () => Promise<number>) => {
    setBusy(true);
    try {
      const n = await fn();
      Alert.alert(t('admin.doneTitle'), `${label}: ${n}`);
      await loadData();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.genericError'));
    } finally {
      setBusy(false);
    }
  };

  const confirmAndRun = (message: string, label: string, fn: () => Promise<number>) => {
    Alert.alert(t('admin.confirmTitle'), message, [
      { text: t('admin.cancel'), style: 'cancel' },
      { text: 'OK', onPress: () => run(label, fn) },
    ]);
  };

  return (
    <Screen>
      <SectionTitle
        right={
          <Pressable onPress={() => loadData()} hitSlop={8}>
            <Ionicons name="refresh" size={18} color={Colors.primary} />
          </Pressable>
        }>
        {t('admin.title')}
      </SectionTitle>

      <View style={styles.tabs}>
        {TABS.map((tb) => (
          <Chip key={tb.key} label={t(tb.labelKey)} active={tab === tb.key} onPress={() => setTab(tb.key)} />
        ))}
      </View>

      {tab === 'dashboard' ? (
        <DashboardPanel stats={stats} busy={busy} run={run} confirmAndRun={confirmAndRun} t={t} />
      ) : tab === 'signals' ? (
        <SignalsPanel signals={signals} onRefresh={loadData} />
      ) : tab === 'boom' ? (
        <BoomHoursPanel hours={boomHours} onRefresh={loadData} />
      ) : tab === 'boom_times' ? (
        <BoomTimesPanel times={boomTimes} onRefresh={loadData} />
      ) : tab === 'posts' ? (
        <PostsPanel posts={posts} onRefresh={loadData} />
      ) : (
        <UsersPanel users={users} premium={stats.premium} />
      )}
    </Screen>
  );
}

// ---------- Dashboard ----------

function DashboardPanel({
  stats,
  busy,
  run,
  confirmAndRun,
  t,
}: {
  stats: { total: number; active: number; tp: number; sl: number; users: number; premium: number };
  busy: boolean;
  run: (label: string, fn: () => Promise<number>) => void;
  confirmAndRun: (message: string, label: string, fn: () => Promise<number>) => void;
  t: TFunction;
}) {
  const hitRate = stats.tp + stats.sl > 0 ? Math.round((stats.tp / (stats.tp + stats.sl)) * 100) : 0;
  const cards = [
    { label: t('admin.statUsers'), value: stats.users.toLocaleString('pt-PT'), color: Colors.secondary, icon: 'people' as const },
    { label: t('admin.statSignalsToday'), value: stats.total, color: Colors.success, icon: 'trending-up' as const },
    { label: t('admin.statWinRate'), value: `${hitRate}%`, color: Colors.accent, icon: 'analytics' as const },
    { label: t('admin.statPremium'), value: stats.premium, color: Colors.accent, icon: 'diamond' as const },
  ];

  return (
    <View>
      <View style={styles.grid}>
        {cards.map((c) => (
          <View key={c.label} style={styles.statCard}>
            <Ionicons name={c.icon} size={20} color={c.color} />
            <AppText variant="h1" style={{ color: Colors.text }}>{c.value}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>{c.label}</AppText>
          </View>
        ))}
      </View>

      <View style={styles.actionRow}>
        <AppButton title={t('admin.generateSignals')} variant="secondary" loading={busy} style={{ flex: 1 }} onPress={() => run(t('admin.doneGenerate'), adminApi.generateSignals)} />
        <AppButton title={t('admin.closeTpSl')} variant="secondary" loading={busy} style={{ flex: 1 }} onPress={() => run(t('admin.doneClose'), adminApi.closeSignals)} />
      </View>
      <AppButton
        title={t('admin.clearRegenerate')}
        variant="danger"
        loading={busy}
        onPress={() =>
          confirmAndRun(t('admin.confirmClearRegenerate'), t('admin.doneRegenerate'), async () => {
            await adminApi.deleteAllActiveSignals();
            return adminApi.generateSignals();
          })
        }
      />
    </View>
  );
}

// ---------- Sinais ----------

function SignalsPanel({ signals, onRefresh }: { signals: any[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [symbol, setSymbol] = useState('EURUSD');
  const [signalType, setSignalType] = useState('BUY');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [confidence, setConfidence] = useState('75');
  const [reason, setReason] = useState('');

  const add = async () => {
    try {
      await adminApi.addSignal({
        symbol,
        timeframe: '1h',
        signal_type: signalType,
        entry_price: Number(entry),
        stop_loss: Number(sl),
        target_price: Number(tp),
        confidence: Number(confidence),
        reasons: reason.split('\n').map((r) => r.trim()).filter(Boolean),
      });
      setEntry(''); setSl(''); setTp(''); setReason('');
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addSignalError'));
    }
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>{t('admin.newSignal')}</AppText>
      <AppInput label={t('admin.pairLabel')} value={symbol} onChangeText={setSymbol} autoCapitalize="characters" />
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}><AppInput label={t('admin.typeLabel')} value={signalType} onChangeText={setSignalType} autoCapitalize="characters" /></View>
        <View style={{ flex: 1 }}><AppInput label={t('admin.confidenceLabel')} value={confidence} onChangeText={setConfidence} keyboardType="numeric" /></View>
      </View>
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}><AppInput label={t('admin.entryLabel')} value={entry} onChangeText={setEntry} keyboardType="numeric" /></View>
        <View style={{ flex: 1 }}><AppInput label={t('admin.slLabel')} value={sl} onChangeText={setSl} keyboardType="numeric" /></View>
        <View style={{ flex: 1 }}><AppInput label={t('admin.tpLabel')} value={tp} onChangeText={setTp} keyboardType="numeric" /></View>
      </View>
      <AppInput label={t('admin.reasonsLabel')} value={reason} onChangeText={setReason} multiline numberOfLines={3} />
      <AppButton title={t('admin.addSignal')} onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>{t('admin.signalsList', { count: signals.length })}</AppText>
      {signals.length === 0 ? <EmptyState title={t('admin.noSignalsAdmin')} /> : signals.map((s) => (
        <View key={s.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{formatSymbol(s.symbol)} · {formatTimeframe(s.timeframe)}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>{s.signal_type} · {s.confidence}% · E{s.entry_price}</AppText>
          </View>
          <Badge color={s.status === 'active' ? Colors.success : s.status === 'tp' ? Colors.success : s.status === 'sl' ? Colors.destructive : Colors.textMuted}>
            {s.status}
          </Badge>
          <Pressable onPress={() => adminApi.updateSignalStatus(s.id, s.status === 'tp' ? 'active' : 'tp').then(onRefresh)} hitSlop={8}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          </Pressable>
          <Pressable onPress={() => adminApi.updateSignalStatus(s.id, s.status === 'sl' ? 'active' : 'sl').then(onRefresh)} hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={Colors.destructive} />
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deleteSignalTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deleteSignal(s.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ---------- Hora do Boom ----------

function BoomHoursPanel({ hours, onRefresh }: { hours: BoomHour[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [timeWat, setTimeWat] = useState('');
  const [timeGmt, setTimeGmt] = useState('');
  const [pairs, setPairs] = useState('');
  const [vol, setVol] = useState('3');
  const [badge, setBadge] = useState('⚡');

  const add = async () => {
    try {
      await adminApi.addBoomHour({
        title,
        time_wat: timeWat,
        time_gmt: timeGmt,
        pairs: pairs.split(',').map((p) => p.trim()).filter(Boolean),
        days: '',
        description: '',
        volatility: Number(vol) || 1,
        badge,
      });
      setTitle(''); setTimeWat(''); setTimeGmt(''); setPairs(''); setBadge('⚡');
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addHourError'));
    }
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>{t('admin.newHour')}</AppText>
      <AppInput label={t('admin.titleLabel')} value={title} onChangeText={setTitle} placeholder={t('admin.titlePlaceholder')} />
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}><AppInput label={t('admin.watLabel')} value={timeWat} onChangeText={setTimeWat} placeholder="09:00" /></View>
        <View style={{ flex: 1 }}><AppInput label={t('admin.gmtLabel')} value={timeGmt} onChangeText={setTimeGmt} placeholder="08:00" /></View>
        <View style={{ flex: 1 }}><AppInput label={t('admin.volLabel')} value={vol} onChangeText={setVol} keyboardType="numeric" /></View>
      </View>
      <AppInput label={t('admin.pairsLabel')} value={pairs} onChangeText={setPairs} placeholder={t('admin.pairsPlaceholder')} />
      <AppButton title={t('admin.addHour')} onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>{t('admin.hoursList', { count: hours.length })}</AppText>
      {hours.length === 0 ? <EmptyState title={t('admin.noHours')} /> : hours.map((h) => (
        <View key={h.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{h.title}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              {h.time_wat} WAT · {h.pairs.join(', ')}
            </AppText>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deleteHourTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deleteBoomHour(h.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ---------- Boom Times ----------

function BoomTimesPanel({ times, onRefresh }: { times: BoomTime[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [pair, setPair] = useState('EURUSD');
  const [confidence, setConfidence] = useState('75');
  const [inMinutes, setInMinutes] = useState('120');

  const add = async () => {
    const boomTime = new Date(Date.now() + Number(inMinutes || 120) * 60_000).toISOString();
    try {
      await adminApi.addBoomTime({
        pair,
        boom_time: boomTime,
        confidence: Number(confidence),
        result: '',
        image_url: '',
        audio_url: '',
      });
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addBoomTimeError'));
    }
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>{t('admin.newBoomTime')}</AppText>
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}><AppInput label={t('admin.pairLabel')} value={pair} onChangeText={setPair} autoCapitalize="characters" /></View>
        <View style={{ flex: 1 }}><AppInput label={t('admin.confidenceLabel')} value={confidence} onChangeText={setConfidence} keyboardType="numeric" /></View>
      </View>
      <AppInput label={t('admin.inMinutesLabel')} value={inMinutes} onChangeText={setInMinutes} keyboardType="numeric" />
      <AppButton title={t('admin.addBoomTime')} onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>{t('admin.boomTimesList', { count: times.length })}</AppText>
      {times.length === 0 ? <EmptyState title={t('admin.noBoomTimes')} /> : times.map((b) => (
        <View key={b.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{formatSymbol(b.pair)}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              {new Date(b.boom_time).toLocaleString()} · {b.confidence}%
            </AppText>
          </View>
          <Pressable onPress={() => adminApi.updateBoomResult(b.id, b.result === 'BUY' ? 'SELL' : 'BUY').then(onRefresh)} hitSlop={8}>
            <Badge color={b.result === 'BUY' ? Colors.success : b.result === 'SELL' ? Colors.destructive : Colors.textMuted}>
              {b.result || '?'}
            </Badge>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deleteBoomTimeTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deleteBoomTime(b.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ---------- Posts ----------

function PostsPanel({ posts, onRefresh }: { posts: PostRow[]; onRefresh: () => void }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pair, setPair] = useState('');
  const [signalType, setSignalType] = useState('NEUTRO');

  const add = async () => {
    if (!title.trim()) {
      Alert.alert(t('admin.titleRequired'), t('admin.titleRequiredMsg'));
      return;
    }
    try {
      await adminApi.addPost({
        title: title.trim(),
        content: content.trim(),
        pair: pair.trim().toUpperCase(),
        signal_type: signalType.toUpperCase(),
      });
      setTitle(''); setContent(''); setPair(''); setSignalType('NEUTRO');
      onRefresh();
    } catch (e: any) {
      Alert.alert(t('admin.errorTitle'), e?.message || t('admin.addPostError'));
    }
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>{t('admin.newPost')}</AppText>
      <AppInput label={t('admin.titleLabel')} value={title} onChangeText={setTitle} placeholder={t('admin.postTitlePlaceholder')} />
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}><AppInput label={t('admin.pairLabel')} value={pair} onChangeText={setPair} autoCapitalize="characters" placeholder="EURUSD" /></View>
        <View style={{ flex: 1 }}><AppInput label={t('admin.typeLabel')} value={signalType} onChangeText={setSignalType} autoCapitalize="characters" /></View>
      </View>
      <AppInput label={t('admin.contentLabel')} value={content} onChangeText={setContent} multiline numberOfLines={3} placeholder={t('admin.contentPlaceholder')} />
      <AppButton title={t('admin.publishPost')} onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>{t('admin.postsList', { count: posts.length })}</AppText>
      {posts.length === 0 ? <EmptyState title={t('admin.noPosts')} /> : posts.map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{p.title}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              {p.pair ? `${p.pair} · ` : ''}{new Date(p.created_at).toLocaleString()}
            </AppText>
          </View>
          <Badge color={p.is_active === false ? Colors.textMuted : Colors.success}>
            {p.is_active === false ? t('admin.postInactive') : t('admin.postActive')}
          </Badge>
          <Pressable
            onPress={() =>
              Alert.alert(t('admin.deletePostTitle'), t('admin.deleteConfirm'), [
                { text: t('admin.cancel'), style: 'cancel' },
                { text: t('admin.delete'), style: 'destructive', onPress: () => adminApi.deletePost(p.id).then(onRefresh) },
              ])
            }
            hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

// ---------- Usuários ----------

function UsersPanel({
  users,
  premium,
}: {
  users: { id: string; email: string; created_at: string; last_sign_in_at: string | null }[];
  premium: number;
}) {
  const { t } = useTranslation();
  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>
        {t('admin.usersList', { count: users.length, premium })}
      </AppText>
      {users.length === 0 ? (
        <EmptyState title={t('admin.noUsersTitle')} subtitle={t('admin.noUsersDesc')} />
      ) : (
        users.map((u) => (
          <View key={u.id} style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{u.email}</AppText>
              <AppText variant="small" style={{ color: Colors.textMuted }}>
                {t('admin.registeredAt', { date: new Date(u.created_at).toLocaleDateString('pt-PT') })}
              </AppText>
            </View>
            <Badge color={Colors.accent}>{t('admin.userRole')}</Badge>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  statCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    gap: 2,
  },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginVertical: Spacing.md },
  inlineRow: { flexDirection: 'row', gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
});
