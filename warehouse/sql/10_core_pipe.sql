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
)
select pipe_id, cast(segment_id as integer) as segment_id, start_m, end_m, center_m,
       case when d0 is null then z1
            when d1 is null or d1 = d0 then z0
            else z0 + (z1 - z0) * (center_m - d0) / (d1 - d0) end as z_center_m
from hi
order by pipe_id, segment_id;
