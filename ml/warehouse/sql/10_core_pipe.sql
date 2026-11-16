-- CORE.ROUTE_POINT — точки профиля трассы. Дубли дистанции -> quarantine.
create or replace table core._route_all as
select _row_num,
       core.pipe_key(id)        as pipe_id,
       core.num(total_distance) as dist_m,
       core.num(z)              as z_m,
       core.num(lon)            as lon,
       core.num(lat)            as lat,
       row_number() over (partition by core.pipe_key(id), core.num(total_distance)
                          order by _row_num) as _dup_rank
from raw.altitudes_south;

create or replace table quarantine.route_point as
select _row_num, pipe_id, dist_m, z_m, lon, lat,
       case when pipe_id is null or dist_m is null or z_m is null then 'unparseable'
            when dist_m < 0 then 'negative_distance'
            else 'duplicate_distance' end as reason
from core._route_all
where pipe_id is null or dist_m is null or z_m is null or dist_m < 0 or _dup_rank > 1;

create or replace table core.route_point as
select pipe_id, dist_m, z_m, lon, lat, _row_num as src_row
from core._route_all
where pipe_id is not null and dist_m is not null and z_m is not null
  and dist_m >= 0 and _dup_rank = 1
order by pipe_id, dist_m;
drop table core._route_all;


