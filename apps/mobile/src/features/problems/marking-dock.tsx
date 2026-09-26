import { type MarkKind, markKinds, markLimits, markingIssues } from '@prolez/shared';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { FootGlyph, HandGlyph } from '@/components/mark-glyphs';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { type MarkingState, markCount } from './marking';

/** Нижняя панель режима разметки: инструменты, отмена, «Дальше». */
export function MarkingDock({
  state,
  onTool,
  onUndo,
  onCancel,
  onNext,
}: {
  state: MarkingState;
  onTool: (tool: MarkKind) => void;
  onUndo: () => void;
  onCancel: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const ready = markingIssues(state.marks).length === 0;

  return (
    <View style={[styles.dock, { paddingBottom: 20 + insets.bottom }]}>
      <View
        style={styles.tools}
        accessibilityRole="radiogroup"
        accessibilityLabel={t('marking.tools')}
      >
        {markKinds.map((kind) => {
          const active = state.tool === kind;
          const fg = active ? Colors.tag : Colors.ink;
          const count = markCount(state.marks, kind);
          // У зацепов лимит большой — показываем просто число.
          const counter = kind === 'hold' ? String(count) : `${count}/${markLimits[kind]}`;
          return (
            <Pressable
              key={kind}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${t(`marking.tool.${kind}`)}, ${counter}`}
              onPress={() => onTool(kind)}
              style={[styles.tool, active && styles.toolActive]}
            >
              {kind === 'hand' && <HandGlyph size={22} color={fg} />}
              {kind === 'foot' && <FootGlyph size={22} color={fg} />}
              {kind === 'hold' && (
                <View
                  style={[styles.holdIcon, { borderColor: active ? Colors.accent : Colors.ink }]}
                />
              )}
              {kind === 'top' && (
                <View style={[styles.topIcon, active && styles.topIconActive]}>
                  <AppText style={[styles.topIconText, active && styles.topIconTextActive]}>
                    {t('marking.topShort')}
                  </AppText>
                </View>
              )}
              <AppText variant="caption" style={[styles.toolText, { color: fg }]}>
                {t(`marking.tool.${kind}`)}{' '}
                <AppText variant="caption" style={[styles.counter, { color: fg }]}>
                  {counter}
                </AppText>
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('marking.cancel')}
          onPress={onCancel}
          style={styles.square}
        >
          <Icon name="x" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('marking.undo')}
          accessibilityState={{ disabled: state.history.length === 0 }}
          disabled={state.history.length === 0}
          onPress={onUndo}
          style={[styles.square, state.history.length === 0 && styles.disabled]}
        >
          <Icon name="corner-up-left" />
        </Pressable>
        <Button
          variant="ink"
          label={t('marking.next')}
          disabled={!ready}
          onPress={onNext}
          style={styles.next}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: 10,
    backgroundColor: Colors.tag,
    borderTopWidth: 1,
    borderTopColor: Colors.hairline,
  },
  tools: { flexDirection: 'row', gap: 6 },
  tool: {
    flex: 1,
    height: 60,
    borderRadius: Radius.tag,
    backgroundColor: Colors.field,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  toolActive: { backgroundColor: Colors.ink },
  toolText: { fontFamily: Fonts.textBold },
  counter: { opacity: 0.75 },
  holdIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3.5,
    backgroundColor: Colors.tag,
    marginVertical: 2,
  },
  topIcon: {
    height: 18,
    paddingHorizontal: 5,
    borderRadius: Radius.small,
    backgroundColor: Colors.ink,
    justifyContent: 'center',
    marginVertical: 2,
  },
  topIconActive: { backgroundColor: Colors.accent },
  topIconText: { fontFamily: Fonts.displayBold, fontSize: 10, lineHeight: 12, color: Colors.tag },
  topIconTextActive: { color: Colors.ink },
  row: { flexDirection: 'row', gap: 6 },
  square: {
    width: 56,
    height: 56,
    borderRadius: Radius.tag,
    backgroundColor: Colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  next: { flex: 1 },
});
