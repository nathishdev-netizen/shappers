import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { palette } from "./theme";

export type TabKey = "home" | "members" | "training" | "leads" | "more";

/** Minimal line icons, so the bar needs no icon font. */
function Icon({ name, color }: { name: TabKey; color: string }) {
  const common = { stroke: color, strokeWidth: 1.9, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      {name === "home" && <Path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" {...common} />}
      {name === "members" && (
        <>
          <Circle cx={9} cy={8} r={3.4} {...common} />
          <Path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 11.2a3 3 0 0 0 0-5.9M18 20a5.6 5.6 0 0 0-2.2-4.2" {...common} />
        </>
      )}
      {name === "training" && (
        <>
          <Path d="M4 9v6M20 9v6M7 6.5v11M17 6.5v11" {...common} />
          <Path d="M7 12h10" {...common} />
        </>
      )}
      {name === "leads" && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...common} />
          <Circle cx={12} cy={12} r={3.5} {...common} />
          <Path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" {...common} />
        </>
      )}
      {name === "more" && (
        <>
          <Circle cx={5} cy={12} r={1.6} fill={color} stroke="none" />
          <Circle cx={12} cy={12} r={1.6} fill={color} stroke="none" />
          <Circle cx={19} cy={12} r={1.6} fill={color} stroke="none" />
        </>
      )}
    </Svg>
  );
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "members", label: "Members" },
  { key: "training", label: "Training" },
  { key: "leads", label: "Leads" },
  { key: "more", label: "More" },
];

/** Floating pill nav with a sliding brand indicator. */
export function BottomNav({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  const index = TABS.findIndex((t) => t.key === active);
  const slide = useRef(new Animated.Value(index)).current;
  // Measured, not assumed — a hardcoded step only lines up on one screen width.
  const [trackWidth, setTrackWidth] = useState(0);
  const cell = trackWidth / TABS.length;

  useEffect(() => {
    Animated.spring(slide, { toValue: index, useNativeDriver: true, damping: 18, stiffness: 220 }).start();
  }, [index]);

  return (
    <View style={{ position: "absolute", left: 16, right: 16, bottom: 26 }}>
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width - 12)}
        style={{
          flexDirection: "row",
          backgroundColor: palette.surfaceRaised,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: palette.hairlineStrong,
          padding: 6,
          overflow: "hidden",
        }}
      >
        {/* The pill slides between equal cells of the measured track. */}
        {cell > 0 && (
          <Animated.View
            style={{
              position: "absolute",
              top: 6,
              bottom: 6,
              left: 6,
              width: cell,
              borderRadius: 999,
              backgroundColor: palette.brand,
              transform: [{
                translateX: slide.interpolate({
                  inputRange: TABS.map((_, i) => i),
                  outputRange: TABS.map((_, i) => i * cell),
                }),
              }],
            }}
          />
        )}

        {TABS.map((t) => {
          const on = t.key === active;
          return (
            <Pressable
              key={t.key}
              onPress={() => onChange(t.key)}
              style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, gap: 3 }}
            >
              <Icon name={t.key} color={on ? palette.brandInk : palette.inkMuted} />
              <Text style={{ fontSize: 9.5, fontWeight: on ? "700" : "500", color: on ? palette.brandInk : palette.inkMuted }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
