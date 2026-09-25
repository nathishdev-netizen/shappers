import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Text, View, type LayoutChangeEvent } from "react-native";
import Svg, {
  Defs, LinearGradient, Path, Rect, Stop, Line, Circle, ClipPath, G,
  Text as SvgText,
} from "react-native-svg";
import { palette, withAlpha } from "./theme";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * Monotone cubic interpolation — the same curve shape recharts draws for
 * `type="monotone"`, so the phone charts read identically to the web console's.
 * A plain Catmull-Rom would overshoot and invent dips the data doesn't have.
 */
function monotonePath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;
  if (n === 2) return `M${pts[0].x},${pts[0].y}L${pts[1].x},${pts[1].y}`;

  // Secant slopes between consecutive points.
  const dx: number[] = [], dy: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    dy[i] = pts[i + 1].y - pts[i].y;
    m[i] = dy[i] / (dx[i] || 1);
  }

  // Tangents, clamped so the curve never overshoots a local extreme.
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0;
    else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
    }
  }
  t[n - 1] = m[n - 2];

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

/** Wipes a chart in from the left as it mounts. */
function useWipe(width: number, duration = 1100, delay = 150) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (width <= 0) return;
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: width, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [width]);
  return anim;
}

/** Measures its own width, so charts fit any card without hardcoded sizes. */
function useMeasuredWidth() {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next !== w) setW(next);
  };
  return [w, onLayout] as const;
}

/* ---------------- area chart ---------------- */

