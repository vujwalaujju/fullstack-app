// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { useEffect, useMemo, useRef, useState } from "react";
// import { DataTable } from "primereact/datatable";
// import { Column } from "primereact/column";
// import { Dropdown, type DropdownChangeEvent } from "primereact/dropdown";
// import {
//   MultiSelect,
//   type MultiSelectChangeEvent,
// } from "primereact/multiselect";
// import { Button } from "primereact/button";
// import "../style.css";

// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// const API = import.meta.env.VITE_BACKEND_URL || "http://localhost:5296";

// type Row = {
//   field: "temperature" | "pressure" | "humidity";
//   node: string;
//   time: string;
//   value?: number;
// };

// const FIELD_OPTS = [
//   { label: "All", value: "all" },
//   { label: "Temperature", value: "temperature" },
//   { label: "Pressure", value: "pressure" },
//   { label: "Humidity", value: "humidity" },
// ] as const;

// // async function query(
// //   field: "temperature" | "pressure" | "humidity",
// //   nodes: string[]
// // ): Promise<Row[]> {
// //   const params = new URLSearchParams({
// //     measurement: "weather",
// //     field,
// //     range: "-1h",
// //     limit: "8000",
// //   });

// //   try {
// //     const res = await fetch(`${API}/api/influx/query?${params.toString()}`, {
// //       method: "GET",
// //       mode: "cors",
// //       credentials: "include",
// //     });
// //     if (!res.ok) {
// //       throw new Error(`HTTP error! Status: ${res.status} - ${res.statusText}`);
// //     }
// //     const data = await res.json();
// //     if (!Array.isArray(data)) return [];

// //     return data
// //       .filter((r: any) => {
// //         const nodeId = String(r.sensor_id ?? "");
// //         return nodes.length ? nodes.includes(nodeId) : true;
// //       })
// //       .map((r: any) => ({
// //         field,
// //         node: String(r.sensor_id ?? ""),
// //         time: r._time as string,
// //       }));
// //   } catch (error) {
// //     console.error("Query fetch error:", error);
// //     throw error;
// //   }
// // }
// // async function query(
// //   field: "temperature" | "pressure" | "humidity",
// //   nodes: string[]
// // ): Promise<Row[]> {
// //   const params = new URLSearchParams({
// //     field,
// //     range: "-1h",
// //     limit: "8000",
// //   });

// //   try {
// //     const res = await fetch(`/api/influx/query?${params.toString()}`, {
// //       method: "GET",
// //       mode: "cors",
// //       credentials: "include",
// //     });
// //     if (!res.ok) {
// //       throw new Error(`HTTP error! Status: ${res.status} - ${res.statusText}`);
// //     }
// //     const data = await res.json();
// //     if (!Array.isArray(data)) return [];

// //     return data
// //       .filter((r: any) => {
// //         const nodeId = String(r.sensor_id ?? "");
// //         return nodes.length ? nodes.includes(nodeId) : true;
// //       })
// //       .map((r: any) => ({
// //         field,
// //         node: String(r.sensor_id ?? ""),
// //         time: r._time as string,
// //         value: r._value,
// //       }));
// //   } catch (error) {
// //     console.error("Query fetch error:", error);
// //     throw error;
// //   }
// // }

// export default function LiveDataTable() {
//   const [rows, setRows] = useState<Row[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [err, setErr] = useState("");
//   const dtRef = useRef<any>(null);

//   const [field, setField] = useState<
//     "all" | "temperature" | "pressure" | "humidity"
//   >("all");
//   const [allNodes, setAllNodes] = useState<string[]>([]);
//   const [nodes, setNodes] = useState<string[]>([]);

