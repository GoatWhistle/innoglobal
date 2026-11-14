-- Техрежим (расчёт гидравлического двойника), сутки × участок.
--
-- Правила очистки:
--  * дубль суток (несколько расчётов за день) -> оставляем последний, остальные в quarantine;
--  * 0 там, где физически невозможен (давление, плотность, вязкость, температура) -> NULL;
--  * давление выше допустимого рабочего из паспорта -> NULL (сбой расчёта);
--  * скорость > 5 м/с -> NULL (p99 по сети ~3 м/с);
--  * расход > 20 медиан участка -> NULL весь блок расхода/скорости (сбойный день 2018-10-07);
--  * простой (q = 0) — реальное состояние, не ошибка: флаг is_downtime, q/v остаются 0.

create or replace table core._regime_typed as
select t._row_num,
       core.pipe_key(t.simple_section_id)           as pipe_id,
       try_cast(t.calc_date as timestamp)           as calc_ts,
       cast(try_cast(t.calc_date as timestamp) as date) as calc_date,
       core.num(t.p_start_fact) as p_start_fact, core.num(t.p_end_fact) as p_end_fact,
       core.num(t.p_start) as p_start, core.num(t.p_end) as p_end,
       core.num(t.q_oil) as q_oil, core.num(t.q) as q, core.num(t.q_gas) as q_gas,
       core.num(t.watercut) as watercut, core.num(t.gas_content_rate) as gas_content_rate,
       core.num(t.v_liquid_true) as v_liquid, core.num(t.v_mix) as v_mix,
       core.txt(t.flow_regime_real) as flow_regime,
       core.num(t.fill_coefficient) as fill_coefficient,
       core.num(t.density_liquid_work) as density_liquid, core.num(t.viscosity_liquid_work) as viscosity_liquid,
       core.num(t.density_oil) as density_oil,
       core.num(t.pit_corrosion_intensity) as pit_corrosion_intensity,
       core.num(t.t_mix) as t_mix, core.num(t.t_start) as t_start, core.num(t.t_end) as t_end,
       core.num(t.length) as length_m, core.num(t.d_mm) as d_m,
       row_number() over (partition by core.pipe_key(t.simple_section_id),
                                       cast(try_cast(t.calc_date as timestamp) as date)
                          order by try_cast(t.calc_date as timestamp) desc, t._row_num desc) as _day_rank
from raw.tech_mode t;

create or replace table quarantine.regime_daily as
select *, case when pipe_id is null or calc_ts is null then 'unparseable'
               else 'duplicate_day_superseded' end as reason
from core._regime_typed
where pipe_id is null or calc_ts is null or _day_rank > 1;

create or replace table core.regime_daily as
with t as (
    select t.*, p.p_allowed_atm,
           median(q) filter (where q > 0) over (partition by pipe_id) as q_median_pipe
    from core._regime_typed t
    left join core.pipe p using (pipe_id)
    where t.pipe_id is not null and t.calc_ts is not null and t._day_rank = 1
),
f as (
    select t.*,
           coalesce(q > 20 * q_median_pipe, false) as flow_glitch
    from t
)
select
    pipe_id, calc_date, calc_ts,
    -- давление, атм
    case when p_start > 0 and p_start <= coalesce(p_allowed_atm, 63) then p_start end as p_start_atm,
    case when p_end   > 0 and p_end   <= coalesce(p_allowed_atm, 63) then p_end   end as p_end_atm,
    nullif(p_start_fact, 0) as p_start_fact_atm,
    nullif(p_end_fact, 0)   as p_end_fact_atm,
    -- расходы
    case when not flow_glitch then q     end as q_liquid,
    case when not flow_glitch then q_oil end as q_oil,
    case when not flow_glitch then q_gas end as q_gas,
    case when watercut between 0 and 100 then watercut end as watercut_pct,
    case when gas_content_rate between 0 and 1 then gas_content_rate end as gas_content_rate,
    case when not flow_glitch and v_liquid between 0 and 5 then v_liquid end as v_liquid_m_s,
    case when not flow_glitch and v_mix    between 0 and 5 then v_mix    end as v_mix_m_s,
    flow_regime,
    case when fill_coefficient between 0 and 1 then fill_coefficient end as fill_coefficient,
    -- свойства среды
    case when density_liquid > 0 then density_liquid end as density_liquid_kg_m3,
    case when viscosity_liquid > 0 then viscosity_liquid end as viscosity_liquid_pa_s,
    case when density_oil > 0 then density_oil end as density_oil_kg_m3,
    case when pit_corrosion_intensity >= 0 then pit_corrosion_intensity end as pit_corrosion_intensity,
    -- температура: ровно 0 = нет расчёта
    nullif(t_mix, 0) as t_mix_c,
    t_start as t_start_c,
    t_end   as t_end_c,
    -- флаги
    coalesce(q = 0, false) as is_downtime,
    flow_glitch as is_flow_glitch,
    coalesce(p_start > coalesce(p_allowed_atm, 63) or p_end > coalesce(p_allowed_atm, 63)
             or v_liquid > 5 or v_mix > 5 or flow_glitch, false) as has_anomaly,
    _row_num as src_row
from f
order by pipe_id, calc_date;

drop table core._regime_typed;
