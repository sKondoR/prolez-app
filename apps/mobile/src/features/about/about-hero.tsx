import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { HandGlyph } from '@/components/mark-glyphs';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { SpotPin } from './glyphs';

// Фото: паркурщик на кирпичной подпорной стенке (Pexels, Mary Taylor). Метаданные удалены,
// насыщенность снижена заранее, как в макете.
const heroPhoto = require('../../../assets/images/about-hero.jpg');

/** Кадр фото в макете 390×446; разметка задана в долях этого кадра. */
const PHOTO_ASPECT = 390 / 446;

/** Первый экран: заголовок, фото стены с разметкой проблемы и категорией. */
export function AboutHero({ topInset }: { topInset: number }) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  // Как clamp(44px, 15vw, 64px) в макете: заголовок заполняет ширину экрана.
  const big = Math.min(64, Math.max(44, width * 0.15));
  const small = Math.min(47, Math.max(32, width * 0.109));

  return (
    <View>
      <View style={[styles.head, { paddingTop: topInset }]}>
        <View style={styles.wordmark}>
          <SpotPin size={26} />
          <AppText style={styles.wordmarkText}>{t('about.wordmark')}</AppText>
        </View>

        <View accessible accessibilityRole="header" accessibilityLabel={t('about.heroA11y')}>
          <AppText
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[styles.hero, { fontSize: big, lineHeight: big * 0.98 }]}
          >
            {t('about.heroLine1')}
          </AppText>
          <View style={styles.swipe}>
            <View style={styles.swipePaint} />
            <AppText
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.hero, { fontSize: big, lineHeight: big * 0.98 }]}
            >
              {t('about.heroLine2')}
            </AppText>
          </View>
          <AppText
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[
              styles.hero,
              { fontSize: small, lineHeight: small * 1.02, letterSpacing: -1.6 },
            ]}
          >
            {t('about.heroLine3')}
          </AppText>
        </View>
      </View>

      <View style={styles.photo}>
        <Image
          source={heroPhoto}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel={t('about.heroPhoto')}
        />
        {/* Разметка проблемы: финиш, зацеп рукой, зацеп */}
        <View style={[styles.top, { left: '22.6%', top: '15.2%' }]}>
          <AppText style={styles.topText}>{t('marking.topShort')}</AppText>
        </View>
        <View style={[styles.hold, styles.handHold, { left: '25.6%', top: '56%' }]}>
          <HandGlyph size={24} color={Colors.ink} />
        </View>
        <View style={[styles.hold, styles.smallHold, { left: '38.5%', top: '89.7%' }]} />

        <View style={styles.gradeTag}>
          <View style={styles.gradePaint} />
          <AppText variant="grade" style={styles.grade}>
            {t('about.heroGrade')}
          </AppText>
          <AppText variant="label">{t('about.heroGradeNote')}</AppText>
        </View>
      </View>

      <AppText style={styles.tagline}>
        {t('about.heroTagline')}{' '}
        <AppText style={styles.taglineStrong}>{t('about.heroTaglineStrong')}</AppText>
      </AppText>
    </View>
  );
}

const HAND = 42;
const SMALL = 24;

const styles = StyleSheet.create({
  head: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, height: 64 },
  wordmarkText: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 24, letterSpacing: -0.4 },
  hero: { fontFamily: Fonts.display, textTransform: 'uppercase', letterSpacing: -2 },
  swipe: {
    alignSelf: 'flex-start',
    marginVertical: 6,
    marginLeft: -6,
    paddingLeft: 8,
    paddingRight: 14,
    paddingTop: 4,
  },
  swipePaint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    transform: [{ rotate: '-2deg' }],
  },
  photo: { width: '100%', aspectRatio: PHOTO_ASPECT, backgroundColor: Colors.concrete },
  top: {
    position: 'absolute',
    width: 50,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.tag,
    borderWidth: 2.5,
    borderColor: Colors.ink,
    backgroundColor: Colors.tag,
  },
  topText: { fontFamily: Fonts.displayBold, fontSize: 13, lineHeight: 16, letterSpacing: 0.4 },
  hold: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Colors.ink,
    backgroundColor: Colors.tag,
  },
  handHold: {
    width: HAND,
    height: HAND,
    borderRadius: HAND / 2,
    marginLeft: -HAND / 2,
    marginTop: -HAND / 2,
  },
  smallHold: {
    width: SMALL,
    height: SMALL,
    borderRadius: SMALL / 2,
    marginLeft: -SMALL / 2,
    marginTop: -SMALL / 2,
  },
  gradeTag: {
    position: 'absolute',
    right: 18,
    top: '12%',
    gap: 2,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 16,
  },
  gradePaint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: Radius.tag,
    backgroundColor: Colors.accent,
    transform: [{ rotate: '1.5deg' }],
  },
  grade: { fontSize: 44, lineHeight: 46 },
  tagline: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, maxWidth: 360 },
  taglineStrong: { fontFamily: Fonts.textBold },
});
