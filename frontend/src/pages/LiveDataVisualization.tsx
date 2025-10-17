/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Dropdown, type DropdownChangeEvent } from "primereact/dropdown";
import {
  MultiSelect,
  type MultiSelectChangeEvent,
} from "primereact/multiselect";
import { Toolbar } from "primereact/toolbar";
import { Card } from "primereact/card";
import { Message } from "primereact/message";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Label,
} from "recharts";

import Gauge from "../components/InfluxGauge";
import type { KpiPoint } from "../components/InfluxKpiSummary";
import KpiSummary from "../components/InfluxKpiSummary";

type Row = {
  _time: string;
  _value: number | string;
  _field?: string;
  sensor_id?: string;
};

const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5297";

const FIELDS = [
  { label: "Temperature", value: "temperature" },
  { label: "Pressure", value: "pressure" },
  { label: "Humidity", value: "humidity" },
];

const NODE_COLORS: Record<string, string> = {
  T1: "#0072B2",
  T2: "#D55E00",
  T3: "#009E73",
  P1: "#E69F00",
  P2: "#56B4E9",
  P3: "#999999",
  H1: "#000000",
  H2: "#800000",
};

function nodeColor(nid: string) {
  return NODE_COLORS[nid] || "#6B7280";
}

export default function LiveDataVisualization() {
  const [measurements, setMeasurements] = useState<string[]>([]);
  const [measurement, setMeasurement] = useState("weather");
  const [field, setField] = useState<string>("temperature");
  const [allNodes, setAllNodes] = useState<string[]>([]);
  const [nodes, setNodes] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState("");

  const MAX_POINTS = 300;
  const lastTsRef = useRef<string>("");
  const [, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/api/influx/measurements`, {
          cache: "no-store",
        });
        const data = await res.json();
        setMeasurements(data);
        if (!data.includes("weather") && data.length) setMeasurement(data[0]);
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, []);

  useEffect(() => {
    if (!measurement) return;
    (async () => {
      try {
        const nRes = await fetch(
          `${API}/api/influx/tag-values?measurement=${encodeURIComponent(
            measurement
          )}&tag=sensor_id`,
          { cache: "no-store" }
        );
        const n = await nRes.json();
        setAllNodes(n);
        setNodes([]);
      } catch (e) {
        setErr(String(e));
      }
    })();
  }, [measurement]);

  async function loadData() {
    if (!measurement || !field) return;
    setErr("");

    const params = new URLSearchParams({
      measurement: "weather",
      field,
      range: "-1m",
    });

    const res = await fetch(`${API}/api/influx/query?${params.toString()}`, {
      cache: "no-store",
    });
    const data: Row[] = await res.json();

    const newest = data.length ? data[data.length - 1]._time : "";
    if (!newest || newest === lastTsRef.current) return;

    lastTsRef.current = newest;

    startTransition(() => {
      setRows((prev) => {
        const merged = [...prev, ...data].slice(-MAX_POINTS);
        const seen = new Set<string>();
        return merged.filter((r) => {
          const k = `${r._time}|${r.sensor_id}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        });
      });
    });
  }

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) loadData();
    }, 1000);
    loadData();
    return () => clearInterval(id);
  }, [field]);

  const { mergedData, nodeKeys } = useMemo(() => {
    const wanted = new Set(nodes.length ? nodes : allNodes);
    const map = new Map<string, any>();
    for (const r of rows) {
      const nid = String((r as any).sensor_id ?? "");
      if (!nid || !wanted.has(nid)) continue;
      const t = r._time;
      const v = Number(r._value);
      if (!map.has(t)) map.set(t, { time: new Date(t).toLocaleTimeString() });
      map.get(t)[nid] = v;
    }
    const xs = Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([, obj]) => obj);

    const keys = Array.from(new Set(xs.flatMap((o) => Object.keys(o)))).filter(
      (k) => k !== "time"
    );
    return { mergedData: xs, nodeKeys: keys };
  }, [rows, nodes, allNodes]);

  const nodeOptions = useMemo(() => {
    const prefix =
      field === "temperature"
        ? "T"
        : field === "pressure"
        ? "P"
        : field === "humidity"
        ? "H"
        : "";
    const list = prefix
      ? allNodes.filter((n) => n.startsWith(prefix))
      : allNodes;
    return list.map((n) => ({ label: n, value: n }));
  }, [allNodes, field]);

  useEffect(() => {
    const valid = new Set(nodeOptions.map((o) => o.value));
    setNodes((prev) => prev.filter((n) => valid.has(n)));
  }, [nodeOptions]);

  const latestByNode = useMemo(() => {
    const prefix =
      field === "temperature"
        ? "T"
        : field === "pressure"
        ? "P"
        : field === "humidity"
        ? "H"
        : "";
    const candidateNodes = (nodes.length ? nodes : allNodes).filter((n) =>
      n?.startsWith(prefix)
    );

    const map = new Map<string, Row>();
    for (const r of rows) {
      const nid = String((r as any).sensor_id ?? "");
      if (!nid || !candidateNodes.includes(nid)) continue;
      const prev = map.get(nid);
      if (!prev || Date.parse(r._time) > Date.parse(prev._time)) {
        map.set(nid, r);
      }
    }

    return candidateNodes.map((nid) => {
      const r = map.get(nid);
      return (
        r ?? ({ sensor_id: nid, _value: "", _time: "", _field: field } as Row)
      );
    });
  }, [rows, nodes, allNodes, field]);

  const kpiPoints: KpiPoint[] = useMemo(
    () =>
      rows.map((r: any) => ({
        time: r._time,
        value: Number(r._value),
        node: String(r.sensor_id),
      })),
    [rows]
  );

  const SLOTS =
    field === "temperature"
      ? ["T1", "T2", "T3"]
      : field === "pressure"
      ? ["P1", "P2", "P3"]
      : field === "humidity"
      ? ["H1", "H2"]
      : [];

  const latestMap = new Map(
    latestByNode.map((r: any) => [String(r.sensor_id), r])
  );

  const wanted = new Set(nodes.length ? nodes : SLOTS);

  const right = (
    <div className="flex gap-2 align-items-center">
      <Dropdown
        value={measurement}
        options={measurements.map((m) => ({ label: m, value: m }))}
        onChange={(e: DropdownChangeEvent) => setMeasurement(String(e.value))}
        placeholder="Measurement"
        className="w-12rem"
      />
      <Dropdown
        value={field}
        options={FIELDS}
        onChange={(e: DropdownChangeEvent) => setField(String(e.value))}
        placeholder="Field"
        className="w-12rem"
      />
      <MultiSelect
        value={nodes}
        options={nodeOptions}
        onChange={(e: MultiSelectChangeEvent) =>
          setNodes((e.value as string[]) ?? [])
        }
        placeholder={nodes.length ? "Nodes…" : "All nodes"}
        display="chip"
        className="w-16rem"
        disabled={nodeOptions.length === 0}
      />
    </div>
  );

  return (
    <div className="container">
      <Card className="mb-3">
        <h3 className="mt-0 mb-3">Line Graph</h3>
        <Toolbar start={right} className="mb-3 border-round-lg" />
        <div className="p-3">
          {err && (
            <div className="mb-3">
              <Message severity="error" text={err} />
            </div>
          )}

          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={mergedData}
                margin={{ top: 8, right: 24, bottom: 28, left: 28 }}
                syncMethod="value"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time">
                  <Label
                    value="Time"
                    position="insideBottomRight"
                    offset={-4}
                  />
                </XAxis>
                <YAxis
                  label={{
                    value:
                      field === "pressure"
                        ? "Pressure"
                        : field === "humidity"
                        ? "Humidity"
                        : "Temperature",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                  }}
                />
                <Tooltip />
                <Legend />
                {nodeKeys.map((nid) => (
                  <Line
                    key={nid}
                    type="monotone"
                    dataKey={nid}
                    name={`node ${nid}`}
                    dot={false}
                    strokeWidth={2}
                    stroke={nodeColor(String(nid))}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-3">
          <h3 className="mt-0 mb-3">Latest Rows</h3>
          <DataTable
            value={latestByNode}
            size="small"
            scrollable
            scrollHeight="260px"
            stripedRows
            showGridlines
            className="p-datatable-sm"
            emptyMessage="No data"
          >
            <Column
              header="Node"
              body={(r: Row) => r.sensor_id}
              style={{ minWidth: "100px" }}
            />
            <Column
              header="Value"
              body={(r: Row) => (r._value === "" ? "—" : String(r._value))}
              className="text-right"
              style={{ minWidth: "120px" }}
            />
            <Column
              header="Time"
              body={(r: Row) =>
                r._time ? new Date(r._time).toLocaleTimeString() : "—"
              }
              style={{ minWidth: "160px" }}
            />
          </DataTable>
        </div>
      </Card>

      <Card className="mt-3">
        <div className="p-3">
          <h3 className="mt-0 mb-3">Node Gauges</h3>

          <div className="gauges-grid">
            {SLOTS.map((slot) => {
              const r = latestMap.get(slot);
              const show = wanted.has(slot) && r;
              return (
                <div key={slot} className="gauge-cell">
                  {show ? (
                    <>
                      <Gauge
                        nodeId={slot}
                        value={r._value as number | string}
                        field={field as "temperature" | "pressure" | "humidity"}
                        color={nodeColor(slot)}
                        min={field === "humidity" ? 0 : 10}
                        max={field === "humidity" ? 100 : 100}
                        height={220}
                      />
                      <div className="gauge-meta">
                        <span
                          className="gauge-dot"
                          style={{ background: nodeColor(slot) }}
                        />
                        <span className="gauge-label">{slot}</span>
                        <span className="gauge-time">
                          {r._time
                            ? new Date(r._time).toLocaleTimeString()
                            : "—"}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="gauge-blank" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <Card className="mt-3" style={{ width: "50%", minWidth: 320 }}>
        <div className="p-3">
          <h3 className="mt-0 mb-3">KPI</h3>
          <KpiSummary
            title={
              field === "temperature"
                ? "Temperature"
                : field === "pressure"
                ? "Pressure"
                : "Humidity"
            }
            unit={
              field === "temperature"
                ? "°C"
                : field === "pressure"
                ? "psi"
                : "%"
            }
            accent={
              field === "temperature"
                ? "#0072B2"
                : field === "pressure"
                ? "#E69F00"
                : "#009E73"
            }
            points={kpiPoints}
          />
        </div>
      </Card>
    </div>
  );
}
