import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { glassStyle } from '../theme/glass';
import type { ThemePalette } from '../theme/themeTypes';
import { READING_TEST_IDS } from './testIds';
import { space } from './spacing';

type Props = {
  visible: boolean;
  theme: ThemePalette;
  message: string;
  updateUrl: string | null;
  onClose: () => void;
  onUpdate: (url: string) => void;
};

export function UpdateAvailableModal({
  visible,
  theme,
  message,
  updateUrl,
  onClose,
  onUpdate,
}: Props) {
  const colors = theme;
  const canUpdate = Boolean(updateUrl);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            glassStyle(theme, true),
            { backgroundColor: colors.bg, borderColor: colors.border },
          ]}
          testID={READING_TEST_IDS.updateModal}
        >
          <Pressable
            onPress={onClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close"
            testID={READING_TEST_IDS.updateModalClose}
            style={({ pressed }) => [
              styles.closeBtn,
              { borderColor: colors.border },
              pressed && { opacity: 0.88 },
            ]}
          >
            <Text style={[styles.closeLabel, { color: colors.text }]}>✕</Text>
          </Pressable>

          <Text style={[styles.title, { color: colors.text }]}>New version available</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>

          <Pressable
            disabled={!canUpdate}
            onPress={() => {
              if (updateUrl) {
                onUpdate(updateUrl);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Update"
            testID={READING_TEST_IDS.updateModalUpdate}
            style={({ pressed }) => [
              styles.updateBtn,
              { backgroundColor: colors.accent },
              !canUpdate && styles.updateBtnDisabled,
              pressed && canUpdate && { opacity: 0.9 },
            ]}
          >
            <Text style={[styles.updateLabel, { color: colors.selection.text }]}>
              {canUpdate ? 'Update' : 'Update link not available'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: space.lg,
    paddingTop: space.xl,
  },
  closeBtn: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: space.sm,
    paddingRight: space.xl,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: space.lg,
  },
  updateBtn: {
    borderRadius: 12,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  updateBtnDisabled: {
    opacity: 0.55,
  },
  updateLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
