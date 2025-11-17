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

      "http://localhost:3001",
      "http://localhost:5174",
      "http://localhost:5173",
      "http://10.188.10.151:3001",
      "http://10.188.10.151:5174",
      "http://10.188.10.151:5173",
      "http://10.188.10.151:5172",
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
const queryApi = client.getQueryApi(influxOrg);

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
    const { measurement = "weather", tag = "sensor_id" } = req.query;

    const query = `
      import "influxdata/influxdb/schema"
      schema.tagValues(
        bucket: "${influxBucket}",
        tag: "${tag}",
        predicate: (r) => r._measurement == "${measurement}"
      )
    `;

    const rows = await queryApi.collectRows(query);
    const values = [...new Set(rows.map((r) => r._value))]
      .filter(Boolean)
      .sort();

    res.json(values);
  } catch (err) {
    console.error("Tag values error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/influx/latest", async (req, res) => {
  try {
    const query = `
      from(bucket: "${influxBucket}")
        |> range(start: -1h)
        |> filter(fn: (r) => r._measurement == "weather")
        |> last()
        |> pivot(rowKey: ["_time"], columnKey: ["_field"], valueColumn: "_value")
        |> group(columns: ["sensor_id"])
        |> keep(columns: ["sensor_id", "temperature", "humidity", "pressure"])
    `;

    const rows = await queryApi.collectRows(query);

    const result = rows
      .map((r) => ({
        node: r.sensor_id,
        temperature: r.temperature,
        humidity: r.humidity,
        pressure: r.pressure,
      }))
      .filter((r) => r.node);

    res.json(result);
  } catch (err) {
    console.error("Query error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/influx/query", async (req, res) => {
  try {
    const { field, range = "-1h", limit = "8000" } = req.query;
    if (!field) throw new Error("Missing field");

    const query = `
      from(bucket: "${influxBucket}")
        |> range(start: ${range})
        |> filter(fn: (r) => r._measurement == "weather")
        |> filter(fn: (r) => r._field == "${field}")
        |> limit(n: ${limit})
    `;

    const rows = await queryApi.collectRows(query);
    res.json(rows);
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: err.message });
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

//format timestamp in ISO‐like format
// const IST_TIME = (timestamp = Date.now()) => {
//   const now = new Date(timestamp);
//   return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
//     2,
//     "0"
//   )}-${String(now.getDate()).padStart(2, "0")} ${String(
//     now.getHours()
//   ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
//     now.getSeconds()
//   ).padStart(2, "0")}`;
// };

const IST_TIME = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  const IST_OFFSET = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(date.getTime() + IST_OFFSET);
  return istDate.toISOString().slice(0, 19).replace("T", " ");
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

// sqliteDb.serialize(() => {
//   sqliteDb.run(`DROP TABLE IF EXISTS weather`, (err) => {
//     if (err) console.error("Drop table error:", err);

//     sqliteDb.run(
//       `CREATE TABLE weather (
//         id INTEGER PRIMARY KEY AUTOINCREMENT,
//         timestamp TEXT,
//         temperature REAL,
//         humidity REAL,
//         pressure REAL,
//         node TEXT
//       )`,
//       (err2) => {
//         if (err2) console.error("Create table error:", err2);
//       }
//     );
//   });
// });

// === 1. SCHEMA (Run once at startup) ===
sqliteDb.serialize(() => {
  sqliteDb.run(`DROP TABLE IF EXISTS weather`);
  sqliteDb.run(`
    CREATE TABLE IF NOT EXISTS weather (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      temperature REAL,
      humidity REAL,
      pressure REAL,
      node TEXT
    )
  `);

  sqliteDb.run(
    `CREATE INDEX IF NOT EXISTS idx_timestamp ON weather(timestamp)`
  );
});

setInterval(() => {
  const now = IST_TIME();
  const values = [];
  const placeholders = [];

  stations.forEach((station) => {
    const weather = getIndianWeather();
    placeholders.push("(?, ?, ?, ?, ?)");
    values.push(
      now,
      weather.temperature,
      weather.humidity,
      weather.pressure,
      station
    );
  });

  const sql = `
    INSERT INTO weather (timestamp, temperature, humidity, pressure, node)
    VALUES ${placeholders.join(", ")}
  `;

  sqliteDb.run(sql, values, function (err) {
    if (err) {
      console.error("SQLite Insert Error:", err);
    } else {
      console.log(`Inserted ${this.changes} rows at ${now}`);
    }
  });
}, 2000);

setInterval(() => {
  const cutoff = IST_TIME(Date.now() - 30 * 60 * 1000); // 30 minutes ago
  sqliteDb.run(
    `DELETE FROM weather WHERE timestamp < ?`,
    [cutoff],
    function (err) {
      if (err) {
        console.error("SQLite Delete Error:", err);
      } else if (this.changes > 0) {
        console.log(`Deleted ${this.changes} old rows before ${cutoff}`);
      }
    }
  );
}, 30_000);
const stations = ["Station1", "Station2", "Station3"];

// setInterval(() => {
//   const now = IST_TIME();
//   stations.forEach((station) => {
//     const { temperature, humidity, pressure } = getIndianWeather();
//     sqliteDb.run(
//       `INSERT INTO weather (timestamp, temperature, humidity, pressure, node)
//        VALUES (?, ?, ?, ?, ?)`,
//       [now, temperature, humidity, pressure, station],
//       (err) => {
//         if (err) console.error("Insert error:", err);
//       }
//     );
//   });
// }, 2000);

// setInterval(() => {
//   const cutoff = IST_TIME(Date.now() - 30 * 60 * 1000);
//   sqliteDb.run(`DELETE FROM weather WHERE timestamp < ?`, [cutoff], (err) => {
//     if (err) console.error("Delete error:", err);
//   });
// }, 2000);

app.get("/api/sqlite/latest", (req, res) => {
  sqliteDb.all(
    `
    SELECT node, temperature, humidity, pressure, timestamp
    FROM weather
    WHERE timestamp = (SELECT MAX(timestamp) FROM weather)
    ORDER BY node
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const latest = {};
      rows.forEach((r) => {
        latest[r.node] = {
          temperature: parseFloat(r.temperature),
          humidity: parseFloat(r.humidity),
          pressure: parseFloat(r.pressure),
          timestamp: r.timestamp,
        };
      });

      res.json({
        currentTime: IST_TIME(),
        data: latest,
        count: rows.length,
      });
    }
  );
});

// 2. KPI: Chart data (last ~2 minutes, 3 points per station per batch)
app.get("/api/sqlite/kpi", (req, res) => {
  sqliteDb.all(
    `
    SELECT 
      timestamp as time, 
      temperature, 
      humidity, 
      pressure, 
      node
    FROM weather
    ORDER BY timestamp DESC
    LIMIT 180  -- 3 stations × 60 batches = 180 rows (~2 min)
    `,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      const reversed = rows.reverse(); // oldest → newest
      const points = reversed.flatMap((row) => [
        {
          time: row.time,
          value: +row.temperature,
          node: row.node,
          field: "temperature",
        },
        {
          time: row.time,
          value: +row.humidity,
          node: row.node,
          field: "humidity",
        },
        {
          time: row.time,
          value: +row.pressure,
          node: row.node,
          field: "pressure",
        },
      ]);

      res.json({
        points,
        currentTime: IST_TIME(),
        totalPoints: points.length,
      });
    }
  );
});
// app.get("/api/sqlite/kpi", (req, res) => {
//   sqliteDb.all(
//     `SELECT timestamp as time, temperature as temp, humidity as hum, pressure as press, node
//      FROM weather
//      ORDER BY timestamp DESC
//      LIMIT 60`,
//     [],
//     (err, rows) => {
//       if (err) {
//         console.error("KPI query error:", err);
//         return res.status(500).json({ error: err.message });
//       }
//       const sorted = rows.slice().reverse();
//       const points = sorted.flatMap((row) => {
//         return [
//           {
//             time: row.time,
//             value: +row.temp,
//             node: row.node,
//             field: "temperature",
//           },
//           {
//             time: row.time,
//             value: +row.hum,
//             node: row.node,
//             field: "humidity",
//           },
//           {
//             time: row.time,
//             value: +row.press,
//             node: row.node,
//             field: "pressure",
//           },
//         ];
//       });
//       res.json({ points });
//     }
//   );
// });

// app.get("/api/sqlite/latest", (req, res) => {
//   sqliteDb.all(
//     `SELECT * FROM weather WHERE timestamp = (
//        SELECT MAX(timestamp) FROM weather
//      )`,
//     [],
//     (err, rows) => {
//       if (err) {
//         console.error("Latest query error:", err);
//         return res.status(500).json({ error: err.message });
//       }

//       const latest = {};
//       rows.forEach((row) => {
//         latest[row.node] = row;
//       });

//       return res.json({
//         temperature: latest["Station1"]?.temperature || 0,
//         humidity: latest["Station1"]?.humidity || 0,
//         pressure: latest["Station1"]?.pressure || 0,
//         all: latest,
//       });
//     }
//   );
// });

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
