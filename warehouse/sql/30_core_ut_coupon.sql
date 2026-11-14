-- УЗТ (ultrasonic thickness) — точечные замеры толщины.
create or replace table core.ut_measurement as
with u as (
    select u._row_num,
           core.pipe_key(u.id)                          as pipe_id,
           core.num(u."Номер контролируемого участка")  as control_section_no,
           core.txt(u."ID контрольной точки")           as control_point_id,
           core.num(u."Номер точки")                    as point_no,
           core.num(u.start_distance)                   as dist_m,
           core.num(u."Адрес от начала участка_1")      as address_m,   -- в данных совпадает с dist_m
           core.dt(u.date)                              as measured_at,
           core.txt(u."ID замера")                      as measurement_id,
           core.num(u.angle)                            as angle_deg,
           core.num(u.residual_wall_thickness)          as thickness_mm
    from raw.uzt_south u
)
select u.*, p.wt_nom_mm,
       u.thickness_mm / p.wt_nom_mm as thickness_to_nominal,
       -- остаточная стенка не может быть толще номинала больше плюсового допуска проката (~15%)
       u.thickness_mm <= p.wt_nom_mm * 1.15 as is_plausible
from u left join core.pipe p using (pipe_id)
order by pipe_id, measured_at, control_point_id, angle_deg;


-- Коррозионный мониторинг: образцы-свидетели в узлах контроля коррозии (УКК).
create or replace table core.corrosion_coupon as
with r as (select * from raw.repcorr_south)
select
    r._row_num                                          as coupon_row_id,
    cast(core.num(r.Year) as integer)                   as year,
    core.txt(r.Site)                                    as site,
    core.txt(r."Protection Direction")                  as protection_direction,
    core.txt(r."Protected Segment Name")                as protected_segment,
    core.txt(r."Protected Simple Section Name")         as protected_simple_section,
    core.pipe_key(r."Simple Section ID")                as section_id,
    -- нормализация в имя направления паспорта: 'Куст-1 -> т.вр. ДНС-1' -> 'Куст-1 - ДНС-1'
    replace(replace(core.txt(r."Protected Segment Name"), ' -> ', ' - '), 'т.вр. ', '')
                                                        as pipe_direction,
    core.num(r."D")                                     as d_mm,
    core.num(r."Wall Thickness")                        as wall_mm,
    core.num(r.Qzh)                                     as q_liquid,
    core.num(r.H2O)                                     as watercut_pct,
    core.txt(r."UKK Number")                            as ukk_no,
    core.num(r."UKK Address from the start of the simple section") as ukk_dist_m,
    core.dt(r."Sample Installation Date")               as installed_at,
    core.dt(r."Sample Removal Date")                    as removed_at,
    core.num(r."Exposure Time, days")                   as exposure_days,
    core.dt(r."Sample Removal Date") - core.dt(r."Sample Installation Date") as exposure_days_calc,
    core.txt(r."Measurement Method")                    as method,
    core.txt(r."Sample Type")                           as sample_type,
    core.num(r."Average Corrosion Rate by Gravimetry")  as rate_avg_mm_y,
    core.num(r."Maximum Corrosion Rate by Gravimetry")  as rate_max_mm_y,
    core.num(r."Det. of Average Corrosion Rate by ER")  as rate_er_mm_y,
    core.txt(r."Sample Metal Grade")                    as sample_steel,
    core.txt(r."Corrosion Inhibitor Grade")             as inhibitor,
    core.num(r."Protective Effect")                     as protective_effect,
    core.num(r.pH)                                      as ph,
    core.num(r."Cl-")                                   as cl_mg_l,
    core.num(r."HCO3-")                                 as hco3_mg_l,
    core.num(r."SO4-")                                  as so4_mg_l,
    core.num(r."Ca2+")                                  as ca_mg_l,
    core.num(r."Mg2+")                                  as mg_mg_l,
    core.num(r."Total Mineralization")                  as mineralization_mg_l,
    core.num(r."Total Fe")                              as fe_mg_l,
    core.num(r."CO2 in Water Phase")                    as co2_mg_l,
    core.num(r.O2)                                      as o2_mg_l,
    core.num(r.H2S)                                     as h2s_mg_l,
    core.num(r."SVB Cell Content")                      as srb_cells,
    core.num(r."Mechanical Impurities")                 as mech_impurities,
    -- поля отчёта, не нужные модели, но нужные для анализа
    cast(core.num(r."File name") as integer)            as source_file_no,
    cast(core.num(r."N p/p") as integer)                as source_row_no,
    core.txt(r."Subsidiary Company")                    as subsidiary,
    core.txt(r.Enterprise)                              as enterprise,
    core.txt(r.Field)                                   as field,
    core.txt(r.Workshop)                                as workshop,
    core.txt(r."Pipeline Purpose")                      as pipeline_purpose,
    core.txt(r."Simple Section ID")                     as section_id_raw,
    core.num(r.Length)                                  as length_m,
    core.txt(r."UKK Name")                              as ukk_name,
    core.num(r."OSI in Water Phase")                    as osi,
    core.txt(r."Flow Phase State")                      as flow_phase,
    core.num(r."Water Content 0")   as water_content_0,   core.txt(r."State 0")   as emulsion_state_0,
    core.num(r."Water Content 50")  as water_content_50,  core.txt(r."State 50")  as emulsion_state_50,
    core.num(r."Water Content 100") as water_content_100, core.txt(r."State 100") as emulsion_state_100,
    core.num(r."Water Content 150") as water_content_150, core.txt(r."State 150") as emulsion_state_150,
    core.num(r."Water Content 200") as water_content_200, core.txt(r."State 200") as emulsion_state_200,
    core.num(r.Hardness)                                as hardness,
    core.num(r."Fluid Density")                         as fluid_density
