import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { Button, Field } from '../components/ui';
import { colors, spacing } from '../theme';

export function LoginScreen() {
  const { login } = useAuth();
  const [slug, setSlug] = useState('greenwood-heights');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Missing details', 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(slug.trim(), email.trim(), password);
    } catch (err) {
      Alert.alert('Sign in failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.logo}>
        <Text style={styles.logoMark}>🏢</Text>
      </View>
      <Text style={styles.title}>Societify</Text>
      <Text style={styles.subtitle}>Your community, in your pocket</Text>

      <View style={styles.form}>
        <Field label="Society URL (slug)" value={slug} onChangeText={setSlug} placeholder="greenwood-heights" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="••••••••" />
        <Button title="Sign in" onPress={onSubmit} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl },
  logo: { alignSelf: 'center', width: 64, height: 64, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  logoMark: { fontSize: 32 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: spacing.md },
  subtitle: { fontSize: 14, color: colors.subtext, textAlign: 'center', marginBottom: spacing.xl },
  form: { marginTop: spacing.lg },
});
