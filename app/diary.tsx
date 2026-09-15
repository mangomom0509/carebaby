import { useCallback, useEffect, useMemo, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
import { getDiaryEntry, saveDiaryEntry } from '../lib/api/diary';
import { deletePhotoForDate, getPhotoForDate, getSignedUrls, uploadPhotoForDate } from '../lib/api/photos';
import { toISO, todayStart } from '../lib/dates';
import { colors, radius, spacing } from '../lib/theme';
import type { PhotoEntry } from '../lib/types';

const WEEKDAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

function addDays(d: Date, days: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAY_NAMES[d.getDay()]})`;
}

export default function DiaryScreen() {
  const { child } = useAuth();
  const insets = useSafeAreaInsets();
  const [date, setDate] = useState(() => todayStart());
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PhotoEntry | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [photoBusy, setPhotoBusy] = useState(false);

  const dateIso = useMemo(() => toISO(date), [date]);
  const isToday = dateIso === toISO(todayStart());

  const load = useCallback(async () => {
    if (!child) return;
    setLoading(true);
    try {
      const [entry, photoEntry] = await Promise.all([getDiaryEntry(child.id, dateIso), getPhotoForDate(child.id, dateIso)]);
      setText(entry?.text ?? '');
      setSavedAt(entry?.updated_at ?? null);
      setPhoto(photoEntry);
      if (photoEntry) {
        const urls = await getSignedUrls([photoEntry.storage_path]);
        setPhotoUrl(urls[photoEntry.storage_path]);
      } else {
        setPhotoUrl(undefined);
      }
    } finally {
      setLoading(false);
    }
  }, [child, dateIso]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!child) return;
    const channel = supabase
      .channel(`diary-${child.id}-${dateIso}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'diary_entries', filter: `child_id=eq.${child.id}` },
        () => load(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'photos', filter: `child_id=eq.${child.id}` }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [child, dateIso, load]);

  const save = async () => {
    if (!child) return;
    setSaving(true);
    try {
      const entry = await saveDiaryEntry(child.id, dateIso, text);
      setSavedAt(entry.updated_at);
    } finally {
      setSaving(false);
    }
  };

  const pickAndUploadPhoto = async () => {
    if (!child) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('권한이 필요해요', '사진을 추가하려면 앨범 접근 권한을 허용해주세요.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;
    setPhotoBusy(true);
    try {
      await uploadPhotoForDate(child.id, dateIso, result.assets[0].base64);
      await load();
    } catch (e) {
      Alert.alert('업로드 실패', e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!child) return;
    setPhotoBusy(true);
    try {
      await deletePhotoForDate(child.id, dateIso);
      await load();
    } catch (e) {
      Alert.alert('삭제 실패', e instanceof Error ? e.message : '알 수 없는 오류가 발생했어요.');
    } finally {
      setPhotoBusy(false);
    }
  };

  if (!child) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Text style={styles.back}>‹ 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.title}>육아일기</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.dateNav}>
        <TouchableOpacity onPress={() => setDate((d) => addDays(d, -1))} hitSlop={10}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateText}>
          {formatDate(date)}
          {isToday ? ' · 오늘' : ''}
        </Text>
        <TouchableOpacity onPress={() => setDate((d) => addDays(d, 1))} disabled={isToday} hitSlop={10}>
          <Text style={[styles.navArrow, isToday && styles.navArrowDisabled]}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.ink} />
      ) : (
        <>
          {photoBusy ? (
            <ActivityIndicator style={{ marginBottom: spacing.md }} color={colors.ink} />
          ) : photoUrl ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: photoUrl }} style={styles.photo} />
              <View style={styles.photoActions}>
                <TouchableOpacity onPress={pickAndUploadPhoto}>
                  <Text style={styles.photoActionText}>사진 바꾸기</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={removePhoto}>
                  <Text style={[styles.photoActionText, styles.photoActionDanger]}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.photoAdd} onPress={pickAndUploadPhoto}>
              <Text style={styles.photoAddText}>+ 오늘의 사진 추가하기</Text>
            </TouchableOpacity>
          )}

          <TextInput
            style={styles.textArea}
            value={text}
            onChangeText={setText}
            placeholder="오늘 하루는 어땠나요?"
            placeholderTextColor={colors.inkFaint}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.footer}>
            {savedAt ? <Text style={styles.savedHint}>마지막 저장: {new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</Text> : <View />}
            <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>저장하기</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  back: { fontSize: 14, color: colors.inkSoft, fontWeight: '600', width: 40 },
  title: { fontSize: 17, fontWeight: '800', color: colors.ink },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.md },
  navArrow: { fontSize: 22, color: colors.inkSoft, fontWeight: '700', paddingHorizontal: spacing.md },
  navArrowDisabled: { color: colors.line },
  dateText: { fontSize: 14.5, fontWeight: '700', color: colors.ink, minWidth: 140, textAlign: 'center' },
  textArea: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 14.5,
    color: colors.ink,
    lineHeight: 21,
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  savedHint: { fontSize: 11.5, color: colors.inkFaint },
  saveBtn: { backgroundColor: colors.ink, borderRadius: radius.md, paddingHorizontal: 22, paddingVertical: 12 },
  saveBtnText: { color: '#fff', fontSize: 13.5, fontWeight: '700' },
  photoAdd: {
    borderWidth: 1.5,
    borderColor: colors.line,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.card,
  },
  photoAddText: { fontSize: 13, fontWeight: '700', color: colors.inkSoft },
  photoWrap: { marginBottom: spacing.md },
  photo: { width: '100%', aspectRatio: 1.6, borderRadius: radius.lg },
  photoActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, justifyContent: 'center' },
  photoActionText: { fontSize: 12.5, fontWeight: '700', color: colors.coral },
  photoActionDanger: { color: colors.danger },
});