//   // Load sensor node IDs from backend
//   // useEffect(() => {
//   //   (async () => {
//   //     try {
//   //       const res = await fetch(
//   //         `${API}/api/influx/tag-values?measurement=weather&tag=sensor_id`,
//   //         {
//   //           method: "GET",
//   //           mode: "cors",
//   //           credentials: "include",
//   //         }
//   //       );
//   //       if (!res.ok) {
//   //         throw new Error(
//   //           `HTTP error! Status: ${res.status} - ${res.statusText}`
//   //         );
//   //       }
//   //       const nodeData = await res.json();
//   //       setAllNodes(nodeData);
//   //     } catch (e) {
//   //       setErr(String(e));
//   //       console.error("Failed to load nodes:", e);
//   //     }
//   //   })();
//   // }, []);
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await fetch(
//           `/api/influx/tag-values?measurement=weather&tag=sensor_id`,
//           {
//             method: "GET",
//             mode: "cors",
//             credentials: "include",
//           }
//         );
//         if (!res.ok) {
//           throw new Error(
//             `HTTP error! Status: ${res.status} - ${res.statusText}`
//           );
//         }
//         const nodeData = await res.json();
//         setAllNodes(nodeData);
//       } catch (e) {
//         setErr(String(e));
//         console.error("Failed to load nodes:", e);
//       }
//     })();
//   }, []);

//   const nodeOptions = useMemo(() => {
//     if (field === "temperature")
//       return allNodes.filter((n) => n.startsWith("T"));
//     if (field === "pressure") return allNodes.filter((n) => n.startsWith("P"));
//     if (field === "humidity") return allNodes.filter((n) => n.startsWith("H"));
//     return allNodes;
//   }, [allNodes, field]);

//   useEffect(() => {
//     const valid = new Set(nodeOptions);
//     setNodes((prev) => prev.filter((n) => valid.has(n)));
//   }, [nodeOptions]);

//   useEffect(() => {
//     if (nodes.length === 0 && nodeOptions.length > 0) {
//       setNodes(nodeOptions);
//     }
//   }, [nodeOptions]);

//   async function load() {
//     setLoading(true);
//     setErr("");

//     const activeNodes = nodes.length > 0 ? nodes : nodeOptions;

//     try {
//       const queries: Promise<Row[]>[] =
//         field === "all"
//           ? [
//               query(
//                 "temperature",
//                 activeNodes.filter((n) => n.startsWith("T"))
//               ),
//               query(
//                 "pressure",
//                 activeNodes.filter((n) => n.startsWith("P"))
//               ),
//               query(
//                 "humidity",
//                 activeNodes.filter((n) => n.startsWith("H"))
//               ),
//             ]
//           : [query(field, activeNodes)];

//       const merged = (await Promise.all(queries)).flat();
//       merged.sort((a, b) => +new Date(b.time) - +new Date(a.time));
//       setRows(merged);
//     } catch (e: any) {
//       setErr(e.message || String(e));
//       console.error("Load failed:", e);
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     load();
//     const id = setInterval(load, 10000);
//     return () => clearInterval(id);
//   }, [field, nodes]);

//   const niceRows = useMemo(
//     () =>
//       rows.map((r) => ({
//         ...r,
//         fieldLabel:
//           r.field === "temperature"
//             ? "Temperature"
//             : r.field === "pressure"
//             ? "Pressure"
//             : "Humidity",
//         timeLabel: new Date(r.time).toLocaleString(),
//         value: r.value,
//       })),
//     [rows]
//   );

//   return (
//     <div className="container">
//       <h2 className="section-title">Live Data Table (Last One Hour data)</h2>

//       <div className="controls">
//         <Dropdown
//           value={field}
//           options={FIELD_OPTS as any}
//           onChange={(e: DropdownChangeEvent) => setField(e.value)}
//           className="select"
//           placeholder="Field"
//         />
//         <MultiSelect
//           value={nodes}
//           options={nodeOptions.map((n) => ({ label: n, value: n }))}
//           onChange={(e: MultiSelectChangeEvent) =>
//             setNodes(e.value as string[])
//           }
//           display="chip"
//           placeholder={nodes.length ? "Nodes…" : "All nodes"}
//           className="select"
//         />
//         <Button
//           icon="pi pi-refresh"
//           label="Refresh"
//           onClick={load}
//           disabled={loading}
//           className="btn"
//         />
//         <Button
//           icon="pi pi-download"
//           label="Export"
//           onClick={() => dtRef.current?.exportCSV()}
//           className="btn"
//         />
//       </div>

//       {err ? <p style={{ color: "crimson" }}>Error: {err}</p> : null}

//       <DataTable
//         ref={dtRef}
//         value={niceRows}
//         loading={loading}
//         paginator
//         rows={20}
//         rowsPerPageOptions={[10, 20, 50]}
//         stripedRows
//         size="small"
//         emptyMessage="No data in the last 1 hour."
//         className="card table"
//       >
//         <Column field="fieldLabel" header="Field" sortable />
//         <Column field="node" header="Node" sortable />
//         <Column field="timeLabel" header="Time" sortable />
//         <Column
//           field="value"
//           header="Value"
//           body={(row) => row.value?.toFixed(2) ?? "—"}
//           sortable
//         />
//       </DataTable>
//     </div>
//   );
// }

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
import "../style.css";

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

// ──────────────────────────────────────────────────────────────
// 1. Query function – talks to /api/influx/query
// ──────────────────────────────────────────────────────────────
async function query(
  field: "temperature" | "pressure" | "humidity",
  nodes: string[]
): Promise<Row[]> {
  const params = new URLSearchParams({
    field,
    range: "-1h",
    limit: "8000",
  });

  try {
    const res = await fetch(`/api/influx/query?${params.toString()}`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
    }

    const data: any[] = await res.json();
    if (!Array.isArray(data)) return [];

    return data
      .filter((r) => {
        const nodeId = String(r.sensor_id ?? "");
        return nodes.length === 0 || nodes.includes(nodeId);
      })
      .map((r) => ({
        field,
        node: String(r.sensor_id ?? "unknown"),
        time: r._time,
        value: Number(r._value),
      }));
  } catch (error: any) {
    console.error("[Influx Query Error]", error);
    throw error;
  }
}

// ──────────────────────────────────────────────────────────────
// 2. Main Component
// ──────────────────────────────────────────────────────────────
export default function LiveDataTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const dtRef = useRef<any>(null);

  const [field, setField] = useState<
    "all" | "temperature" | "pressure" | "humidity"
  >("all");
  const [allNodes, setAllNodes] = useState<string[]>([]);
  const [nodes, setNodes] = useState<string[]>([]);

  // ── Load sensor IDs ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          "/api/influx/tag-values?measurement=weather&tag=sensor_id",
          {
            method: "GET",
            credentials: "include",
          }
        );
        if (!res.ok) throw new Error(`Failed to load nodes: ${res.status}`);
        const data: string[] = await res.json();
        setAllNodes(data);
      } catch (e: any) {
        setErr(e.message);
        console.error("Failed to load nodes:", e);
      }
    })();
  }, []);

  // ── Filter nodes by field ─────────────────────────────────
  const nodeOptions = useMemo(() => {
    if (field === "temperature")
      return allNodes.filter((n) => n.startsWith("T"));
    if (field === "pressure") return allNodes.filter((n) => n.startsWith("P"));
    if (field === "humidity") return allNodes.filter((n) => n.startsWith("H"));
    return allNodes;
  }, [allNodes, field]);

  // Reset invalid selections
  useEffect(() => {
    const valid = new Set(nodeOptions);
    setNodes((prev) => prev.filter((n) => valid.has(n)));
  }, [nodeOptions]);

  // Auto-select all valid nodes if none selected
  useEffect(() => {
    if (nodes.length === 0 && nodeOptions.length > 0) {
      setNodes(nodeOptions);
    }
  }, [nodeOptions, nodes.length]);

  // ── Load data ─────────────────────────────────────────────
  async function load() {
    setLoading(true);
    setErr("");

    const activeNodes = nodes.length > 0 ? nodes : nodeOptions;

    try {
      const queries: Promise<Row[]>[] =
        field === "all"
          ? [
              query(
                "temperature",
                activeNodes.filter((n) => n.startsWith("T"))
              ),
              query(
                "pressure",
                activeNodes.filter((n) => n.startsWith("P"))
              ),
              query(
                "humidity",
                activeNodes.filter((n) => n.startsWith("H"))
              ),
            ]
          : [query(field as any, activeNodes)];

      const merged = (await Promise.all(queries)).flat();
      merged.sort((a, b) => +new Date(b.time) - +new Date(a.time));
      setRows(merged);
    } catch (e: any) {
      setErr(e.message || "Unknown error");
      console.error("Load failed:", e);
    } finally {
      setLoading(false);
    }
  }

  // Auto-refresh every 10 seconds
  useEffect(() => {
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [field, nodes]);

  // ── Format rows for display ───────────────────────────────
  const niceRows = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        fieldLabel:
          r.field === "temperature"
            ? "Temperature"
            : r.field === "pressure"
            ? "Pressure"
            : "Humidity",
        timeLabel: new Date(r.time).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: true,
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        valueLabel: r.value.toFixed(r.field === "pressure" ? 2 : 1),
      })),
    [rows]
  );

  return (
    <div className="container">
      <h2 className="section-title">Live Data Table (Last 1 Hour)</h2>

      <div className="controls">
        <Dropdown
          value={field}
          options={FIELD_OPTS as any}
          onChange={(e: DropdownChangeEvent) => setField(e.value)}
          className="select"
          placeholder="Select Field"
        />
        <MultiSelect
          value={nodes}
          options={nodeOptions.map((n) => ({ label: n, value: n }))}
          onChange={(e: MultiSelectChangeEvent) =>
            setNodes(e.value as string[])
          }
          display="chip"
          placeholder={nodes.length ? `${nodes.length} selected` : "All nodes"}
          className="select"
        />
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          onClick={load}
          disabled={loading}
          loading={loading}
          className="btn"
        />
        <Button
          icon="pi pi-download"
          label="Export"
          onClick={() => dtRef.current?.exportCSV()}
          className="btn"
        />
      </div>

      {err && (
        <p style={{ color: "crimson", margin: "10px 0" }}>Error: {err}</p>
      )}

      <DataTable
        ref={dtRef}
        value={niceRows}
        loading={loading}
        paginator
        rows={20}
        rowsPerPageOptions={[10, 20, 50, 100]}
        stripedRows
        size="small"
        emptyMessage="No data in the last 1 hour."
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
          header="Node"
          sortable
          style={{ minWidth: "100px" }}
        />
        <Column
          field="valueLabel"
          header="Value"
          body={(row) => (
            <span
              style={{
                color:
                  row.field === "temperature"
                    ? "#ff6b35"
                    : row.field === "humidity"
                    ? "#4ecdc4"
                    : "#45b7d1",
                fontWeight: "bold",
              }}
            >
              {row.valueLabel}
            </span>
          )}
          sortable
          style={{ minWidth: "100px" }}
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
