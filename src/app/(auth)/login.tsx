import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppButton, AppInput, AppText, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace('/(tabs)/inicio');
  }, [user, router]);

  if (user) return null;


  const login = async () => {
    if (!email.trim() || !password) {
      setError('Preenche o email e a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email ou senha incorretos.'
          : error.message,
      );
    }
  };

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.brand}>
          <AppText variant="title" style={styles.logo}>The Magic Trader</AppText>
          <AppText variant="muted">Análise inteligente. Entradas estratégicas.</AppText>
        </View>

        <View style={styles.form}>
          <AppInput
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            placeholder="nome@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <View style={styles.passwordWrap}>
            <AppInput
              label="SENHA"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry={!showPassword}
            />
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
              style={styles.eye}
              onPress={() => setShowPassword((v) => !v)}
            />
          </View>

          {error ? <AppText style={{ color: Colors.destructive }}>{error}</AppText> : null}

          <AppButton title="Entrar" onPress={login} loading={loading} />
          <AppButton
            title="Continuar com Google"
            variant="secondary"
            onPress={() =>
              supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: 'magictrader://' },
              })
            }
          />
        </View>

        <View style={styles.footer}>
          <Link href="/recuperar-senha" style={styles.link}>
            Esqueci a senha
          </Link>
          <View style={styles.signupRow}>
            <AppText variant="muted">Ainda não tens conta?</AppText>
            <Link href="/registro" style={[styles.link, { color: Colors.primary }]}>
              Criar conta
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: Spacing.xl },
  brand: { gap: Spacing.xs, alignItems: 'center' },
  logo: { color: Colors.primary },
  form: { gap: Spacing.md },
  passwordWrap: { position: 'relative' },
  eye: { position: 'absolute', right: 14, top: 42 },
  footer: { gap: Spacing.md, alignItems: 'center' },
  link: { color: Colors.textMuted, fontSize: 14, fontWeight: '600', paddingVertical: 4 },
  signupRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
});
