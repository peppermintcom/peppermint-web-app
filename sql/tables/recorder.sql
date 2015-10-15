CREATE TABLE IF NOT EXISTS recorder (
	recorder_id bigserial PRIMARY KEY,
	app_id bigint REFERENCES app(app_id) NOT NULL,
	recorder_client_id text NOT NULL UNIQUE,
	recorder_key text NOT NULL,
	registration_ts timestamp
);
