import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { Badge, Button, Card, Field, ScreenTitle } from '../../components/ui';
import { colors, spacing } from '../../theme';
import type { GatePass } from '../../lib/types';

export function GateScreen() {
  const [otp, setOtp] = useState('');
  const [pass, setPass] = useState<GatePass | null>(null);
  const [busy, setBusy] = useState(false);

  const verify = async () => {
    if (!otp.trim()) return Alert.alert('Enter OTP', 'Type the visitor OTP to verify.');
    setBusy(true);
    try {
      const p = await api.post<GatePass>('/gate/verify', { otp: otp.trim() });
      setPass(p);
    } catch (e) {
      setPass(null);
      Alert.alert('Not valid', e instanceof Error ? e.message : 'No matching pass.');
    } finally {
      setBusy(false);
    }
  };

  const act = async (action: 'check-in' | 'check-out') => {
    if (!pass) return;
    setBusy(true);
    try {
      const updated = await api.post<GatePass>(`/gate/passes/${pass.id}/${action}`, { gateName: 'Main Gate' });
      setPass(updated);
      Alert.alert('Done', `Visitor ${action === 'check-in' ? 'checked in' : 'checked out'}.`);
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setPass(null);
    setOtp('');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={{ padding: spacing.lg }}>
        <ScreenTitle title="Gate Desk" subtitle="Verify a visitor by their OTP" />
        <Card>
          <Field label="Visitor OTP" value={otp} onChangeText={setOtp} keyboardType="number-pad" placeholder="6-digit code" />
          <Button title="Verify" onPress={verify} loading={busy} />
        </Card>

        {pass && (
          <Card>
            <View style={styles.row}>
              <Text style={styles.name}>{pass.visitorName}</Text>
              <Badge label={pass.status} />
            </View>
            <Text style={styles.meta}>
              {pass.type.replace(/_/g, ' ')}{pass.unit ? `  ·  Unit ${pass.unit.unitNumber}` : ''}
            </Text>
            <View style={{ height: spacing.md }} />
            {pass.status === 'APPROVED' && <Button title="✓ Check in" onPress={() => act('check-in')} loading={busy} />}
            {pass.status === 'CHECKED_IN' && <Button title="Check out" variant="secondary" onPress={() => act('check-out')} loading={busy} />}
            <View style={{ height: spacing.sm }} />
            <Button title="New verification" variant="secondary" onPress={reset} />
          </Card>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { fontSize: 14, color: colors.subtext, marginTop: 4 },
});
