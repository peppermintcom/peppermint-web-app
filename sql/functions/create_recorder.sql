CREATE OR REPLACE FUNCTION create_recorder(_api_key text, _client_id text, _key text, _desc text, OUT _id bigint, OUT _ts timestamp) AS $$
DECLARE
	_app_id bigint;
BEGIN
	SELECT NOW() AT TIME ZONE 'utc' INTO _ts;

	SELECT app_id INTO _app_id FROM app WHERE api_key = _api_key;
	IF NOT FOUND THEN
		RAISE EXCEPTION 'unknown api_key: %', _api_key USING ERRCODE = 'P0002';
	END IF;

	INSERT INTO recorder (
		app_id,
		recorder_client_id,
		recorder_key,
		registration_ts
	) VALUES (
		_app_id,
		_client_id,
		_key,
		_ts
	) RETURNING recorder_id INTO STRICT _id;

	RETURN;
END;
$$ LANGUAGE plpgsql;
