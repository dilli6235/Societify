import { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useList } from '../../lib/useList';
import { downloadAndSharePdf } from '../../lib/pdf';
import { Badge, Card, Empty, ScreenTitle } from '../../components/ui';
import { colors, radius, spacing } from '../../theme';
import type { Invoice } from '../../lib/types';

const money = (v: string | number) => `₹${Number(v).toLocaleString('en-IN')}`;

export function BillingScreen() {
  const { items, loading, reload } = useList<Invoice>('/billing/invoices/mine');
  const [busy, setBusy] = useState<string | null>(null);

  const unpaid = items.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED');
  const outstanding = unpaid.reduce((s, i) => s + (Number(i.totalAmount) - Number(i.amountPaid)), 0);

  const download = async (key: string, path: string, filename: string) => {
    setBusy(key);
    try {
      await downloadAndSharePdf(path, filename);
    } catch (e) {
      Alert.alert('Download failed', e instanceof Error ? e.message : 'Please try again');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        data={items}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={colors.subtext} />}
        ListHeaderComponent={
          <>
            <ScreenTitle title="My Dues" subtitle="Maintenance bills & receipts" />
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>Current dues</Text>
              <Text style={styles.heroValue}>{money(outstanding)}</Text>
              <Text style={[styles.heroNote, { color: outstanding > 0 ? colors.red : colors.green }]}>
                {outstanding > 0 ? `${unpaid.length} bill${unpaid.length === 1 ? '' : 's'} pending` : 'All settled — thank you'}
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={!loading ? <Empty text="No bills yet" /> : null}
        renderItem={({ item }) => {
          const paid = Number(item.amountPaid) > 0;
          return (
            <Card>
              <View style={styles.row}>
                <Text style={styles.no}>{item.invoiceNumber}</Text>
                <Badge label={item.status} />
              </View>
              <Text style={styles.meta}>{money(item.totalAmount)} · due {item.dueDate.slice(0, 10)}</Text>
              <View style={styles.actions}>
                <Pressable
                  style={styles.pill}
                  disabled={busy !== null}
                  onPress={() => download(`bill-${item.id}`, `/billing/invoices/${item.id}/pdf`, `${item.invoiceNumber}-bill.pdf`)}
                >
                  <Text style={styles.pillText}>{busy === `bill-${item.id}` ? 'Preparing…' : '↓ Bill'}</Text>
                </Pressable>
                {paid && (
                  <Pressable
                    style={[styles.pill, styles.pillAccent]}
                    disabled={busy !== null}
                    onPress={() => download(`rcpt-${item.id}`, `/billing/invoices/${item.id}/receipt`, `${item.invoiceNumber}-receipt.pdf`)}
                  >
                    <Text style={[styles.pillText, { color: colors.accentInk }]}>{busy === `rcpt-${item.id}` ? 'Preparing…' : '↓ Receipt'}</Text>
                  </Pressable>
                )}
              </View>
            </Card>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  hero: {
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroLabel: { fontSize: 12, color: colors.subtext },
  heroValue: { fontSize: 30, fontWeight: '700', color: colors.text, marginTop: 2 },
  heroNote: { fontSize: 12, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  no: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.subtext },
  actions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card2 },
  pillAccent: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.text },
});
