import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Currency, PaymentMethod } from '@/lib/plans';

export type MovementType = 'deposit' | 'withdrawal';
export type MovementStatus = 'concluido' | 'pendente';

export interface WalletMovement {
  id: string;
  type: MovementType;
  method: PaymentMethod;
  amount: number;
  currency: Currency;
  plan?: string;
  status: MovementStatus;
  createdAt: string;
}

export const MOVEMENTS_STORAGE_KEY = 'wallet_movements';

export function useMovements() {
  const [movements, setMovements] = useState<WalletMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<WalletMovement[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(MOVEMENTS_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as WalletMovement[];
            if (Array.isArray(parsed)) {
              listRef.current = parsed;
              setMovements(parsed);
            }
          } catch {
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const addMovement = useCallback(async (movement: Omit<WalletMovement, 'id' | 'createdAt'>) => {
    const record: WalletMovement = {
      ...movement,
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    const next = [record, ...listRef.current];
    listRef.current = next;
    setMovements(next);
    await AsyncStorage.setItem(MOVEMENTS_STORAGE_KEY, JSON.stringify(next));
  }, []);

  return { movements, loading, addMovement };
}
