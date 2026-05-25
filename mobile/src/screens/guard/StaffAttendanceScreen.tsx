import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { Button, Card, Field, ScreenTitle } from '../../components/ui';
import { colors, spacing } from '../../theme';

interface AttendanceResult {
  direction: string;
  staffName?: string;
}

export function StaffAttendanceScreen() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);

  const mark = async (direction: 'IN' | 'OUT') => {
    if (!code.trim()) return Alert.alert('Enter code', 'Type the staff gate code.');
    setBusy(true);
    try {
      const res = await api.post<AttendanceResult>('/staff/attendance', { code: code.trim(), direction });
      setLast(`${res.staffName ?? 'Staff'} marked ${direction}`);
      setCode('');
    } catch (e) {
      Alert.alert('Failed', e instanceof Error ? e.message : 'No matching staff code.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={{ padding: spacing.lg }}>
        <ScreenTitle title="Staff Attendance" subtitle="Log daily-help in & out by code" />
        <Card>
          <Field label="Staff gate code" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="STF-XXXXXX" />
          <View style={styles.btnRow}>
            <View style={{ flex: 1 }}><Button title="Check in" onPress={() => mark('IN')} loading={busy} /></View>
            <View style={{ flex: 1 }}><Button title="Check out" variant="secondary" onPress={() => mark('OUT')} loading={busy} /></View>
          </View>
          {last && <Text style={styles.last}>✓ {last}</Text>}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  last: { marginTop: spacing.md, color: colors.green, fontWeight: '600', textAlign: 'center' },
});
