#!/usr/bin/env python3
"""End-to-end regression client for the running measurement API."""

import argparse
from datetime import datetime, timezone
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class Client:
    def __init__(self, base_url):
        self.base_url = base_url.rstrip("/")

    def call(self, method, path, payload=None, headers=None, raw_body=None):
        request_headers = dict(headers or {})
        data = None
        if payload is not None:
            data = json.dumps(payload, allow_nan=False).encode("utf-8")
            request_headers.setdefault("Content-Type", "application/json")
        elif raw_body is not None:
            data = raw_body

        request = Request(
            f"{self.base_url}{path}",
            data=data,
            headers=request_headers,
            method=method,
        )
        try:
            with urlopen(request, timeout=10) as response:
                body = response.read()
                status = response.status
                response_headers = dict(response.headers.items())
        except HTTPError as error:
            body = error.read()
            status = error.code
            response_headers = dict(error.headers.items())
        except URLError as error:
            raise AssertionError(f"{method} {path} failed: {error}") from error

        try:
            parsed = json.loads(body) if body else None
        except json.JSONDecodeError:
            parsed = body.decode("utf-8", errors="replace")
        return status, parsed, response_headers


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def utc_now():
    return datetime.now(timezone.utc)


def parse_timestamp(value):
    require(isinstance(value, str) and value, f"invalid timestamp: {value!r}")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    require(parsed.tzinfo is not None, f"timestamp lacks timezone: {value!r}")
    return parsed.astimezone(timezone.utc)


def expect_status(client, method, path, expected, **kwargs):
    status, body, headers = client.call(method, path, **kwargs)
    require(status == expected, f"{method} {path}: expected {expected}, got {status}: {body!r}")
    return body, headers


def measurement(station_id, **overrides):
    payload = {
        "station_id": station_id,
        "observed_at": "2026-01-01T08:00:00+08:00",
        "wind_speed": 2.8,
        "wind_direction": 135,
        "temperature": 21.6,
        "humidity": 63,
        "co2": 418,
        "pm25": 18,
        "pm10": 34,
    }
    payload.update(overrides)
    return payload


def device_measurement(station_id, **overrides):
    payload = {
        "station_id": station_id,
        "observed_at": "2026-01-01T09:00:00+08:00",
        "temperature": -3.7,
        "humidity": 49.3,
    }
    payload.update(overrides)
    return payload


