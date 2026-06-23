import React from 'react';

import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { glassStyle } from '../theme/glass';

import type { ThemePalette } from '../theme/themeTypes';

import { useResponsiveLayoutMetrics } from './responsiveLayout';

import { controlSizes, space } from './spacing';

import { READING_TEST_IDS } from './testIds';



interface TopAmbientBarProps {

  theme: ThemePalette;

  onMenuPress: () => void;

  onAlbumPress?: () => void;

  onCameraPress?: () => void;

  photoLoading?: boolean;

}



export function TopAmbientBar({

  theme,

  onMenuPress,

  onAlbumPress,

  onCameraPress,

  photoLoading = false,

}: TopAmbientBarProps) {

  const layout = useResponsiveLayoutMetrics();

  const showPhotoActions = onAlbumPress != null || onCameraPress != null;



  return (

    <View style={[styles.wrap, { paddingHorizontal: layout.topBarPadH }]}>

      <Pressable

        style={({ pressed }) => [

          styles.iconBtn,

          glassStyle(theme),

          pressed && { opacity: 0.88 },

        ]}

        onPress={onMenuPress}

        hitSlop={14}

        accessibilityRole="button"

        accessibilityLabel="Menu"

        testID={READING_TEST_IDS.menu}

      >

        <Text style={[styles.menuDots, { color: theme.textMuted }]}>⋯</Text>

      </Pressable>



      {showPhotoActions ? (

        <View style={styles.photoActions}>

          {onAlbumPress ? (

            <Pressable

              style={({ pressed }) => [

                styles.iconBtn,

                glassStyle(theme),

                pressed && { opacity: 0.88 },

                photoLoading && { opacity: 0.6 },

              ]}

              onPress={onAlbumPress}

              disabled={photoLoading}

              hitSlop={10}

              accessibilityRole="button"

              accessibilityLabel="Choose photo from album"

              testID={READING_TEST_IDS.topAlbum}

            >

              <Text style={styles.actionIcon}>🖼️</Text>

            </Pressable>

          ) : null}

          {onCameraPress ? (

            <Pressable

              style={({ pressed }) => [

                styles.iconBtn,

                glassStyle(theme),

                pressed && { opacity: 0.88 },

                photoLoading && { opacity: 0.6 },

              ]}

              onPress={onCameraPress}

              disabled={photoLoading}

              hitSlop={10}

              accessibilityRole="button"

              accessibilityLabel="Take photo with camera"

              testID={READING_TEST_IDS.topCamera}

            >

              {photoLoading ? (

                <ActivityIndicator size="small" color={theme.accent} />

              ) : (

                <Text style={styles.actionIcon}>📷</Text>

              )}

            </Pressable>

          ) : null}

        </View>

      ) : null}

    </View>

  );

}



const styles = StyleSheet.create({

  wrap: {

    flexDirection: 'row',

    alignItems: 'flex-start',

    justifyContent: 'space-between',

    paddingTop: space.xs,

    paddingBottom: space.xs,

    zIndex: 10,

  },

  photoActions: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: space.sm,

  },

  iconBtn: {

    width: controlSizes.topIcon,

    height: controlSizes.topIcon,

    borderRadius: controlSizes.topIcon / 2,

    alignItems: 'center',

    justifyContent: 'center',

  },

  menuDots: { fontSize: 22, fontWeight: '600', marginTop: -4 },

  actionIcon: { fontSize: 18 },

});

