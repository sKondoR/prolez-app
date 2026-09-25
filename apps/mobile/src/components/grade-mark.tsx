import type { Grade, ProblemStatus } from '@prolez/shared';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Colors } from '@/constants/theme';

/**
 * Метка категории. Статус кодируется формой, а не только цветом:
 * проект — пунктирное кольцо, неподтверждённая — сплошное кольцо, подтверждённая — лаймовый круг.
 */
export function GradeMark({
  grade,
  status,
  size = 60,
}: {
  grade: Grade;
  status: ProblemStatus;
  size?: number;
}) {
  return (
    <View
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size / 2 },
        status === 'project' && styles.project,
        status === 'unconfirmed' && styles.unconfirmed,
        status === 'confirmed' && styles.confirmed,
      ]}
    >
      <AppText variant="grade" style={{ fontSize: size * 0.36, lineHeight: size * 0.42 }}>
        {grade}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center' },
  project: { borderWidth: 3, borderStyle: 'dashed', borderColor: Colors.ink },
  unconfirmed: { borderWidth: 3, borderColor: Colors.ink },
  confirmed: { backgroundColor: Colors.accent },
});