def run(base_url):
    client = Client(base_url)
    run_id = f"e2e-{int(utc_now().timestamp())}"
    optional_fields = ("wind_speed", "wind_direction", "co2", "pm25", "pm10")

    health, _ = expect_status(client, "GET", "/health", 200)
    require(health == {"status": "ok"}, f"unexpected health response: {health!r}")
    print("PASS health")

    openapi, _ = expect_status(client, "GET", "/openapi.json", 200)
    schemas = openapi.get("components", {}).get("schemas", {})
    create_schema = schemas["MeasurementCreate"]
    required = set(create_schema.get("required", []))
    require({"station_id", "temperature", "humidity"} <= required, "required fields missing")
    for field in optional_fields:
        require(field not in required, f"{field} must be optional")
        variants = create_schema["properties"][field].get("anyOf", [])
        require(any(item.get("type") == "null" for item in variants), f"{field} must allow null")
    print("PASS openapi schema")

    full, _ = expect_status(client, "POST", "/api/v1/measurements", 201, payload=measurement(f"{run_id}-full"))
    require(full["station_id"] == f"{run_id}-full", "station_id mismatch")
    require(full["observed_at"] == "2026-01-01T00:00:00Z", f"unexpected observed_at: {full['observed_at']}")
    require(isinstance(full["id"], int), "id must be an integer")
    require(parse_timestamp(full["received_at"]).tzinfo is not None, "received_at lacks timezone")
    expect_status(
        client,
        "POST",
        "/api/v1/measurements",
        201,
        payload=measurement("x" * 64),
    )
    print("PASS create full measurement")

    partial, _ = expect_status(client, "POST", "/api/v1/measurements", 201, payload=device_measurement(f"{run_id}-partial"))
    require(partial["temperature"] == -3.7, "temperature mismatch")
    require(partial["humidity"] == 49.3, "humidity mismatch")
    for field in optional_fields:
        require(partial[field] is None, f"{field} must be null")
    print("PASS create device measurement")

    explicit_nulls = device_measurement(f"{run_id}-nulls")
    explicit_nulls.pop("observed_at")
    explicit_nulls.update({field: None for field in optional_fields})
    nulls, _ = expect_status(client, "POST", "/api/v1/measurements", 201, payload=explicit_nulls)
    require(nulls["observed_at"] is not None, "server must default observed_at")
    require(abs((utc_now() - parse_timestamp(nulls["observed_at"])).total_seconds()) < 120, "observed_at default is stale")
    for field in optional_fields:
        require(nulls[field] is None, f"{field} must be null")
    print("PASS explicit null and default timestamp")

    lower, _ = expect_status(
        client,
        "POST",
        "/api/v1/measurements",
        201,
        payload=device_measurement(
            f"{run_id}-lower",
            temperature=-100,
            humidity=0,
            wind_speed=0,
            wind_direction=0,
            co2=0,
            pm25=0,
            pm10=0,
        ),
    )
    require(lower["temperature"] == -100 and lower["humidity"] == 0, "lower bounds mismatch")
    upper, _ = expect_status(
        client,
        "POST",
        "/api/v1/measurements",
        201,
        payload=measurement(
            f"{run_id}-upper",
            temperature=100,
            humidity=100,
            wind_speed=100,
            wind_direction=360,
            co2=100000,
            pm25=10000,
            pm10=10000,
        ),
    )
    require(upper["temperature"] == 100 and upper["pm10"] == 10000, "upper bounds mismatch")
    print("PASS boundary measurements")

    persisted = device_measurement("e2e-persist", observed_at="2026-02-01T00:00:00Z", temperature=12.3, humidity=45.6)
    expect_status(client, "POST", "/api/v1/measurements", 201, payload=persisted)
    print("PASS persistence seed")

    list_station = f"{run_id}-list"
    for minute, temperature in ((10, 10.0), (12, 12.0), (11, 11.0)):
        expect_status(
            client,
            "POST",
            "/api/v1/measurements",
            201,
            payload=device_measurement(
                list_station,
                observed_at=f"2026-01-02T10:{minute:02d}:00+08:00",
                temperature=temperature,
                humidity=50,
            ),
        )

    listed, _ = expect_status(
        client,
        "GET",
        "/api/v1/measurements?" + urlencode({"station_id": list_station}),
        200,
    )
    require([item["temperature"] for item in listed] == [12.0, 11.0, 10.0], "list order mismatch")

    page, _ = expect_status(
        client,
        "GET",
        "/api/v1/measurements?" + urlencode({"station_id": list_station, "offset": 1, "limit": 2}),
        200,
    )
    require([item["temperature"] for item in page] == [11.0, 10.0], "pagination mismatch")

    filtered, _ = expect_status(
        client,
        "GET",
        "/api/v1/measurements?"
        + urlencode(
            {
                "station_id": list_station,
                "start": "2026-01-02T10:11:00+08:00",
                "end": "2026-01-02T10:12:00+08:00",
            }
        ),
        200,
    )
    require([item["temperature"] for item in filtered] == [12.0, 11.0], "inclusive time filter mismatch")
    print("PASS list/filter/pagination")

    latest, _ = expect_status(
        client,
        "GET",
        "/api/v1/measurements/latest?" + urlencode({"station_id": list_station}),
        200,
    )
    require(latest["temperature"] == 12.0, "station latest mismatch")

    future_station = f"{run_id}-future"
    expect_status(
        client,
        "POST",
        "/api/v1/measurements",
        201,
        payload=measurement(future_station, observed_at="2099-01-01T00:00:00Z"),
    )
    global_latest, _ = expect_status(client, "GET", "/api/v1/measurements/latest", 200)
    require(global_latest["station_id"] == future_station, "global latest mismatch")

    missing, _ = expect_status(
        client,
        "GET",
        "/api/v1/measurements/latest?" + urlencode({"station_id": f"{run_id}-missing"}),
        404,
    )
    require("detail" in missing, "404 response should contain detail")
    print("PASS latest")

    missing_temperature = measurement(f"{run_id}-invalid")
    missing_temperature.pop("temperature")
    missing_humidity = measurement(f"{run_id}-invalid")
    missing_humidity.pop("humidity")
    missing_station = measurement(f"{run_id}-invalid")
    missing_station.pop("station_id")
    invalid_payloads = [
        ("missing temperature", missing_temperature),
        ("missing humidity", missing_humidity),
        ("missing station", missing_station),
        ("blank station", measurement("   ")),
        ("long station", measurement("x" * 65)),
        ("naive time", measurement(f"{run_id}-invalid", observed_at="2026-01-01T08:00:00")),
        ("invalid time", measurement(f"{run_id}-invalid", observed_at="not-a-time")),
        ("string temperature", measurement(f"{run_id}-invalid", temperature="hot")),
        ("bad wind speed", measurement(f"{run_id}-invalid", wind_speed=-1)),
        ("bad wind direction", measurement(f"{run_id}-invalid", wind_direction=361)),
        ("bad temperature", measurement(f"{run_id}-invalid", temperature=101)),
        ("bad humidity", measurement(f"{run_id}-invalid", humidity=101)),
        ("bad co2", measurement(f"{run_id}-invalid", co2=100001)),
        ("bad pm25", measurement(f"{run_id}-invalid", pm25=10001)),
        ("bad pm10", measurement(f"{run_id}-invalid", pm10=-1)),
    ]
    for name, payload in invalid_payloads:
        status, body, _ = client.call("POST", "/api/v1/measurements", payload=payload)
        require(status == 422, f"{name}: expected 422, got {status}: {body!r}")
    status, body, _ = client.call(
        "POST",
        "/api/v1/measurements",
        raw_body=(
            b'{"station_id":"invalid","observed_at":"2026-01-01T08:00:00Z",'
            b'"temperature":NaN,"humidity":63}'
        ),
        headers={"Content-Type": "application/json"},
    )
    require(status == 422, f"non-finite temperature: expected 422, got {status}: {body!r}")
    status, body, _ = client.call(
        "POST",
        "/api/v1/measurements",
        raw_body=b"not json",
        headers={"Content-Type": "text/plain"},
    )
    require(status == 422, f"non-JSON body: expected 422, got {status}: {body!r}")
    print("PASS create validation")

    expect_status(
        client,
        "GET",
        "/api/v1/measurements?" + urlencode({"start": "2026-01-02T00:00:00"}),
        422,
    )
    expect_status(
        client,
        "GET",
        "/api/v1/measurements?"
        + urlencode(
            {
                "start": "2026-01-02T00:00:00Z",
                "end": "2026-01-01T00:00:00Z",
            }
        ),
        422,
    )
    expect_status(client, "GET", "/api/v1/measurements?limit=1000", 200)
    expect_status(client, "GET", "/api/v1/measurements?limit=0", 422)
    expect_status(client, "GET", "/api/v1/measurements?limit=1001", 422)
    expect_status(client, "GET", "/api/v1/measurements?offset=-1", 422)
    expect_status(client, "GET", "/api/v1/measurements?station_id=", 422)
    print("PASS query validation")

    _, preflight_headers = expect_status(
        client,
        "OPTIONS",
        "/api/v1/measurements",
        200,
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    require(
        preflight_headers.get("access-control-allow-origin") == "http://localhost:5173",
        f"CORS allow header missing: {preflight_headers!r}",
    )
    _, _, disallowed_headers = client.call(
        "OPTIONS",
        "/api/v1/measurements",
        headers={
            "Origin": "http://not-allowed.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    require(
        "access-control-allow-origin" not in disallowed_headers,
        "disallowed origin received CORS allow header",
    )
    print("PASS CORS")

    expect_status(client, "GET", "/api/v1/does-not-exist", 404)
    expect_status(client, "DELETE", "/api/v1/measurements", 405)
    docs_status, _, _ = client.call("GET", "/docs")
    require(docs_status == 200, f"docs response status: {docs_status}")
    print("PASS routing/docs")

    print(f"E2E regression passed with run id {run_id}")


def check_persisted(base_url, station_id):
    client = Client(base_url)
    body, _ = expect_status(
        client,
        "GET",
        "/api/v1/measurements/latest?" + urlencode({"station_id": station_id}),
        200,
    )
    require(body["temperature"] == 12.3, f"persisted temperature mismatch: {body!r}")
    require(body["humidity"] == 45.6, f"persisted humidity mismatch: {body!r}")
    print(f"PASS persisted station {station_id}")


def main():
    parser = argparse.ArgumentParser(description="Run backend E2E regression against a live server")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000", help="running API base URL")
    parser.add_argument("--check-station", help="only verify a persisted station after restart")
    args = parser.parse_args()

    try:
        if args.check_station:
            check_persisted(args.base_url, args.check_station)
        else:
            run(args.base_url)
    except AssertionError as error:
        print(f"E2E regression failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
