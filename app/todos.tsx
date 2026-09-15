import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import { addTodo, deleteTodo, listTodos, setTodoDone } from '../lib/api/todos';
import { useTheme } from '../lib/theme-context';
import { radius, spacing, type ColorPalette } from '../lib/theme';
import type { Todo } from '../lib/types';

export default function TodosScreen() {
  const { family } = useAuth();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!family) return;
    const rows = await listTodos(family.id);
    setTodos(rows);
    setLoading(false);
  }, [family]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!family) return;
    const channel = supabase
      .channel(`todos-${family.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos', filter: `family_id=eq.${family.id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [family, load]);

  const toggle = async (todo: Todo) => {
    setBusyId(todo.id);
    try {
      await setTodoDone(todo.id, !todo.done);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await deleteTodo(id);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const add = async () => {
    if (!family || !newLabel.trim()) return;
    setAdding(true);
    try {
      await addTodo(family.id, newLabel.trim());
      setNewLabel('');
      await load();
    } finally {
      setAdding(false);
    }
  };

  if (!family) return null;

  const pending = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>할 일 목록</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={newLabel}
          onChangeText={setNewLabel}
          placeholder="예: 기저귀 사러 가기"
          placeholderTextColor={colors.inkFaint}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={add} disabled={adding || !newLabel.trim()}>
          {adding ? <ActivityIndicator color={colors.bg} size="small" /> : <Text style={styles.addBtnText}>추가</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <FlatList
          data={[...pending, ...done]}
          keyExtractor={(t) => t.id}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.xl * 2 }}
          ListEmptyComponent={<Text style={styles.empty}>할 일이 없어요. 위에서 추가해보세요.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <TouchableOpacity style={styles.rowMain} onPress={() => toggle(item)} disabled={busyId === item.id}>
                <View style={[styles.checkbox, item.done && styles.checkboxDone]}>
                  {item.done ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
                <Text style={[styles.label, item.done && styles.labelDone]}>{item.label}</Text>
              </TouchableOpacity>
              {busyId === item.id ? (
                <ActivityIndicator size="small" color={colors.ink} />
              ) : (
                <TouchableOpacity onPress={() => remove(item.id)} hitSlop={8}>
                  <Text style={styles.deleteText}>삭제</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
    back: { fontSize: 14, color: colors.inkSoft, fontWeight: '600', width: 40 },
    title: { fontSize: 17, fontWeight: '800', color: colors.ink },
    addRow: { flexDirection: 'row', gap: spacing.sm },
    input: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.line,
      backgroundColor: colors.card,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: colors.ink,
    },
    addBtn: { backgroundColor: colors.ink, borderRadius: radius.md, paddingHorizontal: 18, justifyContent: 'center' },
    addBtnText: { color: colors.bg, fontSize: 13.5, fontWeight: '700' },
    empty: { textAlign: 'center', color: colors.inkFaint, fontSize: 12.5, marginTop: spacing.xl },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.line,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxDone: { backgroundColor: colors.mintDeep, borderColor: colors.mintDeep },
    checkboxMark: { color: '#fff', fontSize: 13, fontWeight: '800' },
    label: { fontSize: 14, fontWeight: '600', color: colors.ink, flex: 1 },
    labelDone: { color: colors.inkFaint, textDecorationLine: 'line-through' },
    deleteText: { fontSize: 12, color: colors.danger, fontWeight: '700' },
  });
}
