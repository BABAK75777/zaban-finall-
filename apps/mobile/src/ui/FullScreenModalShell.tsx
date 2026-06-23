import React, { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { glassStyle } from '../theme/glass';
import type { ThemePalette } from '../theme/themeTypes';
import { space } from './spacing';

const CLOSE_SIZE = 44;

type Props = {
  visible: boolean;
  onClose: () => void;
  theme: ThemePalette;
  title: string;
  children: ReactNode;
  testID?: string;
  closeTestID?: string;
  dismissTestID?: string;
  keyboardAvoiding?: boolean;
};

export function FullScreenModalShell({
  visible,
  onClose,
  theme,
  title,
  children,
  testID,
  closeTestID,
  dismissTestID,
  keyboardAvoiding = false,
}: Props) {
  const colors = theme;

  const body = (
    <>
      <View style={styles.header}>
        <View style={styles.headerCenter}>
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close"
          testID={closeTestID}
          style={({ pressed }) => [
            styles.closeBtn,
            glassStyle(theme, true),
            { borderColor: colors.border },
            pressed && { opacity: 0.88 },
          ]}
        >
          <Text style={[styles.closeBtnLabel, { color: colors.text }]}>✕</Text>
        </Pressable>
      </View>
      {children}
    </>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.backdrop}>
        <Pressable
          style={styles.dismissArea}
          onPress={onClose}
          accessibilityLabel="Dismiss"
          testID={dismissTestID}
        />
        <View
          style={[styles.panel, { backgroundColor: colors.bg, borderColor: colors.border }]}
          testID={testID}
        >
          <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
            {keyboardAvoiding ? (
              <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
                {body}
              </KeyboardAvoidingView>
            ) : (
              <View style={styles.flex}>{body}</View>
            )}
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  panel: {
    ...StyleSheet.absoluteFillObject,
    top: 48,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
    paddingHorizontal: space.lg,
  },
  header: {
    position: 'relative',
    paddingTop: space.sm,
    paddingBottom: space.md,
    zIndex: 2,
    minHeight: CLOSE_SIZE + space.sm,
  },
  headerCenter: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: CLOSE_SIZE + space.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: space.md,
    opacity: 0.55,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
    alignSelf: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: space.sm,
    right: 0,
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    borderRadius: CLOSE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnLabel: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
});
