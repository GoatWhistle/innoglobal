-- ВТД (ILI, in-line inspection): пропуски и особенности/дефекты.

-- 1. Типизация всех строк.
create or replace table core._ili_typed as
select
    v._row_num,
    core.pipe_key(v.id)                       as pipe_id,
    core.dt(v.vtd_date_raw)                   as run_date,
    core.dt(v.date)                           as run_date_alt,
    core.num(v.Distance)                      as dist_m,
    core.num(v.Distance_raw)                  as dist_raw_m,
    lower(trim(v.is_beyond_pot)) = 'true'     as is_beyond_pot,
    core.txt(v.trait)                         as trait,
    core.txt(v."Feature Description")         as feature_desc,
    case lower(trim(v."Defect Type"))
        when 'внутренний' then 'internal' when 'внутр.' then 'internal'
        when 'внешний'    then 'external' when 'внешн.' then 'external'
    end                                       as defect_side,
    core.num(v."Wall Thickness")              as wall_mm,
    core.num(v."Residual Wall Thickness")     as residual_mm,
    core.num(v."Defect Depth in %")           as depth_raw,
    core.num(v."Defect Depth")                as depth_raw_mm,
    core.num(v.Angle)                         as angle_deg,
    core.num(v."Feature Length")              as length_mm,
    core.num(v."Feature Width")               as width_mm,
    core.num(v.ERF)                           as erf,
    core.num(v.Psafe)                         as psafe,
    core.num(v.Latitude)                      as lat,
    core.num(v.Longitude)                     as lon,
    core.num(v.Height)                        as height_m,
    -- поля отчёта ВТД, которые не нужны модели, но нужны для анализа и сверки пропусков
    core.txt(v."Defect Type")                 as defect_type_raw,
    case when core.txt(v.Class) = 'Общий' then 'Общая' else core.txt(v.Class) end as defect_class,
    cast(core.num(v."Inspection Number") as integer) as inspection_no,
    core.num(v.Distance_adjusted)             as dist_adjusted_m,
    core.num(v.accumulated_value)             as dist_shift_m,
    core.num(v.section_length)                as section_length_m,
    cast(core.num(v."Section Number") as integer) as joint_no,
    cast(core.num(v."Feature Number") as integer) as feature_no,
    core.num(v."Pipe Length")                 as joint_length_m,
    core.num(v."Relative Distance")           as dist_from_weld_m,
    core.txt(v."Reference Point 1 (Against Flow)") as ref_point_up,
    core.num(v."Distance to Reference Point 1, m") as ref_point_up_dist_m,
    core.txt(v."Reference Point 2 (With Flow)") as ref_point_down,
    core.num(v."Distance to Reference Point 2, m") as ref_point_down_dist_m,
    core.txt(v."Repair Time (Years)")         as repair_time_raw,
    case when regexp_matches(trim(v."Repair Time (Years)"), '^[0-9]+([.,][0-9]+)?$') then core.num(v."Repair Time (Years)")
         when regexp_matches(v."Repair Time (Years)", '[0-9]+') then core.num(regexp_extract(v."Repair Time (Years)", '([0-9]+)', 1))
    end                                       as repair_in_years_min,
    core.txt(v."Repair Method")               as repair_method,
    core.num(v."Repair parameter, m")         as repair_parameter_m,
    core.txt(v."PreRepair classification")    as prerepair_class,
    core.txt(v."Recommended Repair Method")   as recommended_repair_method,
    cast(core.num(v.Cluster) as integer)      as cluster_no,
    core.txt(v.Comment)                       as comment
from raw.vtd_south_train v;


-- 2. Шкала глубины по пропуску. В части пропусков (2018) "Defect Depth in %" записан
--    долей (0.249 вместо 24.9). Шкалу выбираем по согласованности с остаточной стенкой:
--    residual ≈ wall * (1 - depth/100)  vs  residual ≈ wall * (1 - depth).
create or replace table core._ili_scale as
select pipe_id, run_date,
       median(abs(wall_mm * (1 - depth_raw / 100) - residual_mm)) as err_pct,
       median(abs(wall_mm * (1 - depth_raw) - residual_mm))       as err_frac,
       case when median(abs(wall_mm * (1 - depth_raw) - residual_mm))
                 < median(abs(wall_mm * (1 - depth_raw / 100) - residual_mm))
            then 'fraction' else 'percent' end as depth_scale
