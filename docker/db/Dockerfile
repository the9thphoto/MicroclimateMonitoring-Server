FROM postgres:17-alpine

COPY db/initdb/01-create-test-database.sql /docker-entrypoint-initdb.d/01-create-test-database.sql
RUN chmod 0644 /docker-entrypoint-initdb.d/01-create-test-database.sql
