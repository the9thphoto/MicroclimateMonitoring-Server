# Target deployment

This directory contains the production Compose stack used by the separate
`microclimate-cd-agent` repository on `10.126.126.78`.

- API: `0.0.0.0:8000`
- Web: `0.0.0.0:8080`
- PostgreSQL: internal only, named Docker volume `microclimate_weather-data`

The CD agent checks out a `deploy-X.Y.Z` tag, builds `microclimate-api:X.Y.Z`
and `microclimate-web:X.Y.Z` from this checkout, then runs:

```sh
IMAGE_TAG=X.Y.Z docker compose \
  --project-name microclimate \
  --env-file /etc/microclimate-monitor/deploy.env \
  -f deploy/compose.yaml up -d --wait
```

`DB_PASSWORD` and `CORS_ORIGINS` come from the host-only
`/etc/microclimate-monitor/deploy.env`. Nothing in this directory contains a
secret.

Existing nginx on ports 80/443 is not modified. The device must be pointed at
`http://10.126.126.78:8000/api/v1/measurements`.
