/* tortoise_bin_v2.sql

createdb tortoise_bin;

psql -d tortoise_bin -f tortoise_bin.sql

psql -d tortoise_bin

*/

CREATE TABLE bins (
  bin_id serial PRIMARY KEY,
  bin_path char(8) NOT NULL,
  origin_ip cidr,
  creation_time timestamp NOT NULL
);

CREATE TABLE requests (
  request_id serial PRIMARY KEY,
  request_type varchar(8),
  request_origin_ip cidr,
  time_received timestamp,
  headers jsonb,
  request_payload jsonb
);

ALTER TABLE requests ADD COLUMN bin_id integer REFERENCES bins (bin_id);
ALTER TABLE requests ALTER COLUMN bin_id SET NOT NULL;
