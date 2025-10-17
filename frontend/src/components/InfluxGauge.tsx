import { useEffect, useRef } from "react";
import * as echarts from "echarts";
import type { ComposeOption } from "echarts/core";
import type { GaugeSeriesOption } from "echarts/charts";

type Props = {
  nodeId: string;
  value: number | string | null | undefined;
  field: "temperature" | "pressure" | "humidity";
  color?: string;
  min?: number;
  max?: number;
  height?: number; // px
};

type ECOption = ComposeOption<GaugeSeriesOption>;

export default function Gauge({
  nodeId,
  value,
  field,
  color = "#2563eb",
  min = 10,
  max = 100,
  height = 220,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.EChartsType | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current, undefined, {
        renderer: "canvas",
      });
      const onResize = () => chartRef.current?.resize();
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        chartRef.current?.dispose();
        chartRef.current = null;
      };
    }
  }, []);

  useEffect(() => {
    if (!chartRef.current) return;
    const numeric =
      value === "" || value === null || value === undefined
        ? undefined
        : Number(value);

    const unit =
      field === "pressure" ? "psi" : field === "humidity" ? "%" : "°C";

    const title =
      field === "temperature"
        ? "TEMP"
        : field === "pressure"
        ? "PRESS"
        : "HUMID";

    const defaultMin = field === "humidity" ? 0 : 10;
    const defaultMax = field === "humidity" ? 100 : 100;

    const option: ECOption = {
      backgroundColor: "transparent",
      animation: true,
      animationDuration: 200,
      animationEasing: "cubicOut",
      series: [
        {
          type: "gauge",
          min: min ?? defaultMin,
          max: max ?? defaultMax,
          startAngle: 220,
          endAngle: -40,
          splitNumber: field === "humidity" ? 10 : 9,
          center: ["50%", "60%"],
          radius: "95%",
          progress: {
            show: true,
            width: 12,
            roundCap: true,
            itemStyle: { color },
          },
          axisLine: { lineStyle: { width: 12 } },
          axisTick: { show: false },
          splitLine: { length: 12, lineStyle: { width: 2, color: "#e5e7eb" } },
          axisLabel: {
            color: "#6b7280",
            distance: 12,
            fontSize: 10,
            formatter: (v: number) => (field === "humidity" ? `${v}%` : `${v}`),
          },
          anchor: { show: true, size: 6, itemStyle: { color: "#374151" } },
          pointer: { width: 3, length: "60%" },
          detail: {
            valueAnimation: true,
            fontSize: 18,
            offsetCenter: [0, "35%"],
            formatter: (v: number | undefined) =>
              v === undefined ? "—" : `${v.toFixed(1)} ${unit}`,
            color: "#111827",
          },
          title: {
            show: true,
            offsetCenter: [0, "-30%"],
            color,
            fontWeight: 600,
            fontSize: 14,

            formatter: `{value|${title}}\n{label|${nodeId}}`,
          },
          itemStyle: { color },
          data: [{ value: numeric, name: String(nodeId) }],
        },
      ],
    };

    chartRef.current.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [nodeId, value, field, color, min, max, height]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
