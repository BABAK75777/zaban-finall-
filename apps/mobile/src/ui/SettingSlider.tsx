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
}: SettingSliderProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const [dragValue, setDragValue] = useState<number | null>(null);
  const trackWidthRef = useRef(0);
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

  const valueFromX = useCallback(
    (x: number): number | null => {
      const width = trackWidthRef.current;
      if (width <= THUMB_SIZE) return null;
      const usable = width - THUMB_SIZE;
      const t = clamp((x - THUMB_SIZE / 2) / usable, 0, 1);
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

  const updateFromX = useCallback(
    (x: number, live: boolean) => {
      const next = valueFromX(x);
      if (next == null) return;
      emitValue(next, live);
    },
    [valueFromX, emitValue]
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
          updateFromX(evt.nativeEvent.locationX, true);
        },
        onPanResponderMove: (evt) => {
          updateFromX(evt.nativeEvent.locationX, true);
        },
        onPanResponderRelease: endDrag,
        onPanResponderTerminate: endDrag,
      }),
    [updateFromX, beginDrag, endDrag]
  );

  return (
    <View
      style={styles.wrap}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min,
        max,
        now: displayValue,
      }}
    >
      <View
        style={styles.hitArea}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          trackWidthRef.current = w;
          setTrackWidth(w);
        }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.trackRail, { backgroundColor: track, borderColor: border }]}>
          <View
            style={[
              styles.fill,
              {
                width: `${ratio * 100}%`,
                backgroundColor: accent,
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
  hitArea: {
    height: HIT_HEIGHT,
    justifyContent: 'center',
  },
  trackRail: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginHorizontal: THUMB_SIZE / 2,
  },
  fill: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
    opacity: 0.9,
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
