import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 4;
const HIT_HEIGHT = 44;
const THUMB_SIZE_MICRO = 12;
const TRACK_HEIGHT_MICRO = 2;
const HIT_HEIGHT_MICRO = 28;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function snapToStep(value: number, min: number, max: number, step: number): number {
  const snapped = min + Math.round((value - min) / step) * step;
  const fixed = parseFloat(snapped.toFixed(2));
  return clamp(fixed, min, max);
}

export interface SettingSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  accent: string;
  border: string;
  track: string;
  /** Tighter vertical spacing for stacked slider rows (e.g. AI modal). */
  compact?: boolean;
  /** Minimal track/thumb for settings panel rows. */
  micro?: boolean;
  /** Two-sided sliders (left/right labels) — taller, brighter fill rail. */
  bilateral?: boolean;
  /** Stable id for automation (hit target). */
  testID?: string;
}

export function SettingSlider({
  value,
  min,
  max,
  step,
  onChange,
  onDragStart,
  onDragEnd,
  accent,
  border,
  track,
  compact = false,
  micro = false,
  bilateral = false,
  testID,
}: SettingSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const hitAreaRef = useRef<View>(null);
  const trackWidthRef = useRef(0);
  const trackOriginXRef = useRef(0);
  const lastEmittedRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onDragStartRef = useRef(onDragStart);
  const onDragEndRef = useRef(onDragEnd);
  onChangeRef.current = onChange;
  onDragStartRef.current = onDragStart;
  onDragEndRef.current = onDragEnd;

  useEffect(() => {
    lastEmittedRef.current = value;
  }, [value]);

  const thumbSize = micro ? THUMB_SIZE_MICRO : THUMB_SIZE;
  const trackHeight = micro ? TRACK_HEIGHT_MICRO : TRACK_HEIGHT;
  const hitHeight = micro ? HIT_HEIGHT_MICRO : HIT_HEIGHT;
  const thumbSizeRef = useRef(thumbSize);
  thumbSizeRef.current = thumbSize;

  const displayValue = dragValue ?? value;
  const ratio = (displayValue - min) / (max - min);
  const thumbTravel = Math.max(0, trackWidth - thumbSize);
  const thumbLeft = thumbTravel * ratio;

  const syncTrackMetrics = useCallback((callback?: () => void) => {
    hitAreaRef.current?.measureInWindow((x, _y, width) => {
      trackOriginXRef.current = x;
      trackWidthRef.current = width;
      setTrackWidth(width);
      callback?.();
    });
  }, []);

  const valueFromPageX = useCallback(
    (pageX: number): number | null => {
      const width = trackWidthRef.current;
      const thumb = thumbSizeRef.current;
      if (width <= thumb) return null;
      const localX = pageX - trackOriginXRef.current;
      const usable = width - thumb;
      const t = clamp((localX - thumb / 2) / usable, 0, 1);
      return snapToStep(min + t * (max - min), min, max, step);
    },
    [min, max, step]
  );

  const emitValue = useCallback((next: number, live: boolean) => {
    setDragValue(live ? next : null);
    if (next !== lastEmittedRef.current) {
      lastEmittedRef.current = next;
      onChangeRef.current(next);
    }
  }, []);

  const updateFromPageX = useCallback(
    (pageX: number, live: boolean) => {
      const next = valueFromPageX(pageX);
      if (next == null) return;
      emitValue(next, live);
    },
    [valueFromPageX, emitValue]
  );

  const beginDrag = useCallback(() => {
    onDragStartRef.current?.();
  }, []);

  const endDrag = useCallback(() => {
    setDragValue(null);
    onDragEndRef.current?.();
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          beginDrag();
          const pageX = evt.nativeEvent.pageX;
          updateFromPageX(pageX, true);
          syncTrackMetrics(() => {
            updateFromPageX(pageX, true);
          });
        },
        onPanResponderMove: (_evt, gestureState) => {
          updateFromPageX(gestureState.moveX, true);
        },
        onPanResponderRelease: endDrag,
        onPanResponderTerminate: endDrag,
      }),
    [updateFromPageX, beginDrag, endDrag, syncTrackMetrics]
  );

  const railHeight = trackHeight;

  return (
    <View
      style={[styles.wrap, compact && styles.wrapCompact, micro && styles.wrapMicro]}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min,
        max,
        now: displayValue,
      }}
    >
      <View
        ref={hitAreaRef}
        testID={testID}
        style={[styles.hitArea, { height: hitHeight }]}
        onLayout={() => {
          syncTrackMetrics();
        }}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.trackRail,
            {
              height: railHeight,
              borderRadius: railHeight / 2,
              backgroundColor: track,
              borderColor: border,
              marginHorizontal: thumbSize / 2,
            },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                width: `${ratio * 100}%`,
                backgroundColor: accent,
                borderRadius: railHeight / 2,
                opacity: bilateral ? 1 : 0.9,
              },
            ]}
          />
        </View>
        <View
          style={[
            styles.thumb,
            {
              left: thumbLeft,
              top: (hitHeight - thumbSize) / 2,
              width: thumbSize,
              height: thumbSize,
              borderRadius: thumbSize / 2,
              backgroundColor: accent,
              borderColor: border,
              borderWidth: micro ? 1 : 2,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  wrapCompact: {
    marginBottom: 0,
  },
  wrapMicro: {
    marginBottom: 0,
  },
  hitArea: {
    justifyContent: 'center',
  },
  trackRail: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
});
