import { View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { plural } from '../../utils/format';
import { AppText } from '../ui/AppText';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';

export function RoutineCard({ routine, exerciseCount, isTemplate = false, onPress, style }) {
  const theme = useTheme();
  const days = routine.days ?? [];
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${routine.name}, ${plural(days.length, 'day')}, ${plural(exerciseCount, 'exercise')}${
        isTemplate ? ', starter routine' : ''
      }`}
      accessibilityHint={isTemplate ? 'Opens a preview you can copy' : 'Opens the routine builder'}
      testID={`routine-card-${routine.id}`}
      style={style}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="heading" numberOfLines={1} style={{ flex: 1 }}>
          {routine.name}
        </AppText>
        {isTemplate ? <Chip label="Starter" style={{ marginBottom: 0, marginRight: 0, minHeight: 28 }} /> : null}
      </View>
      <AppText variant="label" color="primary" style={{ marginTop: theme.spacing.xs }} numberOfLines={1}>
        {days.join(' · ')}
      </AppText>
      <AppText variant="caption" color="textMuted" style={{ marginTop: theme.spacing.xxs }}>
        {plural(days.length, 'day')} · {plural(exerciseCount, 'exercise')}
      </AppText>
      {routine.description ? (
        <AppText variant="caption" color="textMuted" numberOfLines={2} style={{ marginTop: theme.spacing.xs }}>
          {routine.description}
        </AppText>
      ) : null}
    </Card>
  );
}
