import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/coming-soon';

export default function ChallengesScreen() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      title={t('soon.challenges.title')}
      lead={t('soon.challenges.lead')}
      sections={[
        { icon: 'award', points: t('soon.challenges.points', { returnObjects: true }) as string[] },
      ]}
    />
  );
}
