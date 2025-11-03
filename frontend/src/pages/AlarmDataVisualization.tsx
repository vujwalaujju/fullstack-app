/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Gauge from "../components/SqliteGauge";
import Kpi from "../components/SqliteKpiSummary";
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
import { Card } from "primereact/card";
import { Dropdown, type DropdownChangeEvent } from "primereact/dropdown";

const API_BASE = "http://localhost:5296/api/sqlite";

type KpiPoint = { time: string | number; value: number; node: string };
type Row = {
  timestamp: string;
  temperature: number;
  humidity: number;
  pressure: number;
  node: string;
};

export default function SqliteDashboard() {
  const [currentIST, setCurrentIST] = useState("");
  const [kpiPoints, setKpiPoints] = useState<KpiPoint[]>([]);
  const [latestValues, setLatestValues] = useState({
    temperature: 0,
    humidity: 0,
    pressure: 0,
  });
  const [field, setField] = useState<"temperature" | "humidity" | "pressure">(
    "temperature"
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [stations, setStations] = useState([
    "Station1",
    "Station2",
    "Station3",
  ]);
  const lastTsRef = useRef<string>("");

  // 🔥 LIVE IST TIME ON TOP
  useEffect(() => {
    const updateTime = () => {
      setCurrentIST(
        new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour12: true,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // async function loadData() {
  //   try {
  //     const [kpiRes, latestRes, readingsRes] = await Promise.all([
  //       axios.get(`${API_BASE}/kpi`),
  //       axios.get(`${API_BASE}/latest`),
  //       axios.get(`${API_BASE}/readings`),
  //     ]);

  //     const newRows = readingsRes.data;
  //     const newest = newRows.length
  //       ? newRows[newRows.length - 1].timestamp
  //       : "";
  //     if (newest && newest !== lastTsRef.current) {
  //       lastTsRef.current = newest;
  //       setRows(newRows);
  //     }

  //     setKpiPoints(kpiRes.data.points);
  //     setLatestValues(latestRes.data);
  //   } catch (error) {
  //     console.error("Fetch error:", error);
  //   }
  // }
  async function loadData() {
    try {
      const [kpiRes, latestRes, readingsRes] = await Promise.all([
        axios.get(`${API_BASE}/kpi`),
        axios.get(`${API_BASE}/latest`),
        axios.get(`${API_BASE}/readings`),
      ]);

      console.log("🔍 DEBUG - KPI points:", kpiRes.data.points?.length || 0); // ✅ ADD THIS
      console.log("🔍 DEBUG - Rows:", readingsRes.data.length); // ✅ ADD THIS

      const newRows = readingsRes.data;
      const newest = newRows.length
        ? newRows[newRows.length - 1].timestamp
        : "";
      if (newest && newest !== lastTsRef.current) {
        lastTsRef.current = newest;
        setRows(newRows);
      }

      setKpiPoints(kpiRes.data.points || []);
      setLatestValues(latestRes.data);
    } catch (error) {
      console.error("❌ Fetch error:", error);
    }
  }

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 1000);
    return () => clearInterval(id);
  }, [field]);

  const chartData = React.useMemo(() => {
    const dataMap = new Map();
    rows.slice(-60).forEach((row) => {
      const isoTime = row.timestamp.replace(" ", "T");
      const time = new Date(isoTime).toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
      });
      if (!dataMap.has(time)) dataMap.set(time, {});
      dataMap.get(time)[row.node] = Number(row[field]);
    });
    return Array.from(dataMap.entries()).map(([time, values]) => ({
      time,
      ...values,
    }));
  }, [rows, field]);

  const FIELDS = [
    { label: "Temperature", value: "temperature" },
    { label: "Humidity", value: "humidity" },
    { label: "Pressure", value: "pressure" },
  ];

  return (
    <div className="container">
      <Card className="mb-3">
        <div className="p-3">
          <h3 className="mt-0 mb-3 heading">Live Graph1 - ALL STATIONS</h3>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "15px",
            }}
          >
            <Dropdown
              value={field}
              options={FIELDS}
              onChange={(e: DropdownChangeEvent) => setField(e.value as any)}
              placeholder="Select Parameter"
              className="w-12rem"
            />
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  interval={Math.max(0, chartData.length - 10)}
                  angle={-45}
                  textAnchor="end"
                  height={70}
                >
                  <Label value="Time" position="insideBottomRight" offset={0} />
                </XAxis>
                <YAxis
                  label={{
                    value:
                      field === "pressure"
                        ? "Pressure (hPa)"
                        : field === "humidity"
                        ? "Humidity (%)"
                        : "Temperature (°C)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 10,
                  }}
                />
                <Tooltip
                  labelFormatter={(label) => `🕐 ${label}`}
                  formatter={(value) => [
                    `${value} ${
                      field === "pressure"
                        ? "hPa"
                        : field === "humidity"
                        ? "%"
                        : "°C"
                    }`,
                    "",
                  ]}
                />
                <Legend />
                {stations.map((station) => (
                  <Line
                    key={station}
                    type="monotone"
                    dataKey={station}
                    name={station}
                    stroke={
                      station === "Station1"
                        ? "#ff6b35"
                        : station === "Station2"
                        ? "#4ecdc4"
                        : "#45b7d1"
                    }
                    strokeWidth={3}
                    dot={{ fill: "#fff", strokeWidth: 2 }}
                    isAnimationActive={true}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
      <h3 className="mt-0 mb-3">LIVE GAUGES - Station1</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "25px",
          marginBottom: "40px",
        }}
      >
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <h3 style={{ color: "#ff6b35", marginBottom: "15px" }}>
            🌡️ TEMPERATURE
          </h3>
          <Gauge
            value={latestValues.temperature}
            field="temperature"
            color="#ff6b35"
            min={20}
            max={40}
            height={250}
            nodeId={""}
          />
        </div>
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <h3 style={{ color: "#4ecdc4", marginBottom: "15px" }}>
            💧 HUMIDITY
          </h3>
          <Gauge
            value={latestValues.humidity}
            field="humidity"
            color="#4ecdc4"
            min={0}
            max={100}
            height={250}
            nodeId={""}
          />
        </div>
        <div className="card" style={{ textAlign: "center", padding: "20px" }}>
          <h3 style={{ color: "#45b7d1", marginBottom: "15px" }}>
            🌪️ PRESSURE
          </h3>
          <Gauge
            value={latestValues.pressure}
            field="pressure"
            color="#45b7d1"
            min={1000}
            max={1020}
            height={250}
            nodeId={""}
          />
        </div>
      </div>

      <h3 className="mt-0 mb-3">KPI SUMMARY - ALL STATIONS (Live)</h3>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "25px",
        }}
      >
        <div className="card">
          <Kpi
            title="Temperature"
            unit="°C"
            accent="#ff6b35"
            points={kpiPoints.filter((p) => p.value < 50)}
            warnHigh={35}
          />
        </div>
        <div className="card">
          <Kpi
            title="Humidity"
            unit="%"
            accent="#4ecdc4"
            points={kpiPoints.filter((p) => p.value < 100)}
            warnHigh={90}
          />
        </div>
        <div className="card">
          <Kpi
            title="Pressure"
            unit="hPa"
            accent="#45b7d1"
            points={kpiPoints.filter((p) => p.value > 1000)}
            warnHigh={1018}
          />
        </div>
      </div>
    </div>
  );
}
