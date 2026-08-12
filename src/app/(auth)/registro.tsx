import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { AppButton, AppInput, AppText, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function RegistroScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) router.replace('/(tabs)/inicio');
  }, [user, router]);

  if (user) return null;

  const signUp = async () => {
    if (!email.trim() || password.length < 6) {
      setError('Email obrigatório e senha com mínimo 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() || undefined },
        emailRedirectTo: 'magictrader://',
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSuccess(true);
  };

  if (success) {
    return (
      <Screen scroll={false}>
        <View style={styles.successWrap}>
          <AppText variant="h1" style={{ textAlign: 'center' }}>Conta criada!</AppText>
          <AppText variant="muted" style={{ textAlign: 'center' }}>
            Confirma o teu email para ativares a conta antes de entrares.
          </AppText>
          <AppButton title="Ir para o login" onPress={() => router.replace('/login')} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}>
        <View style={styles.header}>
          <AppText variant="h1">Criar conta</AppText>
          <AppText variant="muted">Grátis para começar. Sem cartão.</AppText>
        </View>

        <View style={styles.form}>
          <AppInput
            label="NOME"
            value={name}
            onChangeText={setName}
            placeholder="O teu nome"
            autoCapitalize="words"
          />
          <AppInput
            label="EMAIL"
            value={email}
            onChangeText={setEmail}
            placeholder="nome@email.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
          <AppInput
            label="SENHA"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            secureTextEntry
          />

          {error ? <AppText style={{ color: Colors.destructive }}>{error}</AppText> : null}

          <AppButton title="Criar conta" onPress={signUp} loading={loading} />
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
          <View style={styles.signinRow}>
            <AppText variant="muted">Já tens conta?</AppText>
            <Link href="/login" style={{ color: Colors.primary, fontWeight: '700' }}>
              Entrar
            </Link>
          </View>
          <AppText variant="small" style={{ color: Colors.textMuted, textAlign: 'center' }}>
            Ao criar conta aceitas os nossos{' '}
            <Link href="/termos" style={{ color: Colors.primary }}>Termos</Link> e a nossa{' '}
            <Link href="/privacidade" style={{ color: Colors.primary }}>Política de Privacidade</Link>.
          </AppText>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: Spacing.xl },
  header: { gap: Spacing.xs },
  form: { gap: Spacing.md },
  footer: { gap: Spacing.md },
  signinRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  successWrap: { flex: 1, justifyContent: 'center', gap: Spacing.lg },
});
