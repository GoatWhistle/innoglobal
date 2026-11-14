-- УЗТ (ultrasonic thickness) — точечные замеры толщины.
create or replace table core.ut_measurement as
with u as (
    select u._row_num,
           core.pipe_key(u.id)                          as pipe_id,
           core.num(u."Номер контролируемого участка")  as control_section_no,
           core.txt(u."ID контрольной точки")           as control_point_id,
           core.num(u."Номер точки")                    as point_no,
           core.num(u.start_distance)                   as dist_m,
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
    core.num(r."Mechanical Impurities")                 as mech_impurities
from r;

-- связь с паспортом: направление существует в core.pipe
alter table core.corrosion_coupon add column matches_pipe_direction boolean;
update core.corrosion_coupon c
set matches_pipe_direction = exists (select 1 from core.pipe p where p.direction = c.pipe_direction);
