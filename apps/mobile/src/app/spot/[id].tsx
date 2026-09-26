import type { ProblemSummary, SpotDetail } from '@prolez/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { FootGlyph, HandGlyph } from '@/components/mark-glyphs';
import { Snackbar, useSnackbar } from '@/components/snackbar';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';
import { type ProblemDraft, useDraftStore } from '@/features/problems/draft-store';
import {
  type MarkingState,
  emptyMarking,
  placeMark,
  removeMark,
  selectTool,
  undoMark,
} from '@/features/problems/marking';
import { MarkingDock } from '@/features/problems/marking-dock';
import { ProblemList, type ProblemRowData } from '@/features/problems/problem-list';
import { PublishSheet } from '@/features/problems/publish-sheet';
import { type PhotoProblem, WallPhoto } from '@/features/problems/wall-photo';
import { SpotFacts } from '@/features/spots/spot-facts';
import { useSpot } from '@/features/spots/queries';
import { ApiError } from '@/lib/api';

const APP_BAR = 56;
/** Высота панели разметки без нижнего отступа: под неё уходит прокрутка. */
const DOCK_HEIGHT = 170;

export default function SpotScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const spot = useSpot(id);

  if (spot.isPending) {
    return (
      <Shell>
        <ActivityIndicator color={Colors.ink} size="large" />
      </Shell>
    );
  }
  const notFound = spot.error instanceof ApiError && spot.error.status === 404;
  // Без сети обновление падает, но сохранённая карточка остаётся — показываем её.
  if (spot.isError && (notFound || !spot.data)) {
    return (
      <Shell>
        <AppText variant="head" style={styles.centerText}>
          {t(notFound ? 'spot.notFound' : 'spot.loadError')}
        </AppText>
        {!notFound && (
          <Button
            variant="ink"
            icon="rotate-cw"
            label={t('map.retry')}
            onPress={() => spot.refetch()}
          />
        )}
      </Shell>
    );
  }
  return <SpotDetails spot={spot.data!} />;
}

