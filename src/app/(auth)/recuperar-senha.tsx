import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton, AppInput, AppText, Screen } from '@/components/ui';
import { Colors, Spacing } from '@/core/theme';
import { supabase } from '@/lib/supabase';

export default function RecuperarSenhaScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'magictrader://login',
    });
    setLoading(false);
    if (!error) setSent(true);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="h1">Recuperar senha</AppText>
          <AppText variant="muted">
            Enviamos um link de recuperação para o teu email.
          </AppText>
        </View>

        <AppInput
          label="EMAIL"
          value={email}
          onChangeText={setEmail}
          placeholder="nome@email.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />

        {sent ? (
          <AppText style={{ color: Colors.success }}>
            Email enviado! Verifica a tua caixa de entrada.
          </AppText>
        ) : null}

        <AppButton title="Enviar link" onPress={send} loading={loading} />
        <AppButton title="Voltar" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: Spacing.lg },
  header: { gap: Spacing.xs, marginBottom: Spacing.md },
});
