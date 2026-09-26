import type { ProblemMark, SpotPhoto } from '@prolez/shared';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/components/app-text';
import { FootGlyph, HandGlyph } from '@/components/mark-glyphs';
import { Colors, Fonts, Radius, Type } from '@/constants/theme';
import { API_URL } from '@/lib/api';

import { isLeftHand } from './marking';

export interface PhotoProblem {
  key: string;
  /** Номер проблемы на фото — он же в списке под фото. */
  n: number;
  name: string;
  marks: ProblemMark[];
}

interface WallPhotoProps {
  photo: SpotPhoto;
  problems: PhotoProblem[];
  selectedKey: string | undefined;
  onSelect: (key: string) => void;
  /** Режим разметки: касание фото ставит метку, касание метки убирает её. */
  editing?: {
    marks: ProblemMark[];
    onPlace: (x: number, y: number) => void;
    onRemove: (mark: ProblemMark) => void;
  };
}

const TOP_WIDTH = 52;
const sizes = { hand: 42, foot: 36, hold: 26, top: 30 } as const;

export function WallPhoto({ photo, problems, selectedKey, onSelect, editing }: WallPhotoProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const height = Math.round((width * photo.height) / photo.width);
  const selected = problems.find((p) => p.key === selectedKey);
  const marks = editing ? editing.marks : (selected?.marks ?? []);

  return (
    <Pressable
      disabled={!editing}
      onPress={(e) =>
        editing?.onPlace(e.nativeEvent.locationX / width, e.nativeEvent.locationY / height)
      }
      accessibilityLabel={editing ? t('marking.photoLabel') : undefined}
      style={[styles.frame, { width, height }]}
    >
      <Image
        source={{ uri: `${API_URL}${photo.url}` }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="disk"
        transition={200}
        accessibilityLabel={t('marking.photoAlt')}
      />
      {/* Притемнение: метки и номера читаются поверх любого фото. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: editing ? 'rgba(26,28,27,0.3)' : 'rgba(26,28,27,0.14)' },
        ]}
      />

      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {marks.map((mark, i) => (
          <MarkView
            // Метки неизменяемы: пара вид+координаты уникальна внутри разметки.
            key={`${selectedKey}-${mark.kind}-${mark.x}-${mark.y}`}
            mark={mark}
            left={mark.x * width}
            top={mark.y * height}
            mirrored={isLeftHand(marks, mark)}
            delay={editing ? 0 : i * 45}
            onRemove={editing ? () => editing.onRemove(mark) : undefined}
          />
        ))}

        {!editing &&
          problems.map((p) => {
            const start = numberAnchor(p.marks);
            if (!start) return null;
            const isSelected = p.key === selectedKey;
            return (
              <Pressable
                key={p.key}
                accessibilityRole="button"
                accessibilityLabel={t('marking.problemN', { n: p.n, name: p.name })}
                accessibilityState={{ selected: isSelected }}
                hitSlop={10}
                onPress={() => onSelect(p.key)}
                style={[
                  styles.num,
                  isSelected && styles.numSelected,
                  { left: start.x * width - 14, top: start.y * height - (isSelected ? 58 : 14) },
                ]}
              >
                <AppText
                  variant="grade"
                  style={[styles.numText, isSelected && styles.numTextSelected]}
                >
                  {p.n}
                </AppText>
              </Pressable>
            );
          })}
      </View>

      {photo.credit && !editing && (
        <View style={styles.credit} pointerEvents="none">
          <AppText variant="caption">{photo.credit}</AppText>
        </View>
      )}
    </Pressable>
  );
}

/** Номер ставится над стартом: по центру рук, над верхней из них. */
function numberAnchor(marks: readonly ProblemMark[]) {
  const hands = marks.filter((m) => m.kind === 'hand');
  if (hands.length === 0) return undefined;
  return {
    x: hands.reduce((sum, h) => sum + h.x, 0) / hands.length,
    y: Math.min(...hands.map((h) => h.y)),
  };
}

function MarkView({
  mark,
  left,
  top,
  mirrored,
  delay,
  onRemove,
}: {
  mark: ProblemMark;
  left: number;
  top: number;
  mirrored: boolean;
  delay: number;
  onRemove?: () => void;
}) {
  const { t } = useTranslation();
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(pop, {
      toValue: 1,
      delay,
      friction: 6,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [pop, delay]);

  const size = sizes[mark.kind];
  const w = mark.kind === 'top' ? TOP_WIDTH : size;
  return (
    <Animated.View
      pointerEvents={onRemove ? 'auto' : 'none'}
      style={[
        styles.markBox,
        { left: left - w / 2, top: top - size / 2, width: w, height: size },
        {
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
        },
      ]}
    >
      <Pressable
        disabled={!onRemove}
        onPress={onRemove}
        hitSlop={8}
        accessibilityRole={onRemove ? 'button' : undefined}
        accessibilityLabel={
          onRemove ? t('marking.removeMark', { kind: t(`marking.kind.${mark.kind}`) }) : undefined
        }
        style={[styles.mark, styles[mark.kind], { width: w, height: size }]}
      >
        {mark.kind === 'hand' && <HandGlyph color={Colors.ink} mirrored={mirrored} />}
        {mark.kind === 'foot' && <FootGlyph color={Colors.tag} />}
        {mark.kind === 'top' && <AppText style={styles.topText}>{t('marking.topShort')}</AppText>}
      </Pressable>
    </Animated.View>
  );
}

const markShadow = {
  elevation: 5,
  shadowColor: Colors.ink,
  shadowOpacity: 0.45,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
} as const;

const styles = StyleSheet.create({
  frame: { backgroundColor: '#3C403E', overflow: 'hidden' },
  markBox: { position: 'absolute' },
  mark: { alignItems: 'center', justifyContent: 'center', ...markShadow },
  hand: {
    borderRadius: 21,
    backgroundColor: Colors.tag,
    borderWidth: 2.5,
    borderColor: Colors.ink,
  },
  foot: {
    borderRadius: 18,
    backgroundColor: Colors.ink,
    borderWidth: 2.5,
    borderColor: Colors.tag,
  },
  hold: {
    borderRadius: 13,
    backgroundColor: Colors.tag,
    borderWidth: 2.5,
    borderColor: Colors.ink,
  },
  top: {
    borderRadius: Radius.tag,
    backgroundColor: Colors.tag,
    borderWidth: 2.5,
    borderColor: Colors.ink,
  },
  topText: {
    fontFamily: Fonts.displayBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.4,
    color: Colors.ink,
  },
  num: {
    position: 'absolute',
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: Radius.tag,
    backgroundColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    ...markShadow,
    shadowOpacity: 0.4,
  },
  numSelected: { backgroundColor: Colors.accent },
  numText: { ...Type.grade, fontSize: 16, lineHeight: 20, color: Colors.tag },
  numTextSelected: { color: Colors.ink },
  credit: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.tag,
    backgroundColor: Colors.tag,
  },
});