export function AreaChart({
  data, height = 170, color = palette.brand, formatY, labelEvery = 3,
}: {
  data: { label: string; value: number }[];
  height?: number; color?: string;
  formatY?: (v: number) => string;
  labelEvery?: number;
}) {
  const [w, onLayout] = useMeasuredWidth();
  const wipe = useWipe(w);

  const padL = formatY ? 42 : 10;
  const padR = 8, padT = 10, padB = 22;
  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;

  const max = Math.max(1, ...data.map((d) => d.value));
  const gid = useMemo(() => `af${Math.random().toString(36).slice(2, 8)}`, []);
  const cid = `${gid}c`;

  const pts = data.map((d, i) => ({
    x: padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: padT + innerH - (d.value / max) * innerH,
  }));

  const line = monotonePath(pts);
  const area = pts.length
    ? `${line}L${pts[pts.length - 1].x},${padT + innerH}L${pts[0].x},${padT + innerH}Z`
    : "";

  // Three gridlines is enough context on a phone without becoming graph paper.
  const ticks = [0, 0.5, 1];

  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.34} />
              <Stop offset="1" stopColor={color} stopOpacity={0.02} />
            </LinearGradient>
            <ClipPath id={cid}>
              <AnimatedRect x={0} y={0} width={wipe as unknown as number} height={height} />
            </ClipPath>
          </Defs>

          {ticks.map((t) => {
            const y = padT + innerH - t * innerH;
            return (
              <G key={t}>
                <Line
                  x1={padL} y1={y} x2={w - padR} y2={y}
                  stroke={palette.hairline} strokeWidth={1}
                />
                {formatY && (
                  <SvgLabel x={padL - 6} y={y + 3} anchor="end">{formatY(max * t)}</SvgLabel>
                )}
              </G>
            );
          })}

          <G clipPath={`url(#${cid})`}>
            <Path d={area} fill={`url(#${gid})`} />
            <Path d={line} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {pts.map((p, i) => (
              <Circle
                key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 4 : 0}
                fill={color} stroke={palette.surface} strokeWidth={2}
              />
            ))}
          </G>

          {/* Always label the last point, but drop it when it would collide with
              the previous one — on 14 days that pair sat almost on top of each other. */}
          {data.map((d, i) => {
            const isLast = i === data.length - 1;
            const onTick = i % labelEvery === 0;
            if (!onTick && !isLast) return null;
            if (isLast && !onTick) {
              const prevTick = Math.floor((data.length - 1) / labelEvery) * labelEvery;
              if (pts[i].x - pts[prevTick].x < 44) return null;
            }
            return (
              <SvgLabel key={i} x={pts[i].x} y={height - 6} anchor="middle">{d.label}</SvgLabel>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

/** Axis label — react-native-svg's <Text> needs every prop spelled out. */
function SvgLabel({
  x, y, anchor = "start", children,
}: { x: number; y: number; anchor?: "start" | "middle" | "end"; children: React.ReactNode }) {
  return (
    <SvgText x={x} y={y} fontSize={10} fill={palette.inkMuted} textAnchor={anchor}>
      {children}
    </SvgText>
  );
}

/* ---------------- bar chart ---------------- */

/**
 * Bars grow from the baseline, staggered left to right. The tallest bar wears the
 * brand colour so the peak is findable without reading every label.
 */
export function BarChart({
  data, height = 170, color = palette.brand,
}: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const [w, onLayout] = useMeasuredWidth();
  const padB = 26, padT = 18;
  const innerH = height - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((b, d, i) => (d.value > data[b].value ? i : b), 0);

  const gap = 8;
  const barW = data.length ? Math.max(6, (w - gap * (data.length - 1)) / data.length) : 0;

  return (
    <View onLayout={onLayout} style={{ height }}>
      {w > 0 && (
        <View style={{ height, flexDirection: "row", alignItems: "flex-end", gap }}>
          {data.map((d, i) => (
            <GrowBar
              key={i}
              index={i}
              width={barW}
              maxHeight={innerH}
              ratio={d.value / max}
              label={d.label}
              value={d.value}
              color={i === peak ? color : palette.baseline}
              emphasised={i === peak}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function GrowBar({
  index, width, maxHeight, ratio, label, value, color, emphasised,
}: {
  index: number; width: number; maxHeight: number; ratio: number;
  label: string; value: number; color: string; emphasised: boolean;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.max(ratio, 0.02) * maxHeight,
      duration: 750, delay: 160 + index * 70,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [ratio, maxHeight]);

  return (
    <View style={{ width, alignItems: "center" }}>
      <Text
        style={{
          fontSize: 11, fontWeight: "700", marginBottom: 4,
          color: emphasised ? palette.ink : palette.inkMuted,
        }}
      >
        {value}
      </Text>
      <Animated.View
        style={{
          width: "100%", height: anim, borderRadius: 6,
          backgroundColor: color,
        }}
      />
      <Text style={{ fontSize: 10, color: palette.inkMuted, marginTop: 6 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/* ---------------- sparkline ---------------- */

/** Tiny trend line for a stat tile — no axes, no labels, just the shape. */
export function Sparkline({
  values, width = 64, height = 22, color = palette.brand,
}: { values: number[]; width?: number; height?: number; color?: string }) {
  const wipe = useWipe(width, 900, 260);
  if (values.length < 2) return null;

  const max = Math.max(...values), min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: height - ((v - min) / span) * (height - 3) - 1.5,
  }));
  const cid = `sp${Math.round(values[0])}${values.length}`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <ClipPath id={cid}>
          <AnimatedRect x={0} y={0} width={wipe as unknown as number} height={height} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${cid})`}>
        <Path d={monotonePath(pts)} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

/* ---------------- plan distribution ---------------- */

export function PlanLegend({
  items, total,
}: { items: { name: string; count: number }[]; total: number }) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 9 }}>
      {items.slice(0, 4).map((p, i) => (
        <View key={p.name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View
            style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: i === 0 ? palette.brand : palette.baseline,
            }}
          />
          <Text style={{ color: palette.inkSecondary, fontSize: 12.5, flex: 1 }} numberOfLines={1}>
            {p.name}
          </Text>
          <Text style={{ color: palette.ink, fontSize: 12.5, fontWeight: "700" }}>{p.count}</Text>
        </View>
      ))}
      {items.length === 0 && (
        <Text style={{ color: palette.inkMuted, fontSize: 12.5 }}>No active subscriptions.</Text>
      )}
    </View>
  );
}
