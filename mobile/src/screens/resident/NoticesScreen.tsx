import { useEffect } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useList } from '../../lib/useList';
import { api } from '../../lib/api';
import { Badge, Card, Empty, ScreenTitle } from '../../components/ui';
import { colors, spacing } from '../../theme';
import type { Notice } from '../../lib/types';

export function NoticesScreen() {
  const { items, loading, reload } = useList<Notice>('/notices?activeOnly=true');

  // Mark the board read on view (read-receipt for the committee).
  useEffect(() => {
    api.post('/notices/read-all').catch(() => {});
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        contentContainerStyle={{ padding: spacing.lg }}
        data={items}
        keyExtractor={(n) => n.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={<ScreenTitle title="Notice Board" subtitle="Latest from your community" />}
        ListEmptyComponent={!loading ? <Empty text="No notices yet" /> : null}
        renderItem={({ item }) => (
          <Card>
            <View style={styles.row}>
              <Text style={styles.title}>{item.isPinned ? '📌 ' : ''}{item.title}</Text>
              <Badge label={item.priority} />
            </View>
            <Text style={styles.body}>{item.body}</Text>
            <View style={styles.foot}>
              <Text style={styles.date}>{new Date(item.publishedAt).toLocaleString()}</Text>
              <View style={styles.tags}>
                {item.attachments?.length > 0 && <Text style={styles.tag}>📎 {item.attachments.length}</Text>}
                {item.category ? <Text style={styles.tag}>{item.category}</Text> : null}
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  body: { fontSize: 14, color: colors.subtext, lineHeight: 20 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  date: { fontSize: 12, color: colors.subtext },
  tags: { flexDirection: 'row', gap: 8 },
  tag: { fontSize: 11, color: colors.faint },
});
