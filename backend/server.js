import express from "express";
import cors from "cors";
import { InfluxDB, Point } from "@influxdata/influxdb-client";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 5297;

app.use(
  cors({
    origin: [
      "http://localhost:5175",
      "http://localhost:3000",
      "http://localhost:5055",
      "http://localhost:5174",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.static("public"));

const influxUrl = process.env.INFLUX_URL || "http://localhost:8086";
const influxToken = process.env.INFLUX_TOKEN || "";
const influxOrg = process.env.INFLUX_ORG || "actalent";
const influxBucket = process.env.INFLUX_BUCKET || "weather_update";

const client = new InfluxDB({ url: influxUrl, token: influxToken });
const writeApi = client.getWriteApi(influxOrg, influxBucket);

const sensors = ["T1", "T2", "T3", "P1", "P2", "P3", "H1", "H2"];
const types = { T: "temperature", P: "pressure", H: "humidity" };

function generateValue(type) {
  if (type === "temperature") return Math.random() * 30 + 15;
  if (type === "pressure") return Math.random() * 20 + 1010;
  return Math.random() * 40 + 50;
}

setInterval(() => {
  sensors.forEach((id) => {
    const prefix = id[0];
    const type = types[prefix];
    const value = generateValue(type);
    const point = new Point("weather")
      .tag("sensor_id", id)
      .floatField(type, value)
      .timestamp(new Date());
    writeApi.writePoint(point);
  });
  writeApi
    .flush()
    .then(() => {
      const temp = generateValue("temperature").toFixed(1);
      const press = generateValue("pressure").toFixed(0);
      const hum = generateValue("humidity").toFixed(1);
    })
    .catch((error) => {
      console.error("Write error:", error);
    });
}, 2000);

app.get("/api/influx/measurements", (req, res) => {
  res.json(["weather"]);
});

app.get("/api/influx/tag-values", async (req, res) => {
  try {
    const queryApi = client.getQueryApi(influxOrg);
    const fluxQuery = `
      from(bucket: "${influxBucket}")
        |> range(start: -1h)
        |> keep(columns: ["sensor_id"])
        |> distinct()
        |> sort()
    `;
    const result = await queryApi.collectRows(fluxQuery);
    const values = [
      ...new Set(result.map((row) => row.sensor_id).filter(Boolean)),
    ];
    res.json(values.length ? values : sensors);
  } catch (error) {
    console.error("Tag-values error:", error);
    res.json(sensors);
  }
});

app.get("/api/influx/query", async (req, res) => {
  try {
    const { field, range = "-1h", limit = "8000" } = req.query;
    const queryApi = client.getQueryApi(influxOrg);
    const fluxQuery = `
      from(bucket: "${influxBucket}")
        |> range(start: ${range})
        |> filter(fn: (r) => r._field == "${field}")
        |> filter(fn: (r) => exists r._value)
        |> limit(n: ${limit})
    `;
    const result = await queryApi.collectRows(fluxQuery);
    res.json(result);
  } catch (error) {
    console.error("Query error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({
    message: "Weather API is running!",
    endpoints: {
      health: "/health",
      measurements: "/api/influx/measurements",
      tagValues: "/api/influx/tag-values",
      query:
        "/api/influx/query?field=[temperature|pressure|humidity]&range=-1h&limit=8000",
    },
  });
});

app.listen(PORT, () => {});
