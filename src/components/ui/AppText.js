import { Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

/** Text that uses theme typography and colors. variant: display|title|heading|body|label|caption */
export function AppText({ variant = 'body', color = 'text', align, style, children, ...rest }) {
  const theme = useTheme();
  return (
    <Text
      style={[theme.typography[variant], { color: theme.colors[color] ?? theme.colors.text, textAlign: align }, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
