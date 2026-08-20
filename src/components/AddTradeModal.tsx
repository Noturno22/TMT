import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AppButton, AppInput, AppText } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/core/theme';
import { ALL_PAIRS } from '@/core/gating';
import type { TradeDirection, TradeResult } from '@/core/types';

const PAIRS = ALL_PAIRS.filter((p) => p !== 'BTC/USD');

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (entry: {
    pair: string;
    direction: TradeDirection;
    entryPrice: number;
    exitPrice: number | null;
    lotSize: number;
    result: TradeResult;
    profitUsd: number;
    pips: number;
    notes: string;
    boomHourId: string | null;
    closedAt: string | null;
  }) => void;
}

export function AddTradeModal({ visible, onClose, onSave }: Props) {
  const { t } = useTranslation();
  const [pair, setPair] = useState(PAIRS[0]);
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [result, setResult] = useState<TradeResult>('WIN');
  const [entryPrice, setEntryPrice] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [profitUsd, setProfitUsd] = useState('');
  const [pips, setPips] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setPair(PAIRS[0]);
    setDirection('BUY');
    setResult('WIN');
    setEntryPrice('');
    setExitPrice('');
    setProfitUsd('');
    setPips('');
    setLotSize('');
    setNotes('');
  };

  const handleSave = () => {
    const pnl = Number(profitUsd);
    if (!isFinite(pnl)) {
      Alert.alert(t('diario.invalidValue'), t('diario.invalidProfit'));
      return;
    }
    onSave({
      pair,
      direction,
      entryPrice: entryPrice ? Number(entryPrice) : 0,
      exitPrice: exitPrice ? Number(exitPrice) : null,
      lotSize: lotSize ? Number(lotSize) : 0.01,
      result,
      profitUsd: pnl,
      pips: pips ? Number(pips) : 0,
      notes,
      boomHourId: null,
      closedAt: new Date().toISOString(),
    });
    reset();
    onClose();
  };

  const resultColor =
    result === 'WIN' ? Colors.success : result === 'LOSS' ? Colors.destructive : Colors.textMuted;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <AppText variant="h2">{t('diario.addTrade')}</AppText>
            <Pressable onPress={() => { reset(); onClose(); }} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textFaint} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            <AppText variant="label" style={styles.sectionLabel}>{t('diario.tradePair')}</AppText>
            <View style={styles.chips}>
              {PAIRS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setPair(p)}
                  style={[styles.chip, pair === p && styles.chipActive]}>
                  <AppText variant="small" style={{ color: pair === p ? '#000' : Colors.textMuted, fontWeight: '600' }}>
                    {p}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="label" style={styles.sectionLabel}>{t('diario.tradeDirection')}</AppText>
            <View style={styles.dirRow}>
              {(['BUY', 'SELL'] as const).map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDirection(d)}
                  style={[styles.dirBtn, direction === d && (d === 'BUY' ? styles.dirBuy : styles.dirSell)]}>
                  <Ionicons name={d === 'BUY' ? 'arrow-up' : 'arrow-down'} size={16} color={direction === d ? '#FFF' : Colors.textMuted} />
                  <AppText variant="small" style={{ color: direction === d ? '#FFF' : Colors.textMuted, fontWeight: '700' }}>{d}</AppText>
                </Pressable>
              ))}
            </View>

            <AppText variant="label" style={styles.sectionLabel}>{t('diario.tradeResult')}</AppText>
            <View style={styles.resultRow}>
              {(['WIN', 'LOSS', 'BREAKEVEN'] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setResult(r)}
                  style={[styles.resultBtn, result === r && {
                    backgroundColor: r === 'WIN' ? Colors.success : r === 'LOSS' ? Colors.destructive : Colors.textMuted,
                    borderColor: r === 'WIN' ? Colors.success : r === 'LOSS' ? Colors.destructive : Colors.textMuted,
                  }]}>
                  <Ionicons name={r === 'WIN' ? 'trophy' : r === 'LOSS' ? 'close-circle' : 'remove-circle'} size={14} color={result === r ? '#FFF' : Colors.textMuted} />
                  <AppText variant="small" style={{ color: result === r ? '#FFF' : Colors.textMuted, fontWeight: '700' }}>{r}</AppText>
                </Pressable>
              ))}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('diario.tradeEntry')}
                  value={entryPrice}
                  onChangeText={setEntryPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00000"
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('diario.tradeExit')}
                  value={exitPrice}
                  onChangeText={setExitPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00000"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('diario.tradeProfit')}
                  value={profitUsd}
                  onChangeText={setProfitUsd}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('diario.tradePips')}
                  value={pips}
                  onChangeText={setPips}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <AppInput
                  label={t('diario.tradeLot')}
                  value={lotSize}
                  onChangeText={setLotSize}
                  keyboardType="decimal-pad"
                  placeholder="0.01"
                />
              </View>
              <View style={{ flex: 1 }} />
            </View>

            <AppInput
              label={t('diario.tradeNotes')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
              placeholder={t('diario.tradeNotesPlaceholder')}
            />
          </ScrollView>

          <View style={styles.actions}>
            <AppButton title={t('diario.cancel')} variant="ghost" onPress={() => { reset(); onClose(); }} />
            <AppButton title={t('diario.save')} variant="primary" onPress={handleSave} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: Colors.bg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textFaint,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: { maxHeight: '75%' },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  sectionLabel: { marginBottom: Spacing.sm, marginTop: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  dirRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  dirBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dirBuy: { backgroundColor: Colors.success, borderColor: Colors.success },
  dirSell: { backgroundColor: Colors.destructive, borderColor: Colors.destructive },
  row: { flexDirection: 'row', gap: Spacing.sm },
  resultRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  resultBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
});