-- CORE.PIPE — паспорт простого участка: только нужные аналитике поля, типизированные.
create or replace table core.pipe as
with p as (select * from raw.pot_south),
prof as (select pipe_id, max(dist_m) as profile_length_m from core.route_point group by 1)
select
    core.pipe_key(p."Данные по протяжённости в структуре сети OISPIPE Паспортизация_ID простого участка трубопровода") as pipe_id,
    core.txt(p."Данные по протяжённости в структуре сети OISPIPE Паспортизация_Наименование направления трубопровода") as direction,
    core.txt(p."Данные по протяжённости в структуре сети OISPIPE Паспортизация_Наименование простого участка трубопровода") as section_name,
    core.txt(p."Местонахождение_Принадлежность к объекту (площадка)") as site,
    core.txt(p."Тип_Назначение трубопровода")       as purpose,
    core.txt(p."Тип_Рабочая среда")                 as medium,
    core.num(p."Общие данные_D, мм")                as d_mm,
    core.num(p."Общие данные_Толщина  стенки по исполнительной доку-ии, мм") as wt_nom_mm,
    core.num(p."Материал_Толщина  стенки отбраковочная, мм") as wt_reject_mm,
    core.dt(p."Общие данные_Дата ввода")            as commissioned_at,
    core.txt(p."Общие данные_Тип трубы")            as pipe_type,
    core.txt(p."Материал_Наименование материала")   as steel_grade,
    core.txt(p."Материал_Группа прочности")         as strength_group,
    core.txt(p."Внутреннее покрытие_Тип внутреннего покрытия") as inner_coating,
    coalesce(core.txt(p."Внутреннее покрытие_Тип внутреннего покрытия") not in ('Нет покрытия'), false)
                                                    as has_inner_coating,
    core.txt(p."Наружное покрытие_Тип наружного покрытия") as outer_coating,
    coalesce(core.txt(p."Ингибирование_Защищается") = 'Да', false) as is_inhibited,
    core.dt(p."Ингибирование_Дата начала ингибиторной защиты") as inhibition_since,
    core.num(p."Параметры перекачки_Скорость коррозии, мм/год") as corrosion_rate_passport_mm_y,
    core.num(p."Параметры перекачки_% обвод. / тип перекач.среды") as watercut_passport_pct,
    core.txt(p."Данные о монтаже_Способ прокладки") as laying_method,
    core.txt(p."Данные о монтаже_Тип грунта")       as soil_type,
    core.num(p."Данные о монтаже_Глуб. залож., м")  as burial_depth_m,
    core.num(p."Данные о состоянии по строительным участкам_Допустимое рабочее давление, атм")
                                                    as p_allowed_atm,
    core.txt(p."Общие данные_Группа риска")         as risk_group,
    core.txt(p."Наличие и состояние ЭХЗ")           as ecp,
    core.num(p."Данные по протяжённости в структуре сети OISPIPE Паспортизация_L простого участка, км") * 1000
                                                    as length_passport_m,
    -- структура сети и принадлежность
    core.txt(p."Данные по протяжённости в структуре сети OISPIPE Паспортизация_ID направления трубопровода") as direction_id,
    core.txt(p."Данные по протяжённости в структуре сети OISPIPE Паспортизация_ID основного участка трубопровода") as main_section_id,
    core.txt(p."Данные по протяжённости в структуре сети OISPIPE Паспортизация_Наименование основного участка трубопровода") as main_section_name,
    core.num(p."Данные по протяжённости в структуре сети OISPIPE Паспортизация_L основного участка, км") * 1000 as main_section_length_m,
    core.txt(p."Местонахождение_Дочернее общество") as subsidiary,
    core.txt(p."Местонахождение_Предприятие")       as enterprise,
    core.txt(p."Местонахождение_Месторождение")     as field,
    core.txt(p."Местонахождение_Цех")               as workshop,
    core.txt(p."Тип_Тип трубопроводной сети")       as network_type,
    core.txt(p."Данные о состоянии по простым участкам_Важность простого участка") as importance,
    core.txt(p."Данные о состоянии по простым участкам_Состояние эксплуатации простого участка") as state,
    -- возраст и срок службы
    cast(core.num(p."Общие данные_Год ввода") as integer) as commissioned_year,
    core.num(p."Общие данные_Возраст фактический, лет") as age_years,
    core.dt(p."Данные о состоянии по строительным участкам_Дата окончания срока службы участка трубопровода") as service_life_until,
    -- материал
    core.num(p."Материал_Предел текучести, Н/мм2")  as yield_strength_mpa,
    core.num(p."Материал_Временное сопротивление разрыву (предел прочности), Н/мм2") as tensile_strength_mpa,
    -- проект и режим по паспорту
    core.num(p."Проект_Рраб., атм")                 as design_p_atm,
    core.num(p."Проект_Температура среды в начале участка, С") as design_t_start_c,
    core.num(p."Параметры перекачки_Qж.,газа (тыс.) м3/сут") * 1000 as q_liquid_passport_m3_d,
    core.num(p."Параметры перекачки_Qн. т/сут")     as q_oil_passport_t_d,
    core.num(p."Параметры перекачки_Рнач., атм")    as p_start_passport_atm,
    core.num(p."Параметры перекачки_Ркон., атм")    as p_end_passport_atm,
    core.num(p."Параметры перекачки_Удельные потери P, атм") as pressure_loss_atm,
    -- обследования
    core.dt(p."Данные по техническому обследованию_Дата проведения последнего технического диагностирования") as last_diagnostics_at,
    core.txt(p."Данные по техническому обследованию_Способ диагностики") as diagnostics_method,
    core.num(p."Данные по техническому обследованию_Минимальная толщина стенки, мм") as diag_min_wall_mm,
    core.num(p."Данные по техническому обследованию_Макс. глубина проникновения, %") as diag_max_depth_pct,
    core.num(p."Данные по техническому обследованию_Рассчитанный остаточный ресурс, лет") as residual_life_years,
    core.txt(p."Данные по техническому обследованию_Заключение") as diag_conclusion,
    core.dt(p."Данные по техническому обследованию_Дата проведения следующего технического диагностирования") as next_diagnostics_at,
    core.num(p."Данные по техническому обследованию_Количество неустраненных дефектов по результатам технического диагностирования") as unresolved_defects,
    core.dt(p."УЗТ (силами ЛНК УЭТ)_Дата проведения последней толщинометрии") as last_ut_at,
    core.num(p."УЗТ (силами ЛНК УЭТ)_Минимальная толщина стенки, мм") as ut_min_wall_mm,
    -- защита и обслуживание
    core.txt(p."Ингибирование_Наименование хим.реагента") as inhibitor,
    core.txt(p."Ингибирование_Название защищаемого направления") as inhibition_direction,
    core.txt(p."Ингибирование_Наименование сегмента защиты") as inhibition_segment,
    core.txt(p."Химизация процесса транспортировки (закачка реагентов против АСПО, противотурбулентная присадка, солеотложения, гидратообразования)_Наименование хим.реагента") as chem_reagent,
    upper(core.txt(p."Данные по очистке_Возможность очистки")) = 'ДА' as cleaning_possible,
    core.txt(p."Данные по очистке_Наличие камер пуска/ приема ОУ") as cleaning_launchers,
    core.dt(p."Данные по очистке_Дата предыдущей очистки") as last_cleaning_at,
    core.dt(p."Данные по очистке_Дата следующей очистки") as next_cleaning_at,
    core.dt(p."Ревизия_Дата факт. рев.")             as last_revision_at,
    core.txt(p."Ревизия_Заключение")                as revision_conclusion,
    core.dt(p."Испытание_Дата факт. испыт.")         as last_test_at,
    core.txt(p."Водные и подводные переходы_Наименов. вод. объекта") is not null as has_water_crossing,
    -- отказы
    coalesce(core.num(p."Отказы трубопроводов_Количество отказов с начала эксплуатации"), 0) as failures_total,
    coalesce(core.num(p."Количество дефектов первоочередного ремонта"), 0) as priority_defects,
    prof.profile_length_m,
    cast(floor(prof.profile_length_m / 10) + 1 as integer) as n_segments,
    p._row_num as src_row