from core._ili_typed
where residual_mm is not null and depth_raw is not null and wall_mm is not null
group by 1, 2;


-- 3. Нормализация + причины отбраковки.
create or replace table core._ili_norm as
with t as (
    select t.*,
           coalesce(s.depth_scale, 'percent') as depth_scale,
           p.profile_length_m
    from core._ili_typed t
    left join core._ili_scale s using (pipe_id, run_date)
    left join core.pipe p using (pipe_id)
)
select t.*,
       case when depth_scale = 'fraction' then depth_raw * 100 else depth_raw end as depth_pct,
       coalesce(depth_raw_mm, wall_mm - residual_mm) as depth_mm,
       cast(floor(dist_m / 10) as integer) as segment_id,
       -- точный дубль: та же точка, тот же дефект, те же размеры
       row_number() over (
           partition by pipe_id, run_date, dist_m, angle_deg, depth_raw, residual_mm,
                        length_mm, width_mm, feature_desc
           order by _row_num) as _dup_rank
from t;

create or replace table quarantine.ili_feature as
select *,
       case when pipe_id is null or run_date is null or dist_m is null then 'unparseable'
            when profile_length_m is null                              then 'pipe_not_in_passport'
            when dist_m < 0 or dist_m > profile_length_m               then 'out_of_pipe_bounds'
            when is_beyond_pot                                         then 'beyond_pot_flag'
            when residual_mm is not null and (residual_mm <= 0 or residual_mm > wall_mm * 1.05)
                                                                       then 'implausible_residual'
            when angle_deg is not null and (angle_deg < 0 or angle_deg > 360)
                                                                       then 'implausible_angle'
            else 'duplicate' end as reason
from core._ili_norm
where pipe_id is null or run_date is null or dist_m is null
   or profile_length_m is null
   or dist_m < 0 or dist_m > profile_length_m
   or is_beyond_pot
   or (residual_mm is not null and (residual_mm <= 0 or residual_mm > wall_mm * 1.05))
   or (angle_deg is not null and (angle_deg < 0 or angle_deg > 360))
   or _dup_rank > 1;

create or replace table core.ili_feature as
select _row_num as feature_id, pipe_id, run_date, dist_m, dist_raw_m, segment_id,
       trait, feature_desc, defect_side,
       residual_mm is not null as is_metal_loss,
       wall_mm, residual_mm, depth_pct, depth_mm, angle_deg, length_mm, width_mm,
       erf, psafe, lat, lon, height_m,
       -- категория элемента: 24 варианта описания сведены в 9
       case
         when lower(feature_desc) = 'коррозия' then 'Коррозия'
         when lower(feature_desc) = 'коррозионный кластер' then 'Коррозионный кластер'
         when lower(feature_desc) like 'потеря металла%' then 'Потеря металла'
         when lower(feature_desc) like 'вмятина%' then 'Вмятина'
         when lower(feature_desc) like 'аномалия поперечного шва%' then 'Аномалия шва'
         when lower(feature_desc) in ('риска', 'подрез') then 'Риска, подрез'
         when lower(feature_desc) = 'производственный дефект' then 'Производственный дефект'
         when feature_desc is null and trait = 'Вмятина' then 'Вмятина'
         when feature_desc is null and trait in ('Аномалия поперечного шва', 'Шов') then 'Аномалия шва'
         when feature_desc is null and trait = 'Аномалия трубного материала' then 'Производственный дефект'
         when feature_desc is null and trait = 'Потеря металла' then 'Потеря металла'
         when feature_desc is null then 'Не указано'
         else 'Элемент трубы'
       end as feature_category,
       defect_type_raw, defect_class, inspection_no, dist_adjusted_m, dist_shift_m, section_length_m,
       joint_no, feature_no, joint_length_m, dist_from_weld_m,
       ref_point_up, ref_point_up_dist_m, ref_point_down, ref_point_down_dist_m,
       repair_time_raw, repair_in_years_min, repair_method, repair_parameter_m,
       prerepair_class, recommended_repair_method, cluster_no, comment
