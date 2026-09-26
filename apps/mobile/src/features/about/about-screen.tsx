import type { Grade, ProblemStatus } from '@prolez/shared';
import { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { GradeMark } from '@/components/grade-mark';
import { Icon, type IconName } from '@/components/icon';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { AboutHero } from './about-hero';
import { ForbiddenSwatch, RoleFigure, SpotPin } from './glyphs';
import { LegalMap } from './legal-map';
import { OfflineQueue } from './offline-queue';

const legend: { key: string; symbol: ReactNode }[] = [
  { key: 'spot', symbol: <SpotPin size={50} /> },
  { key: 'project', symbol: <GradeMark grade="6C" status="project" size={50} /> },
  { key: 'unconfirmed', symbol: <GradeMark grade="6B" status="unconfirmed" size={50} /> },
  { key: 'confirmed', symbol: <GradeMark grade="6A" status="confirmed" size={50} /> },
  { key: 'forbidden', symbol: <ForbiddenSwatch /> },
];

const ladder: { status: ProblemStatus; points: number }[] = [
  { status: 'project', points: 0 },
  { status: 'unconfirmed', points: 1 },
  { status: 'confirmed', points: 3 },
];
const LADDER_GRADE: Grade = '6C';

/** «О Пролезе»: что это за карта и по каким правилам она работает (из лендинга, design/02). */
export function AboutScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  // Очередь «синхронизируется», когда её блок доехал до экрана.
  const queueY = useRef<number | null>(null);
  const [queueShown, setQueueShown] = useState(false);
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (queueShown || queueY.current === null) return;
    if (e.nativeEvent.contentOffset.y + height * 0.8 > queueY.current) setQueueShown(true);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: Spacing.six + Spacing.four }}
        onScroll={onScroll}
        testID="about-scroll"
        scrollEventThrottle={100}
      >
        <AboutHero topInset={insets.top} />

        <Section>
          <AppText variant="display" accessibilityRole="header">
            {t('about.claimTitle')}{' '}
            <AppText variant="display" style={styles.marker}>
              {t('about.claimTitleMark')}
            </AppText>
          </AppText>
          <AppText style={styles.body}>{t('about.claimBody')}</AppText>
        </Section>

        <Section>
          <AppText variant="head" accessibilityRole="header">
            {t('about.legendTitle')}
          </AppText>
          <View style={[styles.tag, styles.legend]}>
            {legend.map(({ key, symbol }, i) => (
              <View key={key} style={[styles.legendRow, i > 0 && styles.divider]}>
                <View style={styles.legendSymbol}>{symbol}</View>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{t(`about.legend.${key}.title`)}</AppText>
                  <AppText variant="small" tone="muted" style={styles.legendText}>
                    {t(`about.legend.${key}.text`)}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </Section>

        <Section>
          <AppText variant="display" accessibilityRole="header">
            {t('about.legalTitle')}
          </AppText>
          <AppText style={styles.body}>{t('about.legalBody')}</AppText>
          <View style={[styles.tag, styles.mapCard]}>
            <LegalMap />
            <View style={styles.caption}>
              <ForbiddenSwatch size={22} />
              <AppText variant="small" style={styles.flex}>
                {t('about.legalCaption')}
              </AppText>
            </View>
          </View>
          <View style={styles.zones} accessible accessibilityLabel={t('about.legalZonesA11y')}>
            {(t('about.legalZones', { returnObjects: true }) as string[]).map((zone) => (
              <View key={zone} style={styles.zone}>
                <AppText variant="label">{zone}</AppText>
              </View>
            ))}
          </View>
        </Section>

        <Section>
          <AppText variant="display" accessibilityRole="header">
            {t('about.gradeTitle')}
          </AppText>
          <AppText style={styles.body}>{t('about.gradeBody')}</AppText>
          <View style={styles.ladder}>
            {ladder.map(({ status, points }, i) => (
              <View key={status} style={styles.ladderStep}>
                {i > 0 ? (
                  <View style={styles.arrow}>
                    <Icon name="arrow-right" size={20} color={Colors.ink} />
                  </View>
                ) : null}
                <View style={styles.step}>
                  <GradeMark grade={LADDER_GRADE} status={status} size={84} />
                  {points > 0 ? <Points value={points} /> : <View style={styles.pointsGap} />}
                  <AppText variant="small" style={styles.stepTitle}>
                    {t(`about.ladder.${status}.title`)}
                  </AppText>
                  <AppText variant="label" tone="muted" style={styles.stepNote}>
                    {t(`about.ladder.${status}.note`)}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.votes}>
            <Vote value="+3" text={t('about.voteStrong')} />
            <Vote value="+1" text={t('about.voteWeak')} />
          </View>
          <AppText tone="muted" style={styles.body}>
            {t('about.gradeNote')}
          </AppText>
        </Section>

        <Section
          testID="about-offline"
          onLayout={(y) => {
            queueY.current = y;
          }}
        >
          <AppText variant="display" accessibilityRole="header">
            {t('about.offlineTitle')}
          </AppText>
          <AppText style={styles.body}>{t('about.offlineBody')}</AppText>
          <OfflineQueue active={queueShown} />
          <View style={styles.facts}>
            <Fact icon="map" text={t('about.offlineMap')} />
            <Fact icon="refresh-cw" text={t('about.offlineSync')} />
          </View>
        </Section>

        <Section>
          <AppText variant="display" accessibilityRole="header">
            {t('about.rolesTitle')}
          </AppText>
          <View style={styles.roles}>
            {(t('about.roles', { returnObjects: true }) as string[]).map((role, i) => (
              <View key={role} style={styles.role}>
                <RoleFigure index={i} />
                <AppText style={styles.roleText} numberOfLines={1} adjustsFontSizeToFit>
                  {role}
                </AppText>
              </View>
            ))}
          </View>
          <AppText style={styles.body}>{t('about.rolesNote')}</AppText>
        </Section>
      </ScrollView>
      {/* Подложка под статус-бар: прокрученный текст не лезет под часы. */}
      <View style={[styles.statusBar, { height: insets.top }]} />
    </View>
  );
}

function Section({
  children,
  onLayout,
  testID,
}: {
  children: ReactNode;
  onLayout?: (y: number) => void;
  testID?: string;
}) {
  return (
    <View
      testID={testID}
      style={styles.section}
      onLayout={onLayout ? (e) => onLayout(e.nativeEvent.layout.y) : undefined}
    >
      {children}
    </View>
  );
}

/** Очки подтверждения: три деления, закрашено столько, сколько набрано. */
function Points({ value }: { value: number }) {
  const { t } = useTranslation();
  return (
    <View style={styles.points} accessible accessibilityLabel={t('about.pointsA11y', { value })}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.point, i < value && styles.pointOn]} />
      ))}
    </View>
  );
}