/** Экран загрузки и ошибок: фон и кнопка «назад», чтобы из него всегда был выход. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.center}>
      <AppBar title="" solid />
      {children}
    </View>
  );
}

function problemSubtitle(t: TFunction, p: ProblemSummary) {
  const parts = [t(`discipline.${p.discipline}`), t(`spot.status.${p.status}`)];
  if (p.ascentCount > 0) parts.push(t('spot.climbed', { count: p.ascentCount }));
  return parts.join(' · ');
}

function SpotDetails({ spot }: { spot: SpotDetail }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const scroll = useRef<ScrollView>(null);
  const snackbar = useSnackbar();

  const allDrafts = useDraftStore((s) => s.drafts);
  const addDraft = useDraftStore((s) => s.addDraft);
  const drafts = useMemo(() => allDrafts.filter((d) => d.spotId === spot.id), [allDrafts, spot.id]);

  // Пока фото у спота одно; галерея появится вместе с загрузкой фото (фаза 4).
  const photo = spot.photos[0];
  const photoHeight = photo ? Math.round((width * photo.height) / photo.width) : 0;

  // Номера на фото идут в порядке списка: сначала опубликованные, потом черновики.
  const { rows, photoProblems } = useMemo(() => {
    const onPhoto: PhotoProblem[] = [];
    const list: ProblemRowData[] = [];
    for (const p of spot.problems) {
      const marked = photo !== undefined && p.photoId === photo.id && p.marks.length > 0;
      const n = marked ? onPhoto.length + 1 : undefined;
      if (n !== undefined) onPhoto.push({ key: p.id, n, name: p.name, marks: p.marks });
      list.push({
        key: p.id,
        name: p.name,
        grade: p.grade,
        status: p.status,
        subtitle: problemSubtitle(t, p),
        n,
      });
    }
    for (const d of drafts) {
      const n = onPhoto.length + 1;
      onPhoto.push({ key: d.id, n, name: d.name, marks: d.marks });
      list.push({
        key: d.id,
        name: d.name,
        grade: d.grade,
        status: 'project',
        subtitle: t('marking.draftSubtitle'),
        n,
        draft: true,
      });
    }
    return { rows: list, photoProblems: onPhoto };
  }, [spot.problems, drafts, photo, t]);

  const [selectedKey, setSelectedKey] = useState<string | undefined>(photoProblems[0]?.key);
  const [marking, setMarking] = useState<MarkingState | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  // Прокрутили мимо фото (или мимо крупного названия, если фото нет).
  const [scrolledPast, setScrolledPast] = useState(false);

  const editing = marking !== null;
  const solid = !photo || editing || scrolledPast;
  const scrollThreshold = photo ? photoHeight - insets.top - APP_BAR - 24 : 48;

  // Системная «Назад» в режиме разметки выходит из разметки, а не с экрана.
  useEffect(() => {
    if (!editing) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMarking(null);
      return true;
    });
    return () => sub.remove();
  }, [editing]);

  const select = (key: string) => {
    setSelectedKey(key);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const startMarking = () => {
    setMarking(emptyMarking);
    scroll.current?.scrollTo({ y: 0, animated: true });
  };

  const saveDraft = ({ name, grade }: Pick<ProblemDraft, 'name' | 'grade'>) => {
    if (!photo || !marking) return;
    const draft = addDraft({
      spotId: spot.id,
      photoId: photo.id,
      name,
      grade,
      marks: marking.marks,
    });
    setPublishOpen(false);
    setMarking(null);
    setSelectedKey(draft.id);
    snackbar.show(t('marking.savedDraft', { grade }));
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={solid ? 'dark' : 'light'} />
      <ScrollView
        ref={scroll}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const past = e.nativeEvent.contentOffset.y > scrollThreshold;
          if (past !== scrolledPast) setScrolledPast(past);
        }}
        contentContainerStyle={{
          paddingBottom: (editing ? DOCK_HEIGHT : Spacing.six) + insets.bottom,
        }}
      >
        {photo ? (
          <>
            <WallPhoto
              photo={photo}
              problems={photoProblems}
              selectedKey={selectedKey}
              onSelect={setSelectedKey}
              editing={
                marking
                  ? {
                      marks: marking.marks,
                      onPlace: (x, y) => setMarking((s) => s && placeMark(s, x, y)),
                      onRemove: (m) => setMarking((s) => s && removeMark(s, m)),
                    }
                  : undefined
              }
            />
            {editing ? (
              <View style={styles.strip}>
                <AppText variant="small" tone="onInk">
                  <AppText variant="small" tone="onInk" style={styles.bold}>
                    {t('marking.hintTitle')}{' '}
                  </AppText>
                  {t('marking.hint')}
                </AppText>
              </View>
            ) : (
              <Legend />
            )}
          </>
        ) : (
          <View style={{ height: insets.top + APP_BAR }} />
        )}

        <View style={styles.body}>
          <SpotFacts spot={spot} />

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText variant="head" accessibilityRole="header">
                {t('spot.problemsTitle')}
              </AppText>
              <AppText variant="small" tone="muted">
                {rows.length}
              </AppText>
            </View>
            {rows.length === 0 ? (
              <View style={styles.empty}>
                <AppText variant="bodyStrong">{t('spot.noProblems')}</AppText>
                <AppText variant="small" tone="muted">
                  {t(photo ? 'spot.noProblemsHintPhoto' : 'spot.noProblemsHint')}
                </AppText>
              </View>
            ) : (
              <ProblemList rows={rows} selectedKey={selectedKey} onSelect={select} />
            )}
            <AppText variant="small" tone="muted" style={styles.rules}>
              {t('spot.rules')}
            </AppText>
          </View>

          {photo && !editing && (
            <Pressable
              accessibilityRole="button"
              onPress={startMarking}
              style={({ pressed }) => [styles.rowButton, pressed && styles.pressed]}
            >
              <Icon name="plus" />
              <View style={styles.rowButtonText}>
                <AppText variant="bodyStrong">{t('marking.start')}</AppText>
                <AppText variant="label" tone="muted">
                  {t('marking.startHint')}
                </AppText>
              </View>
              <Icon name="chevron-right" size={20} />
            </Pressable>
          )}

          <AppText variant="label" tone="muted" style={styles.disclaimer}>
            {t('spot.disclaimer')}
          </AppText>
        </View>
      </ScrollView>

      <AppBar
        title={editing ? t('marking.title') : spot.name}
        solid={solid}
        showTitle={editing || scrolledPast}
        onBack={editing ? () => setMarking(null) : undefined}
      />

      {marking && (
        <MarkingDock
          state={marking}
          onTool={(tool) => setMarking((s) => s && selectTool(s, tool))}
          onUndo={() => setMarking((s) => s && undoMark(s))}
          onCancel={() => setMarking(null)}
          onNext={() => setPublishOpen(true)}
        />
      )}

      <PublishSheet
        open={publishOpen}
        defaultName={t('marking.defaultName', { n: photoProblems.length + 1 })}
        onClose={() => setPublishOpen(false)}
        onSave={saveDraft}
      />

      <Snackbar
        message={snackbar.message}
        bottom={(editing ? DOCK_HEIGHT : Spacing.five) + insets.bottom}
      />
    </View>
  );
}

/** Шапка: прозрачная над фото, сплошная бирка после прокрутки и в режиме разметки. */
function AppBar({
  title,
  solid,
  showTitle = true,
  onBack,
}: {
  title: string;
  solid: boolean;
  showTitle?: boolean;
  onBack?: () => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const height = insets.top + APP_BAR + Spacing.two;

  return (
    <View style={[styles.appBar, { paddingTop: insets.top, height }, solid && styles.appBarSolid]}>
      {!solid && (
        <Svg style={StyleSheet.absoluteFill} width={width} height={height} pointerEvents="none">
          <Defs>
            <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={Colors.ink} stopOpacity={0.55} />
              <Stop offset="1" stopColor={Colors.ink} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect width={width} height={height} fill="url(#fade)" />
        </Svg>
      )}
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={onBack ? t('marking.cancel') : t('spot.back')}
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
          style={[styles.barButton, !solid && styles.barButtonOnPhoto]}
        >
          <Icon name={onBack ? 'x' : 'arrow-left'} />
        </Pressable>
        {/* Над фото заголовка нет: название крупно ниже, дубль мешал бы скринридеру. */}
        {showTitle ? (
          <AppText variant="title" numberOfLines={1} style={styles.barTitle}>
            {title}
          </AppText>
        ) : (
          <View style={styles.barTitle} />
        )}
      </View>
    </View>
  );
}

function Legend() {
  const { t } = useTranslation();
  return (
    <View
      style={styles.strip}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <HandGlyph size={16} color={Colors.tag} />
          <AppText variant="label" tone="onInk">
            {t('marking.legend.hand')}
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <FootGlyph size={16} color={Colors.tag} />
          <AppText variant="label" tone="onInk">
            {t('marking.legend.foot')}
          </AppText>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendHold} />
          <AppText variant="label" tone="onInk">
            {t('marking.legend.hold')}
          </AppText>
        </View>
      </View>
      <AppText variant="label" tone="onInk" style={styles.legendNote}>
        {t('marking.legend.numbers')}
      </AppText>
    </View>
  );
}

