import { useMemo } from "react";

export type KpiPoint = { time: string | number; value: number; node: string };

type Props = {
  title: string;
  unit?: string;
  accent?: string;
  points: KpiPoint[];
  warnHigh?: number;
};

export default function Kpi({
  title,
  unit = "",
  accent = "#2563eb",
  points,
  warnHigh = 80,
}: Props) {
  const { avgNow, maxNode, minNode, hiNodes } = useMemo(() => {
    const latestByNode = new Map<string, KpiPoint>();
    for (const p of points) {
      const prev = latestByNode.get(p.node);
      if (!prev || +new Date(p.time) > +new Date(prev.time))
        latestByNode.set(p.node, p);
    }
    const latest = Array.from(latestByNode.values());

    const avgNow =
      latest.length > 0
        ? latest.reduce((a, b) => a + b.value, 0) / latest.length
        : undefined;

    let maxNode: { node: string; value: number } | undefined;
    let minNode: { node: string; value: number } | undefined;
    const hiNodes: string[] = [];

    for (const p of latest) {
      if (!maxNode || p.value > maxNode.value)
        maxNode = { node: p.node, value: p.value };
      if (!minNode || p.value < minNode.value)
        minNode = { node: p.node, value: p.value };

      const threshold = title === "Humidity" ? 90 : warnHigh;
      if (p.value > threshold) hiNodes.push(p.node);
    }

    return { avgNow, maxNode, minNode, hiNodes };
  }, [points, warnHigh, title]);

  const hasHi = hiNodes.length > 0;

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 260px", minWidth: 220 }}>
          <div
            style={{
              color: accent,
              fontWeight: 600,
              fontSize: 14,
              marginBottom: 4,
            }}
          >
            Average {title}
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 800,
              color: "#0f172a",
              lineHeight: 1.1,
            }}
          >
            {avgNow === undefined
              ? "—"
              : `${avgNow.toFixed(1)}${unit ? " " + unit : ""}`}
          </div>
          <div style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>
            {maxNode
              ? `Max ${maxNode.node} ${maxNode.value.toFixed(1)}${unit}`
              : "Max —"}{" "}
            •
            {minNode
              ? `Min ${minNode.node} ${minNode.value.toFixed(1)}${unit}`
              : "Min —"}
          </div>
        </div>

        {hasHi && (
          <div
            style={{
              flex: "0 1 220px",
              minWidth: 180,
              maxWidth: 180,
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 10,
              background: "#fee2e2",
              border: "1px solid #ef4444",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3l9 16H3l9-16Z"
                stroke="#b91c1c"
                strokeWidth="2"
                fill="none"
              />
              <path d="M12 9v5" stroke="#b91c1c" strokeWidth="2" />
              <circle cx="12" cy="17" r="1.4" fill="#b91c1c" />
            </svg>
            <div style={{ lineHeight: 1.2, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#b91c1c" }}>
                High {title} {title === "Humidity" ? 90 : warnHigh}
              </div>
              <div style={{ fontSize: 12, color: "#111827", fontWeight: 600 }}>
                {hiNodes.join(", ")}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
