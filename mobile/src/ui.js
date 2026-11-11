// Shared building blocks for every screen: theme, layout, form controls, data loading.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { api, assetUrl } from './api';
import { initials } from './format';

export const colors = {
  blue: '#2266ED',
  blueDark: '#1a4fc0',
  blueLight: '#e3ecfd',
  blueSoft: '#f2f6ff',
  charcoal: '#1f2430',
  soft: '#3d4454',
  muted: '#6b7385',
  faint: '#9aa1b1',
  border: '#e3e7ef',
  bg: '#f5f7fb',
  white: '#ffffff',
  red: '#c0392b',
  green: '#1d7a46',
  gold: '#9a6b14',
};

const TONES = {
  blue: { bg: colors.blueLight, fg: colors.blueDark },
  green: { bg: '#e6f6ec', fg: colors.green },
  gold: { bg: '#fdf3dd', fg: colors.gold },
  red: { bg: '#fdeaea', fg: colors.red },
  gray: { bg: '#eef0f5', fg: colors.muted },
};

/**
 * Loads `path` from the API, again whenever the screen comes back into focus, and
 * optionally on a timer while it is focused (the prototype's stand-in for real-time updates).
 * Pass null to skip.
 */
export function useApi(path, { pollMs = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(path) });
  const [refreshing, setRefreshing] = useState(false);
  const latest = useRef(0);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!path) return;
      const ticket = ++latest.current;
      if (!quiet) setState((s) => ({ ...s, loading: true }));
      try {
        const data = await api.get(path);
        if (ticket === latest.current) setState({ data, error: null, loading: false });
      } catch (error) {
        // A failed background refresh keeps showing the last good data.
        if (ticket === latest.current) setState((s) => (quiet && s.data ? s : { data: null, error, loading: false }));
      }
    },
    [path]
  );

  useEffect(() => {
    if (!path) setState({ data: null, error: null, loading: false });
  }, [path]);

  useFocusEffect(
    useCallback(() => {
      if (!path) return undefined;
      load({ quiet: true });
      if (!pollMs) return undefined;
      const timer = setInterval(() => load({ quiet: true }), pollMs);
      return () => clearInterval(timer);
    }, [path, pollMs, load])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load({ quiet: true });
    setRefreshing(false);
  }, [load]);

  return { ...state, reload: () => load({ quiet: true }), refreshing, refresh };
}

/** Scrolling page with pull-to-refresh. Pass the result of useApi as `source` to wire refresh up. */
export function Screen({ children, source, scroll = true, style }) {
  if (!scroll) return <View style={[styles.screen, styles.pad, style]}>{children}</View>;
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.pad, style]}
      keyboardShouldPersistTaps="handled"
      refreshControl={source ? <RefreshControl refreshing={source.refreshing} onRefresh={source.refresh} tintColor={colors.blue} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, onPress, style, label }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }, style]}>
      {children}
    </Pressable>
  );
}

export function Btn({ title, onPress, variant = 'primary', disabled, small, style }) {
  const palette = {
    primary: { bg: colors.blue, fg: colors.white, border: colors.blue },
    outline: { bg: colors.white, fg: colors.blue, border: colors.blue },
    ghost: { bg: 'transparent', fg: colors.muted, border: colors.border },
    danger: { bg: colors.red, fg: colors.white, border: colors.red },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={({ pressed }) => [
        styles.btn,
        small && styles.btnSmall,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      <Text style={[styles.btnText, small && { fontSize: 13 }, { color: palette.fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Badge({ children, tone = 'blue', style }) {
  const t = TONES[tone] || TONES.gray;
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

/** Labelled text input. `hint` shows under the field (character counts, format help). */
export function Field({ label, hint, multiline, style, ...props }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.faint}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
        {...props}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Single-choice picker shown as a wrapping row of chips. `options` is [{ value, label }]. */
export function ChipSelect({ label, options, value, onChange }) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              aria-checked={selected}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && { color: colors.white }]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Avatar({ name, src, size = 48 }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (src) return <Image source={{ uri: assetUrl(src) }} style={[box, { backgroundColor: colors.blueLight }]} accessibilityIgnoresInvertColors />;
  return (
    <View style={[box, styles.avatar]}>
      <Text style={{ color: colors.blueDark, fontWeight: '800', fontSize: size * 0.36 }}>{initials(name)}</Text>
    </View>
  );
}

export const Loading = ({ label = 'Loading…' }) => (
  <View style={styles.centerBox}>
    <ActivityIndicator color={colors.blue} />
    <Text style={styles.mutedText}>{label}</Text>
  </View>
);

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Text style={styles.errorText}>{error.message || String(error)}</Text>
      {onRetry ? <Text onPress={onRetry} style={[styles.errorText, { textDecorationLine: 'underline', marginTop: 4 }]}>Try again</Text> : null}
    </View>
  );
}

export const Empty = ({ title, desc }) => (
  <View style={styles.centerBox}>
    <Text style={{ fontSize: 16, fontWeight: '700', color: colors.soft }}>{title}</Text>
    {desc ? <Text style={[styles.mutedText, { textAlign: 'center' }]}>{desc}</Text> : null}
  </View>
);

export const Row = ({ children, style }) => <View style={[styles.row, style]}>{children}</View>;
export const Title = ({ children, style, ...props }) => <Text accessibilityRole="header" style={[styles.title, style]} {...props}>{children}</Text>;
export const Muted = ({ children, style, ...props }) => <Text style={[styles.mutedText, style]} {...props}>{children}</Text>;
export const Body = ({ children, style, ...props }) => <Text style={[styles.body, style]} {...props}>{children}</Text>;

/** Chat bubbles for a message thread. `meId` decides which side each message sits on. */
export function Bubbles({ messages, meId, formatTime }) {
  return (
    <View style={{ gap: 8 }}>
      {messages.map((m) => {
        const mine = m.senderId === meId;
        return (
          <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
            <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={{ color: mine ? colors.white : colors.charcoal, fontSize: 15 }}>{m.content}</Text>
            </View>
            <Text style={[styles.hint, { textAlign: mine ? 'right' : 'left' }]}>{formatTime(m.sentAt)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  btn: { minHeight: 48, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { minHeight: 40, paddingHorizontal: 14 },
  btnText: { fontSize: 15, fontWeight: '700' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  label: { fontSize: 13, fontWeight: '700', color: colors.soft, marginBottom: 6 },
  hint: { fontSize: 11, color: colors.faint, marginTop: 4 },
  input: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.charcoal },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white },
  chipOn: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.soft },
  avatar: { backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  centerBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36, gap: 8 },
  mutedText: { fontSize: 13, color: colors.muted },
  body: { fontSize: 15, color: colors.soft, lineHeight: 22 },
  title: { fontSize: 17, fontWeight: '800', color: colors.charcoal },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  error: { backgroundColor: '#fdeaea', borderColor: '#f0c4c4', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  errorText: { color: colors.red, fontSize: 13, fontWeight: '600' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleMine: { backgroundColor: colors.blue, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 4 },
});