/** Полоса под фото — продолжение тёмного кадра. */
const STRIP = '#3C403E';

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.ground },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
    padding: Spacing.five,
    backgroundColor: Colors.ground,
  },
  centerText: { textAlign: 'center' },
  body: { paddingHorizontal: Spacing.four, paddingTop: 18 },
  strip: { backgroundColor: STRIP, paddingHorizontal: Spacing.four, paddingVertical: 10, gap: 6 },
  bold: { fontFamily: Fonts.textBold },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendHold: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.tag,
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  legendNote: { opacity: 0.8, fontFamily: Fonts.textMedium },
  section: { marginTop: Spacing.six },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: Spacing.three,
  },
  empty: {
    gap: Spacing.one,
    padding: Spacing.four,
    borderRadius: Radius.tag,
    backgroundColor: Colors.tag,
  },
  rules: { marginTop: 14 },
  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 64,
    marginTop: Spacing.six,
    paddingHorizontal: 14,
    paddingVertical: Spacing.three,
    borderRadius: Radius.tag,
    backgroundColor: Colors.tag,
  },
  rowButtonText: { flex: 1, gap: 2 },
  pressed: { transform: [{ scale: 0.98 }] },
  disclaimer: { marginTop: Spacing.five, fontFamily: Fonts.text, lineHeight: 19 },
  appBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  appBarSolid: {
    backgroundColor: Colors.tag,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hairline,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: APP_BAR,
    paddingHorizontal: Spacing.three,
  },
  barButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.tag,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barButtonOnPhoto: { backgroundColor: Colors.tag },
  barTitle: { flex: 1 },
});
