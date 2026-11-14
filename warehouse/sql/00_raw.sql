-- RAW: исходные CSV как есть. Все поля VARCHAR (никаких приведений типов и
-- потерь), плюс технические колонки загрузки: номер строки в файле, файл, время.
-- {data_dir} подставляет build.py.

create schema if not exists raw;

create or replace table raw.pot_south as
select row_number() over () as _row_num, *, '{data_dir}/pot_south.csv' as _source_file,
       current_timestamp as _loaded_at
from read_csv('{data_dir}/pot_south.csv', header = true, all_varchar = true);

create or replace table raw.altitudes_south as
select row_number() over () as _row_num, *, '{data_dir}/altitudes_south.csv' as _source_file,
       current_timestamp as _loaded_at
from read_csv('{data_dir}/altitudes_south.csv', header = true, all_varchar = true);

create or replace table raw.vtd_south_train as
select row_number() over () as _row_num, *, '{data_dir}/vtd_south_train.csv' as _source_file,
       current_timestamp as _loaded_at
from read_csv('{data_dir}/vtd_south_train.csv', header = true, all_varchar = true);

create or replace table raw.uzt_south as
select row_number() over () as _row_num, *, '{data_dir}/uzt_south.csv' as _source_file,
       current_timestamp as _loaded_at
from read_csv('{data_dir}/uzt_south.csv', header = true, all_varchar = true);

create or replace table raw.repcorr_south as
select row_number() over () as _row_num, *, '{data_dir}/repcorr_south.csv' as _source_file,
       current_timestamp as _loaded_at
from read_csv('{data_dir}/repcorr_south.csv', header = true, all_varchar = true);

create or replace table raw.tech_mode as
select row_number() over () as _row_num, *,
       '{data_dir}/tech_mode_for_embedings_with_length_with_temperatures_ids16.csv' as _source_file,
       current_timestamp as _loaded_at
from read_csv('{data_dir}/tech_mode_for_embedings_with_length_with_temperatures_ids16.csv',
              header = true, all_varchar = true);
