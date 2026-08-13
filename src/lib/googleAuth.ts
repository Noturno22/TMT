import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_PATH = 'google-auth';

function getRedirectTo(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  const scheme = Constants.expoConfig?.scheme ?? 'magictrader';
  return `${scheme}://${REDIRECT_PATH}`;
}

function extractParamsFromUrl(url: string): URLSearchParams {
  const parsedUrl = new URL(url);
  const params = new URLSearchParams();
  const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
  for (const [key, value] of hashParams) params.set(key, value);
  for (const [key, value] of parsedUrl.searchParams) params.set(key, value);
  return params;
}

export async function signInWithGoogle(): Promise<{ error: string | null }> {
  try {
    const redirectTo = getRedirectTo();

    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      return { error: error?.message ?? null };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) return { error: error.message };
    if (!data.url) return { error: 'Não foi possível iniciar o login com o Google.' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
      showInRecents: true,
    });
    if (result.type !== 'success') return { error: null };

    const params = extractParamsFromUrl(result.url);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const code = params.get('code');

    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) return { error: sessionError.message };
      return { error: null };
    }

    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) return { error: exchangeError.message };
      return { error: null };
    }

    return { error: 'O login com o Google não foi concluído.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ocorreu um erro ao iniciar sessão com o Google.';
    return { error: message };
  }
}