function Vote({ value, text }: { value: string; text: string }) {
  return (
    <View style={[styles.tag, styles.vote]}>
      <AppText style={styles.voteValue}>{value}</AppText>
      <AppText variant="small" style={styles.voteText}>
        {text}
      </AppText>
    </View>
  );
}

function Fact({ icon, text }: { icon: IconName; text: string }) {
  return (
    <View style={styles.fact}>
      <Icon name={icon} size={22} color={Colors.ink} />
      <AppText style={styles.flex}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.ground },
  flex: { flex: 1 },
  statusBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: Colors.ground },
  section: { paddingTop: 56, paddingHorizontal: Spacing.four },
  body: { marginTop: 14 },
  marker: { backgroundColor: Colors.accent },
  tag: { borderRadius: Radius.tag, backgroundColor: Colors.tag },

  legend: { marginTop: Spacing.five, paddingVertical: 6, paddingHorizontal: Spacing.four },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  divider: { borderTopWidth: 1, borderTopColor: Colors.hairline },
  legendSymbol: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  legendText: { marginTop: 2 },

  mapCard: { marginTop: Spacing.five, padding: Spacing.two },
  caption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingBottom: 6,
  },
  zones: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  zone: {
    height: 30,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: Radius.small,
    borderWidth: 1.5,
    borderColor: Colors.forbidden,
    backgroundColor: 'rgba(255, 61, 168, 0.16)',
  },

  ladder: { flexDirection: 'row', marginTop: Spacing.five },
  ladderStep: { flex: 1, flexDirection: 'row' },
  arrow: { width: 22, marginLeft: -11, marginRight: -11, paddingTop: 32, alignItems: 'center' },
  step: { flex: 1, alignItems: 'center', gap: 10 },
  stepTitle: { fontFamily: Fonts.textBold, textAlign: 'center' },
  stepNote: { fontFamily: Fonts.text, textAlign: 'center', marginTop: -8 },
  points: { flexDirection: 'row', gap: 3 },
  pointsGap: { height: 6 },
  point: { width: 12, height: 6, borderRadius: 1, backgroundColor: 'rgba(26, 28, 27, 0.16)' },
  pointOn: { backgroundColor: Colors.ink },

  votes: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.five },
  vote: { flex: 1, padding: 14 },
  voteValue: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 36, letterSpacing: -1 },
  voteText: { marginTop: Spacing.two },

  facts: { marginTop: 14, gap: Spacing.two },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },

  roles: {
    flexDirection: 'row',
    marginTop: Spacing.five,
    marginHorizontal: -Spacing.four,
    backgroundColor: Colors.field,
  },
  role: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    paddingTop: 26,
    paddingBottom: 22,
    paddingHorizontal: Spacing.one,
  },
  roleText: {
    fontFamily: Fonts.displayBold,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});
