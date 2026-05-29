import { useState } from 'react';
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useList } from '../../lib/useList';
import { api } from '../../lib/api';
import { Badge, Button, Card, Empty, Field, ScreenTitle } from '../../components/ui';
import { colors, spacing } from '../../theme';
import type { Complaint } from '../../lib/types';

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export function ComplaintsScreen() {
  const { items, loading, reload } = useList<Complaint>('/complaints');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim() || !category.trim() || !description.trim()) {
      return Alert.alert('Missing details', 'Title, category and description are required.');
    }
    setSaving(true);
    try {
      await api.post('/complaints', { title: title.trim(), category: category.trim(), description: description.trim(), priority });
      setOpen(false);
      setTitle(''); setCategory(''); setDescription('');
      void reload();
    } catch (e) {
      Alert.alert('Could not raise ticket', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        data={items}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={
          <View>
            <ScreenTitle title="My Complaints" subtitle="Raise and track issues" />
            <View style={{ marginBottom: spacing.md }}>
              <Button title="+ Raise a ticket" onPress={() => setOpen(true)} />
            </View>
          </View>
        }
        ListEmptyComponent={!loading ? <Empty text="No tickets yet" /> : null}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              <Badge label={item.status} />
            </View>
            <Text style={styles.meta}>{item.ticketNumber} · {item.category} · {item.priority}</Text>
          </Card>
        )}
      />

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Raise a ticket</Text>
            <Field label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Lift not working" />
            <Field label="Category" value={category} onChangeText={setCategory} placeholder="Plumbing, Electrical…" />
            <View style={styles.types}>
              {PRIORITIES.map((p) => (
                <Text key={p} onPress={() => setPriority(p)} style={[styles.chip, priority === p && styles.chipActive]}>{p}</Text>
              ))}
            </View>
            <Field label="Description" value={description} onChangeText={setDescription} placeholder="Describe the issue" multiline />
            <Button title="Submit" onPress={submit} loading={saving} />
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
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  meta: { fontSize: 13, color: colors.subtext, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.xl },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.lg },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.card2, borderWidth: 1, borderColor: colors.border, color: colors.subtext, fontSize: 13, overflow: 'hidden' },
  chipActive: { backgroundColor: colors.accent, color: colors.accentInk, borderColor: colors.accent },
});
