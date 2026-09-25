import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { palette, withAlpha } from "./theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const { height: SCREEN_H } = Dimensions.get("window");

/* ---------- motion primitives ---------- */

/** Fade-and-rise, staggered by index — the same entrance the web console uses. */
export function useEntrance(index = 0, distance = 14) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay: index * 55,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);
  return {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}

export function Rise({ index = 0, style, children }: { index?: number; style?: ViewStyle; children: ReactNode }) {
  const entrance = useEntrance(index);
  return <Animated.View style={[entrance, style]}>{children}</Animated.View>;
}

/** Spring press-scale — the tactile cue that something is tappable. */
export function Tap({
  onPress, children, style, scaleTo = 0.97, disabled,
}: {
  onPress?: () => void; children: ReactNode; style?: ViewStyle; scaleTo?: number; disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, damping: 15, stiffness: 320 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        onPressIn={() => to(scaleTo)}
        onPressOut={() => to(1)}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Counts up on mount and whenever the value changes. Never gated on scroll. */
export function CountUp({
  value, format = (v) => String(Math.round(v)), style, duration = 1000,
}: {
  value: number; format?: (v: number) => string; style?: object; duration?: number;
}) {
  const mv = useRef(new Animated.Value(0)).current;
  const [text, setText] = useState(format(0));

  useEffect(() => {
    const id = mv.addListener(({ value: v }) => setText(format(v)));
    Animated.timing(mv, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => mv.removeListener(id);
  }, [value]);

  return <Text style={style}>{text}</Text>;
}

/* ---------- ring gauge ---------- */

export function Ring({
  value, size = 120, stroke = 10, color = palette.brand, children, delay = 120,
}: {
  value: number; size?: number; stroke?: number; color?: string; children?: ReactNode; delay?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value));
  const anim = useRef(new Animated.Value(c)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: c * (1 - pct),
      duration: 1100,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [pct, c]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={palette.baseline} strokeWidth={stroke} fill="none" opacity={0.6} />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={anim as unknown as number}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>{children}</View>
      </View>
    </View>
  );
}

/** Concentric rings — the "today's pulse" gauge from the web dashboard. */
export function RingStack({ rings, size = 146 }: { rings: { value: number; color: string }[]; size?: number }) {
  const stroke = 9, gap = 5;
  return (
    <View style={{ width: size, height: size }}>
      {rings.map((ring, i) => {
        const inset = i * (stroke + gap);
        return (
          <View key={i} style={{ position: "absolute", top: inset / 2, left: inset / 2 }}>
            <Ring value={ring.value} size={size - inset} stroke={stroke} color={ring.color} delay={140 + i * 130} />
          </View>
        );
      })}
    </View>
  );
}

/* ---------- bars ---------- */

export function Bar({
  value, color = palette.brand, height = 6, delay = 180,
}: { value: number; color?: string; height?: number; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(0, Math.min(1, value)),
      duration: 900, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [value]);

  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: palette.baseline, overflow: "hidden" }}>
      <Animated.View
        style={{
          height: "100%", borderRadius: height / 2, backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
        }}
      />
    </View>
  );
}

/* ---------- surfaces ---------- */

