import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

const THUMB_SIZE = 24;
const TRACK_HEIGHT = 4;
const HIT_HEIGHT = 44;

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
  /** Two-sided sliders (left/right labels) — taller, brighter fill rail. */
  bilateral?: boolean;
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
  bilateral = false,
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

  const displayValue = dragValue ?? value;
  const ratio = (displayValue - min) / (max - min);
  const thumbTravel = Math.max(0, trackWidth - THUMB_SIZE);
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
      if (width <= THUMB_SIZE) return null;
      const localX = pageX - trackOriginXRef.current;
      const usable = width - THUMB_SIZE;
      const t = clamp((localX - THUMB_SIZE / 2) / usable, 0, 1);
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

  const railHeight = TRACK_HEIGHT;

  return (
    <View
      style={[styles.wrap, compact && styles.wrapCompact]}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min,
        max,
        now: displayValue,
      }}
    >
      <View
        ref={hitAreaRef}
        style={styles.hitArea}
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
              backgroundColor: accent,
              borderColor: border,
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
  hitArea: {
    height: HIT_HEIGHT,
    justifyContent: 'center',
  },
  trackRail: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginHorizontal: THUMB_SIZE / 2,
  },
  fill: {
    height: '100%',
  },
  thumb: {
    position: 'absolute',
    top: (HIT_HEIGHT - THUMB_SIZE) / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
});
