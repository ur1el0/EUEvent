import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts } from '../../theme';

export function ClearManifestsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={styles.clearCacheButton}>
      <Text style={styles.clearCacheText}>Clear saved offline manifests</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  clearCacheButton: { alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 9, marginTop: 4 },
  clearCacheText: { color: colors.muted, fontFamily: fonts.bodyStrong, fontSize: 10 },
});
