import { useTranslation } from 'react-i18next';

import { ComingSoon } from '@/components/coming-soon';

/** Профиль собирает вход, роли, уровень и историю пролазов — отдельной вкладки у пролазов нет. */
export default function ProfileScreen() {
  const { t } = useTranslation();
  return (
    <ComingSoon
      title={t('soon.profile.title')}
      lead={t('soon.profile.lead')}
      sections={[
        { icon: 'user', points: t('soon.profile.points', { returnObjects: true }) as string[] },
        {
          icon: 'check-circle',
          title: t('soon.ascents.title'),
          points: t('soon.ascents.points', { returnObjects: true }) as string[],
        },
      ]}
    />
  );
}
