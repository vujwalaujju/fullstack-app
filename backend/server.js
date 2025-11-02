import express from "express";
import cors from "cors";
import { InfluxDB, Point } from "@influxdata/influxdb-client";
import dotenv from "dotenv";
import sqlite3 from "sqlite3";

dotenv.config();

const app = express();
const PORT = 5296;

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
const influxBucket = process.env.INFLUX_BUCKET || "weather";

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
    console.log(`Writing: ${id} ${type}=${value.toFixed(2)}`);
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

app.get("/api/influx/latest", async (req, res) => {
  try {
    console.log("Querying InfluxDB...");

    const query = `
      from(bucket: "${process.env.INFLUX_BUCKET}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "weather")
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> group(columns: ["node"])
        |> last()
        |> keep(columns: ["node", "temperature", "humidity", "pressure"])
    `;

    console.log("Flux Query:", query);
    console.log("Bucket:", process.env.INFLUX_BUCKET);
    console.log("Org:", process.env.INFLUX_ORG);

    const rows = await queryApi.collectRows(query);
    console.log("Query result:", rows);

    if (!rows || rows.length === 0) {
      return res.json([]);
    }

    res.json(rows);
  } catch (err) {
    console.error("QUERY FAILED:", err.message);
    console.error("Full error:", err);
    res
      .status(500)
      .json({ error: "Failed to query InfluxDB", details: err.message });
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

//SQLITE code

app.use(express.json());
app.use(express.static("public"));

// Helper: format timestamp in ISO‐like format (YYYY‑MM‑DD HH:MM:SS)
const IST_TIME = (timestamp = Date.now()) => {
  const now = new Date(timestamp);
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")} ${String(
    now.getHours()
  ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
    now.getSeconds()
  ).padStart(2, "0")}`;
};

const sqliteDb = new sqlite3.Database("./sensors.db");

// Simulate weather
function getIndianWeather() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour <= 18) {
    return {
      temperature: (28 + Math.random() * 7).toFixed(1),
      humidity: (50 + Math.random() * 35).toFixed(1),
      pressure: (1008 + Math.random() * 7).toFixed(2),
    };
  } else {
    return {
      temperature: (25 + Math.random() * 5).toFixed(1),
      humidity: (70 + Math.random() * 20).toFixed(1),
      pressure: (1010 + Math.random() * 8).toFixed(2),
    };
  }
}

sqliteDb.serialize(() => {
  sqliteDb.run(`DROP TABLE IF EXISTS weather`, (err) => {
    if (err) console.error("Drop table error:", err);

    sqliteDb.run(
      `CREATE TABLE weather (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        temperature REAL,
        humidity REAL,
        pressure REAL,
        node TEXT
      )`,
      (err2) => {
        if (err2) console.error("Create table error:", err2);
      }
    );
  });
});

const stations = ["Station1", "Station2", "Station3"];

// Insert new data every 2 seconds
setInterval(() => {
  const now = IST_TIME();
  stations.forEach((station) => {
    const { temperature, humidity, pressure } = getIndianWeather();
    sqliteDb.run(
      `INSERT INTO weather (timestamp, temperature, humidity, pressure, node)
       VALUES (?, ?, ?, ?, ?)`,
      [now, temperature, humidity, pressure, station],
      (err) => {
        if (err) console.error("Insert error:", err);
      }
    );
  });
}, 2000);

// Delete data older than 30 minutes for every 2 seconds
setInterval(() => {
  const cutoff = IST_TIME(Date.now() - 30 * 60 * 1000);
  sqliteDb.run(`DELETE FROM weather WHERE timestamp < ?`, [cutoff], (err) => {
    if (err) console.error("Delete error:", err);
  });
}, 2000);

app.get("/api/sqlite/kpi", (req, res) => {
  sqliteDb.all(
    `SELECT timestamp as time, temperature as temp, humidity as hum, pressure as press, node
     FROM weather
     ORDER BY timestamp DESC
     LIMIT 60`,
    [],
    (err, rows) => {
      if (err) {
        console.error("KPI query error:", err);
        return res.status(500).json({ error: err.message });
      }
      const sorted = rows.slice().reverse();
      const points = sorted.flatMap((row) => {
        return [
          {
            time: row.time,
            value: +row.temp,
            node: row.node,
            field: "temperature",
          },
          {
            time: row.time,
            value: +row.hum,
            node: row.node,
            field: "humidity",
          },
          {
            time: row.time,
            value: +row.press,
            node: row.node,
            field: "pressure",
          },
        ];
      });
      res.json({ points });
    }
  );
});

app.get("/api/sqlite/latest", (req, res) => {
  sqliteDb.all(
    `SELECT * FROM weather WHERE timestamp = (
       SELECT MAX(timestamp) FROM weather
     )`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Latest query error:", err);
        return res.status(500).json({ error: err.message });
      }

      const latest = {};
      rows.forEach((row) => {
        latest[row.node] = row;
      });

      return res.json({
        temperature: latest["Station1"]?.temperature || 0,
        humidity: latest["Station1"]?.humidity || 0,
        pressure: latest["Station1"]?.pressure || 0,
        all: latest,
      });
    }
  );
});

app.get("/api/sqlite/readings", (req, res) => {
  sqliteDb.all(
    `SELECT * FROM weather
     ORDER BY timestamp DESC
     LIMIT 60`,
    [],
    (err, rows) => {
      if (err) {
        console.error("Readings error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json(rows.slice().reverse());
    }
  );
});

app.get("/api/sqlite/debug", (req, res) => {
  sqliteDb.get(
    `SELECT * FROM weather ORDER BY id DESC LIMIT 1`,
    [],
    (err, row) => {
      if (err) {
        console.error("Debug error:", err);
        return res.status(500).json({ error: err.message });
      }
      res.json({
        timestamp: row?.timestamp,
        sample: row,
      });
    }
  );
});

app.get("/health", (req, res) => res.json({ status: "OK" }));
app.get("/", (req, res) => res.json({ message: "Weather API OK" }));

// app.listen(PORT, () => {});
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Weather API running at http://0.0.0.0:${PORT}`);
});
