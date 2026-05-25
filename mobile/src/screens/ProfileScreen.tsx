import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../auth/AuthContext';
import { api } from '../lib/api';
import { Button, Card, ScreenTitle } from '../components/ui';
import { colors, spacing } from '../theme';

export function ProfileScreen() {
  const { user, logout, hasRole } = useAuth();
  const [sosLoading, setSosLoading] = useState(false);

  const raiseSos = () => {
    Alert.alert('Raise emergency alert?', 'This notifies security and management immediately.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send SOS',
        style: 'destructive',
        onPress: async () => {
          setSosLoading(true);
          try {
            await api.post('/sos', { type: 'SECURITY', message: 'Emergency raised from mobile app' });
            Alert.alert('Alert sent', 'Help has been notified.');
          } catch (e) {
            Alert.alert('Failed', e instanceof Error ? e.message : 'Try again.');
          } finally {
            setSosLoading(false);
          }
        },
      },
    ]);
  };

  const initials = user?.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={{ padding: spacing.lg }}>
        <ScreenTitle title="Profile" />
        <Card>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <View>
              <Text style={styles.name}>{user?.fullName}</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>
          <Text style={styles.roles}>{user?.roles.map((r) => r.replace(/_/g, ' ')).join(', ')}</Text>
        </Card>

        {!hasRole('SECURITY_GUARD') && (
          <Card>
            <Text style={styles.sosTitle}>Emergency</Text>
            <Text style={styles.sosText}>In an emergency, alert security and management instantly.</Text>
            <Button title="🚨 Raise SOS" variant="danger" onPress={raiseSos} loading={sosLoading} />
          </Card>
        )}

        <Button title="Sign out" variant="secondary" onPress={logout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 52, height: 52, borderRadius: 999, backgroundColor: colors.blueBg, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.brand, fontWeight: '700', fontSize: 18 },
  name: { fontSize: 17, fontWeight: '700', color: colors.text },
  email: { fontSize: 13, color: colors.subtext },
  roles: { fontSize: 13, color: colors.subtext },
  sosTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  sosText: { fontSize: 13, color: colors.subtext, marginBottom: spacing.md },
});
