import { useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useList } from '../../lib/useList';
import { api } from '../../lib/api';
import { Badge, Button, Card, Empty, Field, ScreenTitle } from '../../components/ui';
import { colors, spacing } from '../../theme';
import type { GatePass } from '../../lib/types';

const TYPES = ['VISITOR', 'DELIVERY', 'CAB', 'DAILY_HELP', 'GUEST'];

export function VisitorsScreen() {
  const { items, loading, reload } = useList<GatePass>('/gate/passes');
  const [open, setOpen] = useState(false);
  const [type, setType] = useState('VISITOR');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) return Alert.alert('Name required', 'Enter the visitor name.');
    setSaving(true);
    try {
      const pass = await api.post<GatePass>('/gate/passes', { type, visitorName: name.trim(), visitorPhone: phone.trim() || undefined });
      setOpen(false);
      setName('');
      setPhone('');
      void reload();
      Alert.alert('Pass created', pass.otpCode ? `Share this gate OTP with your visitor:\n\n${pass.otpCode}` : 'Visitor pass created.');
    } catch (e) {
      Alert.alert('Could not create pass', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        data={items}
        keyExtractor={(p) => p.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={
          <View>
            <ScreenTitle title="My Visitors" subtitle="Pre-approve guests, deliveries & help" />
            <View style={{ marginBottom: spacing.md }}>
              <Button title="+ New visitor pass" onPress={() => setOpen(true)} />
            </View>
          </View>
        }
        ListEmptyComponent={!loading ? <Empty text="No visitor passes yet" /> : null}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.name}>{item.visitorName}</Text>
              <Badge label={item.status} />
            </View>
            <Text style={styles.meta}>{item.type.replace(/_/g, ' ')}{item.otpCode ? `  ·  OTP ${item.otpCode}` : ''}</Text>
          </Card>
        )}
      />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New visitor pass</Text>
            <View style={styles.types}>
              {TYPES.map((t) => (
                <Text
                  key={t}
                  onPress={() => setType(t)}
                  style={[styles.chip, type === t && styles.chipActive]}
                >
                  {t.replace(/_/g, ' ')}
                </Text>
              ))}
            </View>
            <Field label="Visitor name" value={name} onChangeText={setName} placeholder="e.g. Ramesh" />
            <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="9876543210" />
            <Button title="Create pass" onPress={create} loading={saving} />
            <View style={{ height: spacing.sm }} />
            <Button title="Cancel" variant="secondary" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.subtext, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border, color: colors.subtext, fontSize: 13, overflow: 'hidden' },
  chipActive: { backgroundColor: colors.brand, color: '#fff', borderColor: colors.brand },
});
