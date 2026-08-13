import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText, Badge, Chip, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { supabase, isAdminEmail } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import * as adminApi from '@/lib/adminApi';
import { formatSymbol, formatTimeframe } from '@/core/format';
import type { BoomHour, BoomTime } from '@/core/types';

type Tab = 'dashboard' | 'signals' | 'boom' | 'boom_times' | 'posts' | 'users';

const TABS: { key: Tab; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'signals', label: 'Sinais' },
  { key: 'boom', label: 'Boom Hours' },
  { key: 'boom_times', label: 'Boom Times' },
  { key: 'posts', label: 'Posts' },
  { key: 'users', label: 'Usuários' },
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
  const router = useRouter();
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
    if (user && !isAdminEmail(user.email)) {
      router.replace('/(tabs)/analises');
      return;
    }
    if (user) {
      const timer = setTimeout(() => {
        loadData().finally(() => setLoading(false));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [user, loadData, router]);

  if (!user) return <Spinner label="A verificar acesso…" />;
  if (!isAdminEmail(user.email)) return null;
  if (loading) return <Spinner label="A carregar admin…" />;

  const run = async (label: string, fn: () => Promise<number>) => {
    setBusy(true);
    try {
      const n = await fn();
      Alert.alert('Concluído', `${label}: ${n}`);
      await loadData();
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Ocorreu um erro.');
    } finally {
      setBusy(false);
    }
  };

  const confirmAndRun = (message: string, label: string, fn: () => Promise<number>) => {
    Alert.alert('Confirmação', message, [
      { text: 'Cancelar', style: 'cancel' },
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
        Painel Admin
      </SectionTitle>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Chip key={t.key} label={t.label} active={tab === t.key} onPress={() => setTab(t.key)} />
        ))}
      </View>

      {tab === 'dashboard' ? (
        <DashboardPanel stats={stats} busy={busy} run={run} confirmAndRun={confirmAndRun} />
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
}: {
  stats: { total: number; active: number; tp: number; sl: number; users: number; premium: number };
  busy: boolean;
  run: (label: string, fn: () => Promise<number>) => void;
  confirmAndRun: (message: string, label: string, fn: () => Promise<number>) => void;
}) {
  const hitRate = stats.tp + stats.sl > 0 ? Math.round((stats.tp / (stats.tp + stats.sl)) * 100) : 0;
  const cards = [
    { label: 'Usuários', value: stats.users.toLocaleString('pt-PT'), color: Colors.secondary, icon: 'people' as const },
    { label: 'Sinais Hoje', value: stats.total, color: Colors.success, icon: 'trending-up' as const },
    { label: 'Taxa de Acerto', value: `${hitRate}%`, color: Colors.accent, icon: 'analytics' as const },
    { label: 'Premium', value: stats.premium, color: Colors.accent, icon: 'diamond' as const },
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
        <AppButton title="Gerar Sinais" variant="secondary" loading={busy} style={{ flex: 1 }} onPress={() => run('Sinais gerados', adminApi.generateSignals)} />
        <AppButton title="Fechar TP/SL" variant="secondary" loading={busy} style={{ flex: 1 }} onPress={() => run('Sinais fechados', adminApi.closeSignals)} />
      </View>
      <AppButton
        title="Limpar e Regenerar"
        variant="danger"
        loading={busy}
        onPress={() =>
          confirmAndRun('Apagar todos os sinais ativos e gerar novos?', 'Sinais regenerados', async () => {
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
      Alert.alert('Erro', e?.message || 'Erro ao adicionar sinal.');
    }
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>NOVO SINAL</AppText>
      <AppInput label="PAR (EURUSD, GBPUSD…)" value={symbol} onChangeText={setSymbol} autoCapitalize="characters" />
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}><AppInput label="TIPO" value={signalType} onChangeText={setSignalType} autoCapitalize="characters" /></View>
        <View style={{ flex: 1 }}><AppInput label="CONFIANÇA %" value={confidence} onChangeText={setConfidence} keyboardType="numeric" /></View>
      </View>
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}><AppInput label="ENTRADA" value={entry} onChangeText={setEntry} keyboardType="numeric" /></View>
        <View style={{ flex: 1 }}><AppInput label="SL" value={sl} onChangeText={setSl} keyboardType="numeric" /></View>
        <View style={{ flex: 1 }}><AppInput label="TP" value={tp} onChangeText={setTp} keyboardType="numeric" /></View>
      </View>
      <AppInput label="RAZÕES (uma por linha)" value={reason} onChangeText={setReason} multiline numberOfLines={3} />
      <AppButton title="Adicionar Sinal" onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>SINAIS ({signals.length})</AppText>
      {signals.length === 0 ? <EmptyState title="Sem sinais" /> : signals.map((s) => (
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
              Alert.alert('Apagar sinal', 'Confirmas a eliminação?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Apagar', style: 'destructive', onPress: () => adminApi.deleteSignal(s.id).then(onRefresh) },
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
      Alert.alert('Erro', e?.message || 'Erro ao adicionar horário.');
    }
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>NOVO HORÁRIO</AppText>
      <AppInput label="TÍTULO" value={title} onChangeText={setTitle} placeholder="Boom de Londres" />
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}><AppInput label="WAT" value={timeWat} onChangeText={setTimeWat} placeholder="09:00" /></View>
        <View style={{ flex: 1 }}><AppInput label="GMT" value={timeGmt} onChangeText={setTimeGmt} placeholder="08:00" /></View>
        <View style={{ flex: 1 }}><AppInput label="VOL" value={vol} onChangeText={setVol} keyboardType="numeric" /></View>
      </View>
      <AppInput label="PARES (separados por vírgula)" value={pairs} onChangeText={setPairs} placeholder="EURUSD, GBPUSD" />
      <AppButton title="Adicionar Horário" onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>HORÁRIOS ({hours.length})</AppText>
      {hours.length === 0 ? <EmptyState title="Sem horários" /> : hours.map((h) => (
        <View key={h.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{h.title}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              {h.time_wat} WAT · {h.pairs.join(', ')}
            </AppText>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert('Apagar horário', 'Confirmas a eliminação?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Apagar', style: 'destructive', onPress: () => adminApi.deleteBoomHour(h.id).then(onRefresh) },
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
      Alert.alert('Erro', e?.message || 'Erro ao adicionar boom time.');
    }
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>NOVO BOOM TIME</AppText>
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}><AppInput label="PAR" value={pair} onChangeText={setPair} autoCapitalize="characters" /></View>
        <View style={{ flex: 1 }}><AppInput label="CONFIANÇA %" value={confidence} onChangeText={setConfidence} keyboardType="numeric" /></View>
      </View>
      <AppInput label="DAQUI A (MIN)" value={inMinutes} onChangeText={setInMinutes} keyboardType="numeric" />
      <AppButton title="Adicionar Boom Time" onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>BOOM TIMES ({times.length})</AppText>
      {times.length === 0 ? <EmptyState title="Sem boom times" /> : times.map((b) => (
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
              Alert.alert('Apagar boom time', 'Confirmas a eliminação?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Apagar', style: 'destructive', onPress: () => adminApi.deleteBoomTime(b.id).then(onRefresh) },
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
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pair, setPair] = useState('');
  const [signalType, setSignalType] = useState('NEUTRO');

  const add = async () => {
    if (!title.trim()) {
      Alert.alert('Título obrigatório', 'Escreve um título para o post.');
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
      Alert.alert('Erro', e?.message || 'Erro ao criar post.');
    }
  };

  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>NOVO POST</AppText>
      <AppInput label="TÍTULO" value={title} onChangeText={setTitle} placeholder="Análise do GBP/USD" />
      <View style={styles.inlineRow}>
        <View style={{ flex: 1 }}><AppInput label="PAR" value={pair} onChangeText={setPair} autoCapitalize="characters" placeholder="EURUSD" /></View>
        <View style={{ flex: 1 }}><AppInput label="TIPO" value={signalType} onChangeText={setSignalType} autoCapitalize="characters" /></View>
      </View>
      <AppInput label="CONTEÚDO" value={content} onChangeText={setContent} multiline numberOfLines={3} placeholder="Texto da análise…" />
      <AppButton title="Publicar Post" onPress={add} />

      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.md }}>POSTS ({posts.length})</AppText>
      {posts.length === 0 ? <EmptyState title="Sem posts" /> : posts.map((p) => (
        <View key={p.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="label">{p.title}</AppText>
            <AppText variant="small" style={{ color: Colors.textMuted }}>
              {p.pair ? `${p.pair} · ` : ''}{new Date(p.created_at).toLocaleString()}
            </AppText>
          </View>
          <Badge color={p.is_active === false ? Colors.textMuted : Colors.success}>
            {p.is_active === false ? 'Desativado' : 'Publicado'}
          </Badge>
          <Pressable
            onPress={() =>
              Alert.alert('Apagar post', 'Confirmas a eliminação?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Apagar', style: 'destructive', onPress: () => adminApi.deletePost(p.id).then(onRefresh) },
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
  return (
    <View>
      <AppText variant="label" style={{ color: Colors.textMuted, marginVertical: Spacing.sm }}>
        USUÁRIOS ({users.length}) · {premium} premium
      </AppText>
      {users.length === 0 ? (
        <EmptyState title="Sem dados" subtitle="Não foi possível carregar os utilizadores." />
      ) : (
        users.map((u) => (
          <View key={u.id} style={styles.row}>
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="label">{u.email}</AppText>
              <AppText variant="small" style={{ color: Colors.textMuted }}>
                Registo: {new Date(u.created_at).toLocaleDateString('pt-PT')}
              </AppText>
            </View>
            <Badge color={Colors.accent}>Utilizador</Badge>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
