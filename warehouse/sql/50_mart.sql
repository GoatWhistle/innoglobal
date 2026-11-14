-- MART.ILI_SEGMENT — посегментный результат каждого пропуска ВТД (таргет модели).
-- Сегмент без зарегистрированной потери металла получает модальную стенку пропуска:
-- снаряд не увидел утонения глубже порога чувствительности.
create or replace table mart.ili_segment as
with agg as (
    select pipe_id, run_date, segment_id,
           min(residual_mm)                                          as min_residual_mm,
           count(*) filter (where is_metal_loss)                     as n_metal_loss,
           count(*) filter (where is_metal_loss and defect_side = 'internal') as n_internal,
           count(*) filter (where is_metal_loss and defect_side = 'external') as n_external,
           min(residual_mm) filter (where defect_side = 'internal')  as min_residual_internal_mm,
           max(depth_pct)                                            as max_depth_pct
    from core.ili_feature
    group by 1, 2, 3
)
select s.pipe_id, r.run_date, s.segment_id, s.start_m, s.z_center_m,
       coalesce(a.min_residual_mm, r.wall_mode_mm)    as y_min_residual_mm,
       a.min_residual_mm is not null                  as had_defect,
       coalesce(a.n_metal_loss, 0)                    as n_metal_loss,
       coalesce(a.n_internal, 0)                      as n_internal,
       coalesce(a.n_external, 0)                      as n_external,
       a.min_residual_internal_mm,
       coalesce(a.max_depth_pct, 0)                   as max_depth_pct,
       r.wall_mode_mm,
       r.is_training_eligible
from core.ili_run r
join core.segment s on s.pipe_id = r.pipe_id
left join agg a on a.pipe_id = r.pipe_id and a.run_date = r.run_date and a.segment_id = s.segment_id
order by s.pipe_id, r.run_date, s.segment_id;


-- MART.REGIME_MONTHLY — помесячные агрегаты очищенного режима (для EDA и признаков).
create or replace table mart.regime_monthly as
select pipe_id, date_trunc('month', calc_date) as month,
       count(*)                                   as n_days,
       avg(is_downtime::int)                      as downtime_share,
       avg(watercut_pct)                          as watercut_pct,
       avg(v_liquid_m_s) filter (where not is_downtime) as v_liquid_m_s,
       avg((v_liquid_m_s < 0.3)::int) filter (where not is_downtime) as slow_flow_share,
       avg(p_start_atm)                           as p_start_atm,
       avg(t_mix_c)                               as t_mix_c,
       avg(q_liquid)                              as q_liquid,
       avg(pit_corrosion_intensity)               as pit_corrosion_intensity
from core.regime_daily
group by 1, 2
order by 1, 2;
