import type { LonLat } from '@prolez/shared';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { type Animated, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { GradeMark } from '@/components/grade-mark';
import { Icon } from '@/components/icon';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { MapSheet, type SheetMode } from './map-sheet';
import { type MapSpot, approxDistance, distanceM, problemsByGrade } from './spot-list';

/** Категорий в строке списка; остальные — «+N». В превью показываются все. */
const ROW_GRADES = 6;

/**
 * Шторка карты: свёрнута — сколько спотов в кадре; превью — выбранный спот и категории
 * его проблем; развёрнута — список спотов в кадре (он же доступная альтернатива карте).
 */
export function SpotSheet({
  mode,
  expandedHeight,
  visible,
  spots,
  selected,
  userLocation,
  hiddenByFilters,
  nearest,
  onModeChange,
  onRest,
  onSelect,
  onOpen,
  onResetFilters,
}: {
  mode: SheetMode;
  expandedHeight: number;
  visible: Animated.Value;
  /** Споты в кадре, ближние к центру — первыми. */
  spots: MapSpot[];
  selected: MapSpot | undefined;
  userLocation: LonLat | undefined;
  /** Сколько спотов в кадре скрыли фильтры. */
  hiddenByFilters: number;
  /** Ближайший к центру карты спот, если в кадре пусто. */
  nearest: MapSpot | undefined;
  onModeChange: (mode: SheetMode) => void;
  onRest?: (mode: SheetMode, height: number) => void;
  onSelect: (spot: MapSpot) => void;
  onOpen: (spot: MapSpot) => void;
  onResetFilters: () => void;
}) {
  const { t } = useTranslation();
  const peek = mode === 'peek' && selected;

  const distance = (spot: MapSpot) => {
    if (!userLocation) return undefined;
    const { unit, value } = approxDistance(distanceM(userLocation, spot.location));
    return t(`map.sheet.distance_${unit}`, { value });
  };

  const title =
    spots.length > 0 ? t('map.sheet.inView', { count: spots.length }) : t('map.sheet.noneInView');

  const grip = peek ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${selected.name}. ${gradesLabel(selected, t)}`}
      accessibilityHint={t('map.sheet.openHint')}
      onPress={() => onOpen(selected)}
      style={styles.peek}
    >
      {/* Категориям — вся ширина: на экране 360 dp кнопка с подписью съедала бы ряд. */}
      <View style={styles.peekRow}>
        <AppText variant="name" numberOfLines={2} style={styles.flex}>
          {selected.name}
        </AppText>
        <View style={styles.open}>
          <Icon name="arrow-right" size={22} color={Colors.tag} />
        </View>
      </View>
      <ProblemGrades spot={selected} size={40} />
    </Pressable>
  ) : (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={t(mode === 'list' ? 'map.sheet.collapseHint' : 'map.sheet.expandHint')}
      accessibilityState={{ expanded: mode === 'list' }}
      onPress={() => onModeChange(mode === 'list' ? 'collapsed' : 'list')}
      style={styles.header}
    >
      <AppText variant="title" style={styles.flex}>
        {title}
      </AppText>
      <Icon name={mode === 'list' ? 'chevron-down' : 'chevron-up'} size={22} />
    </Pressable>
  );

  return (
    <MapSheet
      mode={peek ? 'peek' : mode === 'list' ? 'list' : 'collapsed'}
      expandedHeight={expandedHeight}
      visible={visible}
      onRest={onRest}
      onDrag={(direction) => {
        if (direction === 'up') onModeChange('list');
        else if (mode === 'list') onModeChange(selected ? 'peek' : 'collapsed');
        else onModeChange('collapsed');
      }}
      grip={grip}
    >
      {mode === 'list' &&
        (spots.length > 0 ? (
          <FlatList
            data={spots}
            keyExtractor={(s) => s.id}
            style={styles.flex}
            contentContainerStyle={styles.list}
            ItemSeparatorComponent={Separator}
            renderItem={({ item }) => {
              const away = distance(item);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={[item.name, gradesLabel(item, t), away]
                    .filter(Boolean)
                    .join('. ')}
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                >
                  <View style={styles.rowTop}>
                    <AppText variant="title" numberOfLines={2} style={styles.flex}>
                      {item.name}
                    </AppText>
                    {away && (
                      <AppText variant="label" tone="muted">
                        {away}
                      </AppText>
                    )}
                  </View>
                  <ProblemGrades spot={item} size={36} max={ROW_GRADES} />
                </Pressable>
              );
            }}
          />
        ) : (
          <View style={styles.empty}>
            {hiddenByFilters > 0 ? (
              <>
                <AppText variant="body">
                  {t('map.sheet.hiddenByFilters', { count: hiddenByFilters })}
                </AppText>
                <Button
                  variant="field"
                  icon="x"
                  label={t('map.sheet.resetFilters')}
                  onPress={onResetFilters}
                />
              </>
            ) : (
              <>
                <AppText variant="body" tone="muted">
                  {t('map.sheet.emptyHint')}
                </AppText>
                {nearest && (
                  <Button
                    variant="ink"
                    icon="navigation"
                    label={t('map.sheet.nearest')}
                    onPress={() => onSelect(nearest)}
                  />
                )}
              </>
            )}
          </View>
        ))}
    </MapSheet>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

/** Категории проблем спота. Без выгруженных проблем — диапазон категорий. */
function ProblemGrades({ spot, size, max }: { spot: MapSpot; size: number; max?: number }) {
  const { t } = useTranslation();

  if (spot.problems ? spot.problems.length === 0 : !spot.gradeMin) {
    return (
      <AppText variant="small" tone="muted">
        {t('spot.noProblems')}
      </AppText>
    );
  }

  if (!spot.problems) {
    return (
      <View style={styles.grades}>
        <AppText variant="grade" style={{ fontSize: size * 0.6, lineHeight: size * 0.7 }}>
          {rangeText(spot)}
        </AppText>
        <AppText variant="label" tone="muted">
          {t('spot.problems', { count: spot.problemCount })}
        </AppText>
      </View>
    );
  }

  const sorted = problemsByGrade(spot.problems);
  const shown = max ? sorted.slice(0, max) : sorted;
  const rest = sorted.length - shown.length;
  return (
    <View style={styles.grades} importantForAccessibility="no-hide-descendants">
      {shown.map((p) => (
        <GradeMark key={p.id} grade={p.grade} status={p.status} size={size} />
      ))}
      {rest > 0 && (
        <AppText variant="label" tone="muted">
          {t('map.sheet.more', { count: rest })}
        </AppText>
      )}
    </View>
  );
}

function rangeText(spot: MapSpot) {
  return spot.gradeMin === spot.gradeMax ? spot.gradeMin : `${spot.gradeMin}–${spot.gradeMax}`;
}

/** Ярлык для TalkBack: «Проблемы: 5C подтверждена, 6A проект». */
function gradesLabel(spot: MapSpot, t: TFunction) {
  if (spot.problems ? spot.problems.length === 0 : !spot.gradeMin) return t('spot.noProblems');
  if (!spot.problems) {
    return `${t('spot.problems', { count: spot.problemCount })}, ${rangeText(spot)}`;
  }
  const list = problemsByGrade(spot.problems)
    .map((p) => `${p.grade} ${t(`spot.status.${p.status}`)}`)
    .join(', ');
  return t('map.sheet.gradesLabel', { list });
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  peek: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  peekRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  open: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.tag,
    backgroundColor: Colors.ink,
  },
  grades: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  list: { paddingBottom: Spacing.four },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.four,
    backgroundColor: Colors.hairline,
  },
  row: {
    gap: Spacing.two,
    minHeight: 64,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  rowPressed: { backgroundColor: Colors.field },
  rowTop: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three },
  empty: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.five,
  },
});