from p
left join prof
  on prof.pipe_id = core.pipe_key(p."Данные по протяжённости в структуре сети OISPIPE Паспортизация_ID простого участка трубопровода");


-- CORE.SEGMENT — сетка 10-метровых сегментов, высота центра линейной интерполяцией профиля.
create or replace table core.segment as
with grid as (
    select p.pipe_id, s.segment_id,
           s.segment_id * 10.0        as start_m,
           s.segment_id * 10.0 + 10.0 as end_m,
           s.segment_id * 10.0 + 5.0  as center_m
    from core.pipe p, range(p.n_segments) s(segment_id)
),
lo as (
    select g.*, r.dist_m as d0, r.z_m as z0
    from grid g asof left join core.route_point r
      on g.pipe_id = r.pipe_id and g.center_m >= r.dist_m
),
hi as (
    select lo.*, r.dist_m as d1, r.z_m as z1
    from lo asof left join core.route_point r
      on lo.pipe_id = r.pipe_id and lo.center_m <= r.dist_m
),
z as (
    select pipe_id, cast(segment_id as integer) as segment_id, start_m, end_m, center_m,
           case when d0 is null then z1
                when d1 is null or d1 = d0 then z0
                else z0 + (z1 - z0) * (center_m - d0) / (d1 - d0) end as z_center_m
    from hi
)
select pipe_id, segment_id, start_m, end_m, center_m, z_center_m,
       -- уклон по соседним сегментам (20 м), %: плюс — подъём, минус — спуск
       (lead(z_center_m) over w - lag(z_center_m) over w) / 20 * 100 as slope_pct,
       -- высота относительно окрестности ±100 м: минус — сегмент ниже соседей, туда стекает вода
       z_center_m - avg(z_center_m) over (partition by pipe_id order by segment_id
                                          rows between 10 preceding and 10 following) as rel_z_m,
       -- локальная низина: минимум в окне ±50 м
       z_center_m <= min(z_center_m) over (partition by pipe_id order by segment_id
                                            rows between 5 preceding and 5 following) as is_low_point
from z
window w as (partition by pipe_id order by segment_id)
order by pipe_id, segment_id;


-- CORE.PIPE_ATTRIBUTE — весь паспорт в длинном виде: одна непустая ячейка pot_south = одна строка.
-- В core.pipe вынесены только поля для аналитики; здесь — все 286 колонок без потерь,
-- с полным названием, группой и номером колонки.
create or replace table core.pipe_attribute as
with cols as (
    select column_name, column_index
    from duckdb_columns()
    where schema_name = 'raw' and table_name = 'pot_south'
      and column_name not in ('_row_num', '_source_file', '_loaded_at')
),
u as (
    unpivot (select * exclude (_source_file, _loaded_at) from raw.pot_south)
    on columns(* exclude (_row_num))
    into name attribute value value_text
)
select core.pipe_key(p."Данные по протяжённости в структуре сети OISPIPE Паспортизация_ID простого участка трубопровода") as pipe_id,
       cast(c.column_index - 1 as integer) as attribute_no,
       case when strpos(u.attribute, '_') > 0 then split_part(u.attribute, '_', 1) else u.attribute end as attribute_group,
       u.attribute,
       trim(u.value_text) as value_text,
       core.num(u.value_text) as value_num
from u
join raw.pot_south p using (_row_num)
join cols c on c.column_name = u.attribute
where trim(u.value_text) <> ''   -- заглушки вроде «- Нет данных -» сохраняем: это тоже ответ паспорта
order by pipe_id, attribute_no;
