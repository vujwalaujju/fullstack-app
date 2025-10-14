import "dotenv/config";
import { InfluxDB, Point } from "@influxdata/influxdb-client";

let controller = null; // singleton guard

/**
 * Starts a weather sensor simulator:
 * - measurement: "weather"
 * - tags: sensor_id ("sensor_001", "sensor_002", "sensor_003")
 * - fields: temperature, humidity, pressure
 * - values: random realistic values every tick (default 1s)
 */
export function startEnvWeatherSimulation(opts = {}) {
  if (controller?.running) return controller;

  const { INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET } = process.env;
  if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
    throw new Error(
      "Missing env for Influx (INFLUX_URL/INFLUX_TOKEN/INFLUX_ORG/INFLUX_BUCKET)"
    );
  }

  // ---- config knobs ----
  const sensorIds = opts.sensorIds || [
    "sensor_001",
    "sensor_002",
    "sensor_003",
  ];
  const tickMs = Number(opts.tickMs ?? 1000); // 1s by default
  const durationMs = Number(opts.durationMs ?? 0); // 0 = run until stopped

  const client = new InfluxDB({ url: INFLUX_URL, token: INFLUX_TOKEN });
  const writeApi = client.getWriteApi(INFLUX_ORG, INFLUX_BUCKET, "ns", {
    batchSize: 1,
    flushInterval: 1000,
  });

  const rand = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);

  const startedAt = Date.now();
  let running = true;
  let timer = null;
  let points = 0;

  function tick() {
    const now = BigInt(Date.now()) * 1_000_000n;

    for (const id of sensorIds) {
      const p = new Point("weather")
        .tag("sensor_id", id)
        .floatField("temperature", rand(25.0, 27.0))
        .floatField("humidity", rand(49.0, 52.0))
        .floatField("pressure", rand(1013.0, 1013.6))
        .timestamp(now);
      writeApi.writePoint(p);
      points++;
    }

    if (durationMs > 0 && Date.now() - startedAt >= durationMs) {
      stop("Finished by duration");
    }
  }

  function stop(reason = "Stopped") {
    if (!running) return;
    running = false;
    if (timer) clearInterval(timer);
    writeApi
      .close()
      .then(() =>
        console.log(`${reason}. Flushed. Points written (queued): ${points}`)
      )
      .catch((e) => console.error("Error closing writeApi:", e));
  }

  timer = setInterval(tick, tickMs);
  console.log(
    `Weather Simulation started: tick=${tickMs}ms, duration=${
      durationMs || "∞"
    }ms, sensorIds=${sensorIds.join(",")}`
  );

  controller = {
    running: true,
    startedAt,
    durationMs,
    tickMs,
    points: () => points,
    stop,
  };
  return controller;
}

export function stopWeatherSensorSimulation() {
  if (controller?.running) controller.stop("Stopped by request");
  return controller;
}

export function weatherSimStatus() {
  if (!controller) return { running: false };
  const { running, startedAt, durationMs, tickMs } = controller;
  return {
    running,
    startedAt,
    durationMs,
    tickMs,
    points: controller.points(),
  };
}

export default startEnvWeatherSimulation;