export function Card({ children, style, tone = "default" }: { children: ReactNode; style?: ViewStyle; tone?: "default" | "hero" }) {
  return (
    <View
      style={[
        {
          backgroundColor: tone === "hero" ? "#191111" : palette.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: tone === "hero" ? withAlpha(palette.brand, 0.3) : palette.hairline,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Pill({ label, tone = "muted" }: { label: string; tone?: "brand" | "good" | "warning" | "critical" | "muted" }) {
  const color =
    tone === "brand" ? palette.brand
    : tone === "good" ? palette.statusGood
    : tone === "warning" ? palette.statusWarning
    : tone === "critical" ? palette.statusCritical
    : palette.inkMuted;
  return (
    <View style={{ alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: withAlpha(color, 0.14) }}>
      <Text style={{ color, fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </View>
  );
}

export function Avatar({ first, last, size = 40 }: { first: string; last: string; size?: number }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: palette.brandSoft, alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ color: palette.brandOnTint, fontSize: size * 0.32, fontWeight: "700" }}>
        {`${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase()}
      </Text>
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <Text style={{ color: palette.ink, fontSize: 15, fontWeight: "700" }}>{title}</Text>
      {action}
    </View>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <Text style={{ color: palette.brand, fontSize: 10.5, fontWeight: "800", letterSpacing: 1.6, textTransform: "uppercase" }}>
      {children}
    </Text>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <Text style={{ color: palette.inkMuted, fontSize: 13, textAlign: "center", paddingVertical: 24 }}>{children}</Text>;
}

/** Skeleton block that pulses while data loads. */
export function Skeleton({ height, style }: { height: number; style?: ViewStyle }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return <Animated.View style={[{ height, borderRadius: 16, backgroundColor: palette.surface, opacity: anim }, style]} />;
}

export function Toast({ message }: { message: string | null }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: message ? 1 : 0, useNativeDriver: true, damping: 18, stiffness: 220 }).start();
  }, [message]);
  if (!message) return null;
  return (
    <Animated.View
      style={{
        position: "absolute", left: 16, right: 16, bottom: 108,
        backgroundColor: palette.surfaceRaised, borderWidth: 1, borderColor: palette.hairlineStrong,
        borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13,
        flexDirection: "row", alignItems: "center", gap: 10,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: palette.statusGood }} />
      <Text style={{ color: palette.ink, fontSize: 13, fontWeight: "500", flex: 1 }}>{message}</Text>
    </Animated.View>
  );
}

/* ---------- tabs ---------- */

export function PillTabs<T extends string>({
  tabs, active, onChange,
}: { tabs: { key: T; label: string }[]; active: T; onChange: (k: T) => void }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6, paddingRight: 12 }}
    >
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={{
              paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
              backgroundColor: on ? palette.brand : palette.surface,
              borderWidth: 1, borderColor: on ? palette.brand : palette.hairline,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: on ? "700" : "500", color: on ? palette.brandInk : palette.inkSecondary }}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/* ---------- stat card ---------- */

export function StatCard({
  label, value, hint, tone, onPress, selected,
}: {
  label: string; value: string; hint?: string;
  tone?: "critical" | "warning" | "good";
  onPress?: () => void; selected?: boolean;
}) {
  const color =
    tone === "critical" ? palette.statusCritical
    : tone === "warning" ? palette.statusWarning
    : tone === "good" ? palette.statusGood
    : palette.ink;

  const inner = (
    <View
      style={{
        flex: 1, minWidth: 0, backgroundColor: palette.surface, borderRadius: 16,
        borderWidth: 1, borderColor: selected ? palette.brand : palette.hairline, padding: 14,
      }}
    >
      <Text style={{ color: palette.inkSecondary, fontSize: 11.5 }} numberOfLines={1}>{label}</Text>
      <Text style={{ color, fontSize: 24, fontWeight: "800", letterSpacing: -0.7, marginTop: 6 }} numberOfLines={1}>
        {value}
      </Text>
      {hint && <Text style={{ color: palette.inkMuted, fontSize: 11, marginTop: 3 }} numberOfLines={1}>{hint}</Text>}
    </View>
  );

  return onPress ? <Tap onPress={onPress} style={{ flex: 1 }}>{inner}</Tap> : inner;
}

/* ---------- bottom sheet ---------- */

/**
 * The phone equivalent of the web console's right-hand drawer. Springs up from the
 * bottom, dims what's behind it, and keeps its own scroll so long forms still work
 * with the keyboard open.
 */
export function Sheet({
  visible, onClose, title, subtitle, children, footer,
}: {
  visible: boolean; onClose: () => void; title: string; subtitle?: string;
  children: ReactNode; footer?: ReactNode;
}) {
  const slide = useRef(new Animated.Value(SCREEN_H)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      slide.setValue(SCREEN_H);
      fade.setValue(0);
      Animated.parallel([
        Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 190 }),
        Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slide, { toValue: SCREEN_H, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[sheetStyles.backdrop, { opacity: fade }]}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1, justifyContent: "flex-end" }}
        pointerEvents="box-none"
      >
        <Animated.View style={[sheetStyles.sheet, { transform: [{ translateY: slide }] }]}>
          <View style={sheetStyles.grabber} />
          <View style={sheetStyles.head}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={sheetStyles.title} numberOfLines={1}>{title}</Text>
              {subtitle && <Text style={sheetStyles.subtitle} numberOfLines={2}>{subtitle}</Text>}
            </View>
            <Tap onPress={onClose} scaleTo={0.88}>
              <View style={sheetStyles.close}><Text style={sheetStyles.closeText}>✕</Text></View>
            </Tap>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 20, gap: 2 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer && <View style={sheetStyles.footer}>{footer}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: palette.overlay },
  sheet: {
    maxHeight: "92%", backgroundColor: palette.page,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderTopWidth: 1, borderColor: palette.hairlineStrong, paddingTop: 10,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: palette.baseline },
  head: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  title: { color: palette.ink, fontSize: 19, fontWeight: "700", letterSpacing: -0.4 },
  subtitle: { color: palette.inkMuted, fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  close: {
    width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center",
    backgroundColor: palette.surfaceRaised,
  },
  closeText: { color: palette.inkSecondary, fontSize: 14, fontWeight: "700" },
  footer: {
    padding: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: palette.hairline,
    backgroundColor: palette.surfaceSunken, gap: 10,
  },
});

/* ---------- form controls ---------- */

export function Field({
  label, value, onChange, placeholder, hint, keyboardType, secureTextEntry,
  multiline, maxLength, autoCapitalize, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; required?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  secureTextEntry?: boolean; multiline?: boolean; maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={formStyles.label}>
        {label}{required && <Text style={{ color: palette.brandOnTint }}> *</Text>}
      </Text>
      <TextInput
        style={[
          formStyles.input,
          multiline && { height: 88, textAlignVertical: "top", paddingTop: 12 },
          focused && { borderColor: palette.brand },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={palette.inkMuted}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {hint && <Text style={formStyles.hint}>{hint}</Text>}
    </View>
  );
}

/** Two fields on one line — for things like City / PIN that read as a pair. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: "row", gap: 10 }}>{children}</View>;
}

/**
 * A phone has no <select>. Short option lists render as wrapping chips, which are
 * one tap instead of two and show the whole choice set at a glance.
 */
export function ChipSelect<T extends string>({
  label, value, options, onChange, required,
}: {
  label?: string; value: T | ""; required?: boolean;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      {label && (
        <Text style={formStyles.label}>
          {label}{required && <Text style={{ color: palette.brandOnTint }}> *</Text>}
        </Text>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={{
                paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999,
                backgroundColor: on ? palette.brand : palette.surfaceSunken,
                borderWidth: 1, borderColor: on ? palette.brand : palette.hairline,
              }}
            >
              <Text style={{ fontSize: 12.5, fontWeight: on ? "700" : "500", color: on ? palette.brandInk : palette.inkSecondary }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Long lists (members, packages) get a searchable modal picker instead of chips —
 * 28 chips would bury the rest of the form.
 */
export function PickerField<T extends { id: string }>({
  label, items, value, onChange, labelOf, subtitleOf, placeholder = "Choose…", required,
}: {
  label: string; items: T[]; value: string; onChange: (id: string) => void;
  labelOf: (item: T) => string; subtitleOf?: (item: T) => string;
  placeholder?: string; required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = items.find((i) => i.id === value);
  const q = query.trim().toLowerCase();
  const shown = q
    ? items.filter((i) => `${labelOf(i)} ${subtitleOf?.(i) ?? ""}`.toLowerCase().includes(q))
    : items;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={formStyles.label}>
        {label}{required && <Text style={{ color: palette.brandOnTint }}> *</Text>}
      </Text>
      <Pressable onPress={() => setOpen(true)} style={formStyles.input}>
        <Text style={{ color: selected ? palette.ink : palette.inkMuted, fontSize: 14 }} numberOfLines={1}>
          {selected ? labelOf(selected) : placeholder}
        </Text>
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={label}>
        <TextInput
          style={formStyles.input}
          placeholder="Search"
          placeholderTextColor={palette.inkMuted}
          value={query}
          onChangeText={setQuery}
        />
        <View style={{ marginTop: 10 }}>
          {shown.map((item) => (
            <Tap
              key={item.id}
              onPress={() => { onChange(item.id); setOpen(false); setQuery(""); }}
            >
              <View style={formStyles.pickerRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: palette.ink, fontSize: 14, fontWeight: "600" }} numberOfLines={1}>
                    {labelOf(item)}
                  </Text>
                  {subtitleOf && (
                    <Text style={{ color: palette.inkMuted, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                      {subtitleOf(item)}
                    </Text>
                  )}
                </View>
                {item.id === value && <Text style={{ color: palette.brand, fontWeight: "800" }}>✓</Text>}
              </View>
            </Tap>
          ))}
          {shown.length === 0 && <Empty>Nothing matches that search.</Empty>}
        </View>
      </Sheet>
    </View>
  );
}

export function Checkbox({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Tap onPress={() => onChange(!value)} scaleTo={0.98}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 9 }}>
        <View
          style={{
            width: 22, height: 22, borderRadius: 7,
            backgroundColor: value ? palette.brand : "transparent",
            borderWidth: 1.5, borderColor: value ? palette.brand : palette.hairlineStrong,
            alignItems: "center", justifyContent: "center",
          }}
        >
          {value && (
            <Svg width={13} height={13} viewBox="0 0 24 24">
              <Path d="M5 13l4 4L19 7" stroke={palette.brandInk} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          )}
        </View>
        <Text style={{ color: palette.inkSecondary, fontSize: 13.5, flex: 1 }}>{label}</Text>
      </View>
    </Tap>
  );
}

export function PrimaryButton({
  label, onPress, disabled, loading, tone = "brand",
}: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean;
  tone?: "brand" | "ghost";
}) {
  const off = disabled || loading;
  return (
    <Tap onPress={onPress} disabled={off}>
      <View
        style={{
          backgroundColor: tone === "brand" ? palette.brand : palette.surface,
          borderWidth: tone === "ghost" ? 1 : 0,
          borderColor: palette.hairlineStrong,
          borderRadius: 999, paddingVertical: 15, alignItems: "center",
          opacity: off ? 0.45 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={tone === "brand" ? palette.brandInk : palette.inkSecondary} />
        ) : (
          <Text style={{ color: tone === "brand" ? palette.brandInk : palette.inkSecondary, fontWeight: "700", fontSize: 15 }}>
            {label}
          </Text>
        )}
      </View>
    </Tap>
  );
}

/** Label / value line, the phone stand-in for the web console's definition lists. */
export function DetailRow({ label, value, last, tone }: { label: string; value: string; last?: boolean; tone?: string }) {
  return (
    <View
      style={{
        flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9,
        borderBottomWidth: last ? 0 : 1, borderBottomColor: palette.hairline,
      }}
    >
      <Text style={{ color: palette.inkMuted, fontSize: 12, width: 108 }}>{label}</Text>
      <Text style={{ color: tone ?? palette.ink, fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const formStyles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600", color: palette.inkSecondary, marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: palette.hairline, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14,
    color: palette.ink, backgroundColor: palette.surfaceSunken,
    justifyContent: "center", minHeight: 46,
  },
  hint: { fontSize: 11, color: palette.inkMuted, marginTop: 5 },
  pickerRow: {
    flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: palette.hairline,
  },
});

/** Standard screen heading. Sub-screens reached from the More hub use `onBack`. */
export function ScreenHeader({
  title, subtitle, eyebrow, action, onBack,
}: {
  title: string; subtitle?: string; eyebrow?: string;
  action?: ReactNode; onBack?: () => void;
}) {
  return (
    <View style={{ gap: 4 }}>
      {onBack && (
        <Tap onPress={onBack} scaleTo={0.94} style={{ alignSelf: "flex-start" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 }}>
            <Text style={{ color: palette.brandOnTint, fontSize: 16, fontWeight: "700" }}>‹</Text>
            <Text style={{ color: palette.brandOnTint, fontSize: 13, fontWeight: "600" }}>Back</Text>
          </View>
        </Tap>
      )}
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Text style={{ color: palette.ink, fontSize: 26, fontWeight: "800", letterSpacing: -0.7, flex: 1 }}>
          {title}
        </Text>
        {action}
      </View>
      {subtitle && <Text style={{ color: palette.inkSecondary, fontSize: 13 }}>{subtitle}</Text>}
    </View>
  );
}

/** The page padding every screen shares; the tail clears the floating nav. */
export const screenBody = { padding: 16, paddingBottom: 136, gap: 14 } as const;