from r;

-- связь с паспортом: направление существует в core.pipe
alter table core.corrosion_coupon add column matches_pipe_direction boolean;
update core.corrosion_coupon c
set matches_pipe_direction = exists (select 1 from core.pipe p where p.direction = c.pipe_direction);


-- ---------------------------------------------------------------------------------------------
-- ПРИВЯЗКА ОБРАЗЦОВ К ТРУБАМ ПАСПОРТА
-- Из 9 участков мониторинга в паспорте только 1, у 82 образцов ID нет совсем. Связь ищется по
-- топологии сети: узлы в названиях участков («УЗ-9 - УЗ-19»), сегменты защиты ингибитором
-- («Куст-7 -> УЗ-19») и опорные точки ВТД (тройник «0.6 км УЗ-19» на трубе Куст-2 – ДНС-1).
-- Правила общие, без ID в коде; применяются по порядку, срабатывает первое.
--   section          ID участка есть в паспорте
--   section_assigned ID нет, но тот же сегмент защиты есть ровно у одного участка паспорта
--   water_line       площадка КНС или обводнённость 100 %: водовод закачки, не нефтесбор
--   tie_in           узел участка = узел опорной точки ВТД на трубе: поток входит в трубу там
--   upstream_node    узел участка (с суффиксом) = начальный узел участка паспорта
--   upstream_segment сегмент защиты ведёт в направление паспорта, сам участок в паспорт не попал
--   upstream_via     общий узел с уже привязанным участком мониторинга (один шаг)
--   protection_zone  совпадает только зона защиты ингибитором (слабая связь)
-- ---------------------------------------------------------------------------------------------

-- узлы: части названия участка и конец сегмента защиты; «(ЗКЛ-4)», «(ПЕРЕМ)» отбрасываются,
-- суффикс «КПСОД» сохраняется — «УЗ-17(ЗКЛ-4)» и «УЗ-17 КПСОД» разные узлы
create or replace macro core.node(x) as
    nullif(trim(regexp_replace(regexp_replace(x, '\([^)]*\)', '', 'g'), '^т\.вр\.\s*', '')), '');

create or replace table core._coupon_node as
select distinct coupon_row_id, core.node(n) as node, 'section' as src
from core.corrosion_coupon, unnest(string_split(regexp_replace(protected_simple_section, '\s*->\s*', ' - ', 'g'), ' - ')) t(n)
where protected_simple_section is not null
union
select distinct coupon_row_id, core.node(split_part(protected_segment, '->', 2)), 'segment_end'
from core.corrosion_coupon where protected_segment like '%->%';

