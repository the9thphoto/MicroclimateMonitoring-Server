def sample_measurement(station_id: str = "station-01") -> dict:
    return {
        "station_id": station_id,
        "observed_at": "2026-10-29T08:30:00+08:00",
        "wind_speed": 2.8,
        "wind_direction": 135,
        "temperature": 21.6,
        "humidity": 63,
        "co2": 418,
        "pm25": 18,
        "pm10": 34,
    }


def test_health(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_and_read_measurement(client):
    created = client.post("/api/v1/measurements", json=sample_measurement())

    assert created.status_code == 201
    body = created.json()
    assert body["station_id"] == "station-01"
    assert body["observed_at"] == "2026-10-29T00:30:00Z"
    assert body["wind_speed"] == 2.8
    assert body["pm10"] == 34

    listed = client.get(
        "/api/v1/measurements",
        params={"station_id": "station-01"},
    )
    assert listed.status_code == 200
    assert [item["id"] for item in listed.json()] == [body["id"]]


def test_latest_and_time_filters(client):
    older = sample_measurement()
    older["observed_at"] = "2026-10-29T07:00:00+08:00"
    newer = sample_measurement("station-02")
    newer["observed_at"] = "2026-10-29T09:00:00+08:00"
    client.post("/api/v1/measurements", json=older)
    client.post("/api/v1/measurements", json=newer)

    latest = client.get(
        "/api/v1/measurements/latest",
        params={"station_id": "station-01"},
    )
    assert latest.status_code == 200
    assert latest.json()["observed_at"] == "2026-10-28T23:00:00Z"

    filtered = client.get(
        "/api/v1/measurements",
        params={
            "start": "2026-10-29T08:30:00+08:00",
            "end": "2026-10-29T10:00:00+08:00",
        },
    )
    assert filtered.status_code == 200
    assert [item["station_id"] for item in filtered.json()] == ["station-02"]


def test_validation_rejects_invalid_values_and_naive_time(client):
    invalid_humidity = sample_measurement()
    invalid_humidity["humidity"] = 101
    response = client.post("/api/v1/measurements", json=invalid_humidity)
    assert response.status_code == 422

    naive_time = sample_measurement()
    naive_time["observed_at"] = "2026-10-29T08:30:00"
    response = client.post("/api/v1/measurements", json=naive_time)
    assert response.status_code == 422


def test_device_measurement_accepts_missing_optional_metrics(client):
    payload = {
        "station_id": "station-01",
        "observed_at": "2026-11-04T08:00:00+08:00",
        "temperature": -3.7,
        "humidity": 49.3,
    }

    created = client.post("/api/v1/measurements", json=payload)

    assert created.status_code == 201
    body = created.json()
    assert body["temperature"] == -3.7
    assert body["humidity"] == 49.3
    for field in ("wind_speed", "wind_direction", "co2", "pm25", "pm10"):
        assert body[field] is None

    latest = client.get(
        "/api/v1/measurements/latest",
        params={"station_id": "station-01"},
    )
    assert latest.status_code == 200
    assert latest.json()["pm25"] is None


def test_device_measurement_accepts_explicit_null_metrics(client):
    payload = {
        "station_id": "station-01",
        "temperature": 21.6,
        "humidity": 63,
        "wind_speed": None,
        "wind_direction": None,
        "co2": None,
        "pm25": None,
        "pm10": None,
    }

    created = client.post("/api/v1/measurements", json=payload)

    assert created.status_code == 201
    body = created.json()
    assert body["wind_speed"] is None
    assert body["pm10"] is None


def test_optional_metric_bounds_are_still_validated(client):
    invalid_wind = sample_measurement()
    invalid_wind["wind_speed"] = -1
    assert client.post("/api/v1/measurements", json=invalid_wind).status_code == 422

    invalid_pm = sample_measurement()
    invalid_pm["pm10"] = 10_001
    assert client.post("/api/v1/measurements", json=invalid_pm).status_code == 422

    missing_temperature = sample_measurement()
    missing_temperature.pop("temperature")
    assert client.post("/api/v1/measurements", json=missing_temperature).status_code == 422

    missing_humidity = sample_measurement()
    missing_humidity.pop("humidity")
    assert client.post("/api/v1/measurements", json=missing_humidity).status_code == 422


def test_non_finite_float_returns_422_not_500(client):
    response = client.post(
        "/api/v1/measurements",
        content=(
            '{"station_id":"station-01","temperature":NaN,"humidity":63}'
        ),
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 422
