CREATE TABLE IF NOT EXISTS app (
	app_id bigserial PRIMARY KEY,
	registration_ts timestamp NOT NULL,
	api_key text NOT NULL UNIQUE
);