create or replace table core._pipe_node as
select pipe_id, core.node(split_part(section_name, ' - ', 1)) as start_node,
       core.node(split_part(section_name, ' - ', 2)) as end_node, direction
from core.pipe;

alter table core.corrosion_coupon add column section_id_filled bigint;
alter table core.corrosion_coupon add column section_id_source varchar;
alter table core.corrosion_coupon add column link_level varchar;
alter table core.corrosion_coupon add column linked_direction varchar;
alter table core.corrosion_coupon add column linked_pipe_id bigint;
alter table core.corrosion_coupon add column linked_position_m double;
alter table core.corrosion_coupon add column link_evidence varchar;

-- 1. section
update core.corrosion_coupon c
set section_id_filled = c.section_id, section_id_source = 'source', link_level = 'section',
    linked_pipe_id = c.section_id, linked_position_m = c.ukk_dist_m,
    linked_direction = (select direction from core.pipe p where p.pipe_id = c.section_id),
    link_evidence = 'ID участка из отчёта есть в паспорте; УКК на ' || coalesce(cast(c.ukk_dist_m as varchar), '?') || ' м от начала участка'
where c.section_id in (select pipe_id from core.pipe);

update core.corrosion_coupon
set section_id_filled = section_id, section_id_source = 'source'
where section_id is not null and section_id_source is null;

-- 2. section_assigned: тот же сегмент защиты уже привязан ровно к одному участку паспорта
update core.corrosion_coupon c
set section_id_filled = a.pipe_id, section_id_source = 'assigned_same_protected_segment',
    link_level = 'section_assigned', linked_pipe_id = a.pipe_id, linked_direction = a.direction,
    link_evidence = 'ID в отчёте нет (' || coalesce(c.section_id_raw, 'пусто') || '); сегмент защиты «' || c.protected_segment
                    || '» в паспорте есть только у участка ' || a.pipe_id
                    || '. УКК на ' || coalesce(cast(c.ukk_dist_m as varchar), '?') || ' м от куста'
from (
    select protected_segment, any_value(section_id) as pipe_id, any_value(p.direction) as direction
    from core.corrosion_coupon x join core.pipe p on p.pipe_id = x.section_id
    group by 1 having count(distinct section_id) = 1
) a
where c.section_id is null and c.protected_segment = a.protected_segment and c.link_level is null;

-- 3. water_line
update core.corrosion_coupon
set link_level = 'water_line', section_id_source = coalesce(section_id_source, 'missing'),
    link_evidence = 'Площадка ' || coalesce(site, '?') || ', обводнённость ' || coalesce(cast(watercut_pct as varchar), '?')
                    || ' %: водовод закачки в пласт, к нефтесборным трубам не относится'
where link_level is null and (site ilike 'КНС%' or watercut_pct >= 100);

-- 4. tie_in: узел участка мониторинга найден среди опорных точек ВТД трубы
update core.corrosion_coupon c
set link_level = 'tie_in', linked_pipe_id = t.pipe_id, linked_position_m = t.pos_m, linked_direction = t.direction,
    link_evidence = 'Узел ' || t.node || ' есть в опорных точках ВТД трубы ' || t.direction || ': «' || t.name
                    || '», по расстояниям до неё — ' || cast(t.pos_m as varchar) || ' м участка ' || t.pipe_id
                    || ' (' || t.n_estimates || ' оценок, разброс ' || cast(t.iqr_m as varchar) || ' м)'
from (
    select n.coupon_row_id, r.pipe_id, r.pos_m, r.name, r.n_estimates, r.iqr_m, r.node_code as node, p.direction,
           row_number() over (partition by n.coupon_row_id order by r.iqr_m) as rk
    from core._coupon_node n
    join core.ili_reference_point r on r.node_code = n.node and r.is_on_pipe
    join core.pipe p using (pipe_id)
) t
where t.rk = 1 and c.coupon_row_id = t.coupon_row_id and c.link_level is null;

