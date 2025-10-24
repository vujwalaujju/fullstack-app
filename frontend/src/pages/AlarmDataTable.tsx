/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dropdown, type DropdownChangeEvent } from "primereact/dropdown";
import {
  MultiSelect,
  type MultiSelectChangeEvent,
} from "primereact/multiselect";
import { Button } from "primereact/button";
import axios from "axios";
import "../style.css";

const API_BASE = "http://localhost:5297/api/sqlite";

type Row = {
  field: "temperature" | "pressure" | "humidity";
  node: string;
  time: string;
  value: number;
};

const FIELD_OPTS = [
  { label: "All", value: "all" },
  { label: "Temperature", value: "temperature" },
  { label: "Pressure", value: "pressure" },
  { label: "Humidity", value: "humidity" },
] as const;

async function query(
  field: "all" | "temperature" | "pressure" | "humidity",
  nodes: string[]
): Promise<Row[]> {
  try {
    const res = await axios.get(`${API_BASE}/readings`, { timeout: 5000 });
    const data = res.data as any[];

    console.log("Raw API response:", {
      status: res.status,
      length: data.length,
      sample: data.slice(0, 2),
    });

    if (!data.length) {
      console.warn("No data returned from API");
      return [];
    }

    return data
      .flatMap((r) => {
        if (!r.timestamp || !r.node) {
          console.warn("Invalid row found:", r);
          return [];
        }
        if (field === "all") {
          return [
            {
              field: "temperature" as const,
              node: r.node,
              time: r.timestamp,
              value: r.temperature || 0,
            },
            {
              field: "humidity" as const,
              node: r.node,
              time: r.timestamp,
              value: r.humidity || 0,
            },
            {
              field: "pressure" as const,
              node: r.node,
              time: r.timestamp,
              value: r.pressure || 0,
            },
          ];
        } else {
          return [
            {
              field,
              node: r.node,
              time: r.timestamp,
              value:
                field === "temperature"
                  ? r.temperature || 0
                  : field === "pressure"
                  ? r.pressure || 0
                  : r.humidity || 0,
            },
          ];
        }
      })
      .filter((r) => {
        const nodeMatch = nodes.length ? nodes.includes(r.node) : true;
        if (!nodeMatch) console.log("Excluded due to node filter:", r.node);
        return nodeMatch;
      });
  } catch (error) {
    console.error("Query error:", error);
    return [];
  }
}

export default function AlarmDataTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const dtRef = useRef<any>(null);

  const [field, setField] = useState<
    "all" | "temperature" | "pressure" | "humidity"
  >("all");
  const [allNodes, setAllNodes] = useState<string[]>([
    "Station1",
    "Station2",
    "Station3",
  ]);
  const [nodes, setNodes] = useState<string[]>([
    "Station1",
    "Station2",
    "Station3",
  ]);

  async function load() {
    setLoading(true);
    setErr("");

    try {
      console.log("Loading data for field:", field, "nodes:", nodes);
      const data = await query(field, nodes);
      console.log(
        "Final data length:",
        data.length,
        "Sample:",
        data.slice(0, 2)
      );

      if (data.length > 0 && (!rows.length || data[0].time !== rows[0]?.time)) {
        setRows(data);
      }
    } catch (e: any) {
      setErr(e.message || String(e));
      console.error("Load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 1000);
    return () => clearInterval(id);
  }, [field, nodes]);

  const niceRows = useMemo(
    () =>
      rows.map((r) => {
        let timeLabel = "Invalid Date";
        try {
          const isoTime = r.time.replace(" ", "T");
          const parsed = Date.parse(isoTime);

          if (!isNaN(parsed)) {
            timeLabel = new Date(parsed).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              hour12: true,
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            });
          }
        } catch (e) {
          console.error("Parse error:", r.time);
        }
        return {
          ...r,
          fieldLabel:
            r.field === "temperature"
              ? "Temperature"
              : r.field === "pressure"
              ? "Pressure"
              : "Humidity",
          valueLabel: r.value.toFixed(r.field === "pressure" ? 2 : 1),
          timeLabel,
        };
      }),
    [rows]
  );
  const valueBodyTemplate = (rowData: any) => {
    const color =
      rowData.field === "temperature"
        ? "#ff6b35"
        : rowData.field === "humidity"
        ? "#4ecdc4"
        : "#45b7d1";
    return (
      <span style={{ color, fontWeight: "bold" }}>{rowData.valueLabel}</span>
    );
  };

  return (
    <div className="container">
      <h2 className="section-title">Alarm Data Table (Last 30 mins)</h2>

      <div className="controls">
        <Dropdown
          value={field}
          options={FIELD_OPTS as any}
          onChange={(e: DropdownChangeEvent) => setField(e.value as any)}
          className="select"
          placeholder="Select Field"
        />
        <MultiSelect
          value={nodes}
          options={allNodes.map((n) => ({ label: n, value: n }))}
          onChange={(e: MultiSelectChangeEvent) =>
            setNodes(e.value as string[])
          }
          display="chip"
          placeholder="Select Stations"
          className="select"
        />
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          onClick={load}
          disabled={loading}
          className="btn"
          loading={loading}
        />
        <Button
          icon="pi pi-download"
          label="Export"
          onClick={() => dtRef.current?.exportCSV({ selectionOnly: false })}
          className="btn"
        />
      </div>

      {err ? (
        <p style={{ color: "crimson", margin: "10px 0" }}>Error: {err}</p>
      ) : null}

      <DataTable
        ref={dtRef}
        value={niceRows}
        loading={loading}
        paginator
        rows={20}
        rowsPerPageOptions={[10, 20, 50]}
        stripedRows
        size="small"
        emptyMessage="No data in the last 30 mins."
        className="card table"
        sortField="time"
        sortOrder={-1}
      >
        <Column
          field="fieldLabel"
          header="Field"
          sortable
          style={{ minWidth: "120px" }}
        />
        <Column
          field="node"
          header="Station"
          sortable
          style={{ minWidth: "100px" }}
        />
        <Column
          field="valueLabel"
          header="Value"
          sortable
          body={valueBodyTemplate}
          style={{ minWidth: "120px" }}
        />
        <Column
          field="timeLabel"
          header="Time"
          sortable
          style={{ minWidth: "180px" }}
        />
      </DataTable>
    </div>
  );
}
