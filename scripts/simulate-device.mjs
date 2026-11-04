#!/usr/bin/env node
/**
 * Local device simulator for the microclimate API.
 *
 *   node scripts/simulate-device.mjs --count 5 --interval 2
 *   node scripts/simulate-device.mjs --count 0 --interval 60
 *   node scripts/simulate-device.mjs --optional
 *
 * The default payload matches the ESP32 firmware: temperature and humidity
 * only. `--optional` adds wind, CO2 and particulate fields so every map layer
 * can be exercised locally.
 */

const options = {
  url: process.env.SIMULATOR_API_URL ?? "http://127.0.0.1:8000/api/v1/measurements",
  station: process.env.SIMULATOR_STATION ?? "station-01",
  latitude: Number(process.env.SIMULATOR_LATITUDE ?? 32.0839058),
  longitude: Number(process.env.SIMULATOR_LONGITUDE ?? 118.6361144),
  interval: 3,
  count: 5,
  optional: false,
};

const argv = process.argv.slice(2);
for (let index = 0; index < argv.length; index += 1) {
  const arg = argv[index];
  if (arg === "--url") {
    options.url = argv[++index] ?? options.url;
  } else if (arg === "--station") {
    options.station = argv[++index] ?? options.station;
  } else if (arg === "--latitude") {
    options.latitude = Number(argv[++index] ?? options.latitude);
  } else if (arg === "--longitude") {
    options.longitude = Number(argv[++index] ?? options.longitude);
  } else if (arg === "--interval") {
    options.interval = Number(argv[++index] ?? options.interval);
  } else if (arg === "--count") {
    options.count = Number(argv[++index] ?? options.count);
  } else if (arg === "--optional") {
    options.optional = true;
  } else if (arg === "--help" || arg === "-h") {
    console.log(`Usage: node scripts/simulate-device.mjs [options]

  --url <url>        API endpoint (default ${options.url})
  --station <id>     station_id (default ${options.station})
  --latitude <deg>   device latitude (default ${options.latitude})
  --longitude <deg>  device longitude (default ${options.longitude})
  --interval <sec>   seconds between reports (default ${options.interval})
  --count <n>        reports to send, 0 = until Ctrl-C (default ${options.count})
  --optional         include wind, CO2, PM2.5 and PM10 fields
`);
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${arg}`);
    process.exit(1);
  }
}

if (!Number.isFinite(options.interval) || options.interval < 0) {
  console.error("--interval must be a non-negative number");
  process.exit(1);
}
if (!Number.isFinite(options.count) || options.count < 0 || !Number.isInteger(options.count)) {
  console.error("--count must be a non-negative integer");
  process.exit(1);
}
if (!options.station.trim() || options.station.trim().length > 64) {
  console.error("--station must be 1-64 characters");
  process.exit(1);
}
if (!Number.isFinite(options.latitude) || options.latitude < -90 || options.latitude > 90) {
  console.error("--latitude must be between -90 and 90");
  process.exit(1);
}
if (!Number.isFinite(options.longitude) || options.longitude < -180 || options.longitude > 180) {
  console.error("--longitude must be between -180 and 180");
  process.exit(1);
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let interrupted = false;
process.on("SIGINT", () => {
  interrupted = true;
  console.log("\nSimulator stopped.");
  process.exit(0);
});

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sample(index) {
  const now = Date.now();
  const phase = now / 1000;
  const payload = {
    station_id: options.station.trim(),
    latitude: options.latitude,
    longitude: options.longitude,
    observed_at: new Date(now).toISOString(),
    temperature: round(22 + 2.4 * Math.sin(phase / 140) + index * 0.03, 1),
    humidity: round(58 + 6 * Math.cos(phase / 170) - index * 0.05, 1),
  };
  if (options.optional) {
    payload.wind_speed = round(2.4 + 1.2 * Math.sin(phase / 90), 1);
    payload.wind_direction = round((110 + 80 * Math.sin(phase / 120)) % 360, 0);
    payload.co2 = round(700 + 120 * Math.sin(phase / 80), 0);
    payload.pm25 = round(18 + 8 * Math.sin(phase / 160), 0);
    payload.pm10 = round(34 + 12 * Math.sin(phase / 150), 0);
  }
  return payload;
}

let sent = 0;
while (!interrupted && (options.count === 0 || sent < options.count)) {
  const payload = sample(sent);
  try {
    const response = await fetch(options.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`${response.status} ${body}`);
    }
    sent += 1;
    console.log(
      `[${sent}] ${response.status} ${payload.station_id} ` +
        `${payload.temperature} °C / ${payload.humidity} % ` +
        `@ ${payload.latitude},${payload.longitude}` +
        `${options.optional ? " / optional sensors" : ""}`,
    );
  } catch (error) {
    console.error(`Report failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    break;
  }

  if (interrupted || (options.count !== 0 && sent >= options.count)) {
    break;
  }
  await sleep(options.interval * 1000);
}

console.log(`Sent ${sent} report${sent === 1 ? "" : "s"} to ${options.url}`);
