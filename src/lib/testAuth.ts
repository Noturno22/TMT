import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';

export const TEST_PHONE_KEY = 'tmt_test_phone';

export async function getTestPhone(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TEST_PHONE_KEY);
  } catch {
    return null;
  }
}

export async function saveTestPhone(phone: string): Promise<void> {
  await AsyncStorage.setItem(TEST_PHONE_KEY, phone);
}

export async function clearTestPhone(): Promise<void> {
  await AsyncStorage.removeItem(TEST_PHONE_KEY);
}

export function buildTestUser(phone: string): User {
  const digits = phone.replace(/\D/g, '');
  const fullPhone = `+${digits}`;
  return {
    id: `test-${digits}`,
    aud: 'authenticated',
    role: 'authenticated',
    email: `wa${digits}@tmt.local`,
    phone: fullPhone,
    app_metadata: { provider: 'whatsapp', providers: ['whatsapp'] },
    user_metadata: { phone: fullPhone, auth_provider: 'whatsapp-test' },
    created_at: new Date().toISOString(),
  } as User;
}