from core._ili_norm
where _row_num not in (select _row_num from quarantine.ili_feature)
order by pipe_id, run_date, dist_m;


-- 4. Пропуски ВТД.
create or replace table core.ili_run as
with f as (
    select pipe_id, run_date,
           count(*)                                        as n_features,
           count(*) filter (where is_metal_loss)           as n_metal_loss,
           count(*) filter (where defect_side = 'external') as n_external,
           mode(wall_mm) filter (where wall_mm is not null) as wall_mode_mm,
           count(distinct wall_mm)                         as n_distinct_wall,
           min(residual_mm)                                as min_residual_mm
    from core.ili_feature group by 1, 2
),
q as (select pipe_id, run_date, count(*) as n_quarantined
      from quarantine.ili_feature group by 1, 2)
select f.*,
       coalesce(q.n_quarantined, 0) as n_quarantined,
       coalesce(s.depth_scale, 'percent') as depth_scale_raw,
       f.n_metal_loss / nullif(p.profile_length_m / 1000, 0) as metal_loss_per_km,
       p.commissioned_at,
       p.wt_nom_mm,
       -- пропуск до даты ввода = ВТД старой трубы, заменённой позже (нитка Куст-2 2014)
       f.run_date < p.commissioned_at as predates_commissioning,
       not (f.run_date < p.commissioned_at) as is_training_eligible,
       case when f.run_date < p.commissioned_at
            then 'run predates commissioning: replaced pipe' end as exclusion_reason
from f
left join q using (pipe_id, run_date)
left join core._ili_scale s using (pipe_id, run_date)
left join core.pipe p using (pipe_id)
order by pipe_id, run_date;

-- 5. Опорные точки ВТД (задвижки, тройники, вантузы, знаки). У каждого дефекта есть расстояние
--    до ближайшей точки против потока и по потоку; положение точки на участке = медиана оценок.
--    Берём сторону с меньшим межквартильным разбросом: оценки с другой стороны бывают шумными.
--    Код узла (УЗ-19) нужен для привязки коррозионного мониторинга к врезкам.
create or replace table core.ili_reference_point as
with r as (
    select pipe_id, run_date, ref_point_up as name, 'against_flow' as side, dist_m - ref_point_up_dist_m as pos_m
    from core.ili_feature where ref_point_up is not null and ref_point_up_dist_m is not null
    union all
    select pipe_id, run_date, ref_point_down, 'with_flow', dist_m + ref_point_down_dist_m
    from core.ili_feature where ref_point_down is not null and ref_point_down_dist_m is not null
),
g as (
    select pipe_id, name, side, median(pos_m) as pos_m, count(*) as n_estimates,
           quantile_cont(pos_m, 0.75) - quantile_cont(pos_m, 0.25) as iqr_m,
           min(run_date) as first_run, max(run_date) as last_run
    from r group by 1, 2, 3
),
best as (
    select *, row_number() over (partition by pipe_id, name order by iqr_m, n_estimates desc) as rk from g
)
select b.pipe_id, b.name, b.side as estimated_from, round(b.pos_m, 1) as pos_m, b.n_estimates, round(b.iqr_m, 1) as iqr_m,
       b.first_run, b.last_run,
       nullif(regexp_extract(b.name, '(УЗ-[0-9]+)', 1), '') as node_code,
       case when b.name ilike '%тройник%' then 'tee' when b.name ilike '%задвижка%' then 'valve'
            when b.name ilike '%вантуз%' then 'vent' when b.name ilike '%камера%' then 'pig_trap'
            when b.name ilike '%знак%' or b.name ilike '%маркер%' or b.name ilike '%вешка%' then 'marker'
            else 'other' end as point_type,
       -- точка лежит на этом участке: оценка внутри профиля и разброс меньше 20 м
       b.pos_m between -5 and p.profile_length_m + 5 and b.iqr_m <= 20 as is_on_pipe
from best b left join core.pipe p using (pipe_id)
where b.rk = 1
order by pipe_id, pos_m;

drop table core._ili_typed;
drop table core._ili_norm;
-- _ili_scale оставляем: используется в DQ-отчёте
