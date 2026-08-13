import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BancaConfig } from '@/core/types';

export const BANCA_STORAGE_KEY = 'banca_config';

export const BANCA_DEFAULTS: BancaConfig = {
  capital: 10000,
  achieved: 12300,
  metaPercent: 50,
  riskPercent: 1,
  metaMonths: '1-3 meses',
};

export function useBanca() {
  const [config, setConfig] = useState<BancaConfig>(BANCA_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(BANCA_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<BancaConfig>;
            setConfig({ ...BANCA_DEFAULTS, ...parsed });
          } catch {
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (next: BancaConfig) => {
    setConfig(next);
    await AsyncStorage.setItem(BANCA_STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { config, loading, save };
}