-- 5. upstream_node: участок мониторинга заканчивается в начальном узле участка паспорта
update core.corrosion_coupon c
set link_level = 'upstream_node', linked_pipe_id = t.pipe_id, linked_position_m = 0, linked_direction = t.direction,
    link_evidence = 'Участок «' || c.protected_simple_section || '» сходится в узле ' || t.node
                    || ', с которого начинается участок паспорта ' || t.pipe_id || ' трубы ' || t.direction
from (
    select n.coupon_row_id, p.pipe_id, p.direction, n.node,
           row_number() over (partition by n.coupon_row_id order by p.pipe_id) as rk
    from core._coupon_node n join core._pipe_node p on p.start_node = n.node
    where n.src = 'section'
) t
where t.rk = 1 and c.coupon_row_id = t.coupon_row_id and c.link_level is null;

-- 6. upstream_segment: сегмент защиты «Куст-2 -> ДНС-1» = направление паспорта
update core.corrosion_coupon c
set link_level = 'upstream_segment', linked_direction = c.pipe_direction,
    link_evidence = 'Сегмент защиты «' || c.protected_segment || '» совпадает с трубой паспорта ' || c.pipe_direction
                    || ', но участка «' || coalesce(c.protected_simple_section, '?') || '» в паспорте нет: это начало той же трассы'
where c.link_level is null and c.matches_pipe_direction;

-- 7. upstream_via: общий узел с участком мониторинга, привязанным правилами 4–6
update core.corrosion_coupon c
set link_level = 'upstream_via', linked_direction = t.linked_direction,
    link_evidence = 'Общий узел ' || t.node || ' с участком «' || t.via || '», который привязан к трубе ' || t.linked_direction
from (
    select n.coupon_row_id, m.node, l.linked_direction, l.protected_simple_section as via,
           row_number() over (partition by n.coupon_row_id order by l.coupon_row_id) as rk
    from core._coupon_node n
    join core._coupon_node m on m.node = n.node and m.coupon_row_id <> n.coupon_row_id
    join core.corrosion_coupon l on l.coupon_row_id = m.coupon_row_id
                                and l.link_level in ('tie_in', 'upstream_node', 'upstream_segment')
) t
where t.rk = 1 and c.coupon_row_id = t.coupon_row_id and c.link_level is null;

-- 8. protection_zone: только зона защиты ингибитором (своя или у участка с общим узлом)
update core.corrosion_coupon c
set link_level = 'protection_zone', linked_direction = c.protection_direction,
    link_evidence = 'Совпадает только зона защиты ингибитором «' || c.protection_direction
                    || '»; узлов участка нет ни в паспорте, ни в опорных точках ВТД'
where c.link_level is null and c.protection_direction in (select direction from core.pipe);

update core.corrosion_coupon c
set link_level = 'protection_zone', linked_direction = t.zone,
    link_evidence = 'Зоны защиты в отчёте нет; общий узел ' || t.node || ' с участком «' || t.via
                    || '» из зоны защиты «' || t.zone || '»'
from (
    select n.coupon_row_id, m.node, l.protection_direction as zone, l.protected_simple_section as via,
           row_number() over (partition by n.coupon_row_id order by l.coupon_row_id) as rk
    from core._coupon_node n
    join core._coupon_node m on m.node = n.node and m.coupon_row_id <> n.coupon_row_id
    join core.corrosion_coupon l on l.coupon_row_id = m.coupon_row_id and l.link_level = 'protection_zone'
) t
where t.rk = 1 and c.coupon_row_id = t.coupon_row_id and c.link_level is null;

update core.corrosion_coupon set link_level = 'unlinked', link_evidence = 'Связь с трубами паспорта не найдена'
where link_level is null;

-- ID участка там, где его не было: присвоенный по сегменту защиты выше; для водовода — синтетический
update core.corrosion_coupon
set section_id_filled = 9900000001, section_id_source = 'synthetic_water_line'
where link_level = 'water_line' and section_id_filled is null;
update core.corrosion_coupon set section_id_source = 'missing' where section_id_filled is null;

drop table core._coupon_node;
drop table core._pipe_node;
