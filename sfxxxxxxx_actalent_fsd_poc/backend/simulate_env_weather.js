import "dotenv/config";
import { InfluxDB, Point } from "@influxdata/influxdb-client";

let controller = null;

export function startEnvWeatherSimulation(opts = {}) {
  if (controller?.running) return controller;

  const { INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG, INFLUX_BUCKET } = process.env;
  if (!INFLUX_URL || !INFLUX_TOKEN || !INFLUX_ORG || !INFLUX_BUCKET) {
    throw new Error(
      "Missing env for Influx (INFLUX_URL/INFLUX_TOKEN/INFLUX_ORG/INFLUX_BUCKET)"
    );
  }

  // ✅ FIXED: T1,P1,H1 tags (matches UI!)
  const sensorIds = opts.sensorIds || ["T1", "P1", "H1"];
  const tickMs = Number(opts.tickMs ?? 2000);
  const durationMs = Number(opts.durationMs ?? 0);

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
      const prefix = id[0]; // T,P,H
      const p = new Point("weather")
        .tag("sensor_id", id) // ✅ T1,P1,H1
        .floatField("temperature", prefix === "T" ? rand(15, 30) : 0)
        .floatField("humidity", prefix === "H" ? rand(50, 90) : 0)
        .floatField("pressure", prefix === "P" ? rand(1010, 1020) : 0)
        .timestamp(now);
      writeApi.writePoint(p);
      points++;
    }
  }

  function stop(reason = "Stopped") {
    if (!running) return;
    running = false;
    if (timer) clearInterval(timer);
    writeApi
      .close()
      .then(() => console.log(`${reason}. Flushed. Points written: ${points}`))
      .catch((e) => console.error("Error closing writeApi:", e));
  }

  timer = setInterval(tick, tickMs);
  console.log(
    `✅ Weather Simulation: T1/P1/H1 | ${tickMs}ms | Bucket: ${INFLUX_BUCKET}`
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

export default startEnvWeatherSimulation;
