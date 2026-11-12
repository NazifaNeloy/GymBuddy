import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResponsive } from '../../hooks/useResponsive';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Base screen container: safe areas, keyboard avoidance, theme background,
 * responsive gutters and a centered max-width column ("form" or "content").
 */
export function Screen({ children, scroll = true, width = 'content', center = false, testID, style }) {
  const theme = useTheme();
  const { gutter } = useResponsive();
  const maxWidth = width === 'form' ? theme.layout.formMaxWidth : theme.layout.contentMaxWidth;

  const column = (
    <View style={[styles.column, { maxWidth, paddingHorizontal: gutter }, style]}>{children}</View>
  );

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: theme.colors.background }]} testID={testID}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingVertical: theme.spacing.xl },
              center && styles.center,
            ]}
            keyboardShouldPersistTaps="handled"
          >
            {column}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.scrollContent, center && styles.center]}>{column}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  center: { justifyContent: 'center' },
  column: { width: '100%' },
});
