import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Badge, Chip, EmptyState, Screen, SectionTitle, Spinner } from '@/components/ui';
import { BoomCard } from '@/components/BoomCard';
import { useBooms } from '@/hooks/useBooms';
import { useBoomSocial } from '@/hooks/useBoomSocial';
import { getBoomStatus } from '@/core/booms';
import { Colors } from '@/core/theme';
import type { BoomTime } from '@/core/types';

type Filter = 'todos' | 'live' | 'upcoming' | 'expired';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'live', label: 'Ao Vivo' },
  { key: 'upcoming', label: 'Próximos' },
  { key: 'expired', label: 'Encerrados' },
];

function LiveBadge() {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <Badge color={Colors.live} bg={`${Colors.live}1F`}>AO VIVO</Badge>
    </Animated.View>
  );
}

function BoomCardContainer({ boom }: { boom: BoomTime }) {
  const { comments, votes } = useBoomSocial(boom.id);
  return <BoomCard boom={boom} comments={comments} votes={votes} />;
}

export default function ComunidadeScreen() {
  const { booms, loading, error } = useBooms();
  const [filter, setFilter] = useState<Filter>('todos');

  const liveCount = booms.filter((b) => getBoomStatus(b.boom_time) === 'live').length;

  const sorted = [...booms].sort(
    (a, b) => new Date(b.boom_time).getTime() - new Date(a.boom_time).getTime(),
  );

  const filtered = sorted.filter((b) => {
    const status = getBoomStatus(b.boom_time);
    if (filter === 'live') return status === 'live';
    if (filter === 'upcoming') return status === 'upcoming';
    if (filter === 'expired') return status === 'expired';
    return true;
  });

  return (
    <Screen>
      <SectionTitle right={liveCount > 0 ? <LiveBadge /> : null}>Boom Times</SectionTitle>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={f.label}
            active={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      {loading ? (
        <Spinner label="A carregar comunidade…" />
      ) : error ? (
        <EmptyState title="Erro" subtitle={error} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Sem booms" subtitle="Não há booms para este filtro." />
      ) : (
        filtered.map((boom) => <BoomCardContainer key={boom.id} boom={boom} />)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
});
