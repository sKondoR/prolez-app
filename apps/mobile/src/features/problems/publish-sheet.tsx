import { type Grade, compareGrades, grades, publicationCeiling } from '@prolez/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Sheet } from '@/components/sheet';
import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/theme';

// Пока нет входа, уровня у пользователя нет: потолок — стартовый для боулдеринга.
// Трудность под вопросом (легальных спотов почти нет), поэтому новая проблема — боулдеринг.
const CEILING = publicationCeiling('boulder', undefined);
const choices = grades.filter((g) => compareGrades(g, CEILING) <= 0);

/** Лист «Новая проблема»: название и категория не выше потолка публикации. */
export function PublishSheet({
  open,
  defaultName,
  onClose,
  onSave,
}: {
  open: boolean;
  defaultName: string;
  onClose: () => void;
  onSave: (input: { name: string; grade: Grade }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<Grade | undefined>();
  const [focused, setFocused] = useState(false);

  const save = () => {
    if (!grade) return;
    onSave({ name: name.trim() || defaultName, grade });
    setName('');
    setGrade(undefined);
  };

  return (
    <Sheet open={open} onClose={onClose} label={t('marking.closeSheet')}>
      <AppText variant="head" accessibilityRole="header">
        {t('marking.publishTitle')}
      </AppText>

      <AppText variant="label" tone="muted" style={styles.label}>
        {t('marking.name')}
      </AppText>
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <TextInput
          value={name}
          onChangeText={setName}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t('marking.namePlaceholder', { name: defaultName })}
          placeholderTextColor={Colors.ink2}
          maxLength={40}
          cursorColor={Colors.ink}
          selectionColor={Colors.accent}
          accessibilityLabel={t('marking.name')}
          style={styles.input}
        />
      </View>

      <AppText variant="label" tone="muted" style={styles.label}>
        {t('marking.gradeUpTo', { grade: CEILING })}
      </AppText>
      <View style={styles.grades} accessibilityRole="radiogroup">
        {choices.map((g) => {
          const on = g === grade;
          return (
            <Pressable
              key={g}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setGrade(g)}
              style={[styles.grade, on && styles.gradeOn]}
            >
              <AppText variant="grade" style={[styles.gradeText, on && styles.gradeTextOn]}>
                {g}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.note}>
        <AppText variant="small">{t('marking.projectNote', { grade: grade ?? '…' })}</AppText>
      </View>

      <Button label={t('marking.saveDraft')} disabled={!grade} onPress={save} style={styles.save} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 18, marginBottom: Spacing.two },
  field: {
    height: 52,
    paddingHorizontal: 14,
    borderRadius: Radius.tag,
    backgroundColor: Colors.field,
    borderWidth: 2.5,
    borderColor: 'transparent',
    justifyContent: 'center',
  },
  fieldFocused: { borderColor: Colors.ink },
  input: { fontFamily: Fonts.text, fontSize: 16, color: Colors.ink, padding: 0 },
  grades: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  grade: {
    // 5 колонок: (ширина − 4 зазора по 6) / 5.
    width: '18.5%',
    height: 48,
    borderRadius: Radius.tag,
    backgroundColor: Colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeOn: { backgroundColor: Colors.ink },
  gradeText: { ...Type.grade, fontSize: 18, lineHeight: 22 },
  gradeTextOn: { color: Colors.tag },
  note: {
    marginTop: Spacing.four,
    padding: 14,
    paddingVertical: Spacing.three,
    borderRadius: Radius.tag,
    backgroundColor: Colors.field,
  },
  save: { marginTop: Spacing.four },
});
