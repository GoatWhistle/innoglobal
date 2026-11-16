-- Описания таблиц и колонок core (видны в duckdb_tables() / duckdb_columns() и в DBeaver).
-- Здесь описаны таблицы целиком и колонки, добавленные при доведении core до полного состава.

comment on table core.pipe is 'Паспорт простого участка: одна строка — один участок. Поля для аналитики; весь паспорт — в core.pipe_attribute';
comment on table core.pipe_attribute is 'Весь паспорт в длинном виде: одна непустая ячейка pot_south = одна строка, ни одна из 286 колонок не потеряна';
comment on table core.route_point is 'Точки профиля трассы: дистанция, координаты, высота';
comment on table core.segment is 'Сетка 10-метровых сегментов с высотой центра и признаками рельефа';
comment on table core.ili_run is 'Пропуски ВТД: число дефектов, модальная стенка, пригодность для обучения';
comment on table core.ili_feature is 'Особенности и дефекты ВТД после очистки, со всеми полями отчёта';
comment on table core.ili_reference_point is 'Опорные точки ВТД (задвижки, тройники, вантузы, знаки) с положением на участке; по ним привязываются врезки';
comment on table core.ut_measurement is 'Замеры УЗТ; все 67 толще номинала на ~7 мм (сдвиг нуля прибора): is_plausible = false, после вычета ut_offset_mm is_plausible_corr = true';
comment on table core.corrosion_coupon is 'Образцы-свидетели и химия воды на узлах контроля коррозии, с привязкой к трубам паспорта';
comment on table core.regime_daily is 'Технологический режим: одна строка на сутки × участок, сбои расчёта обнулены';

-- core.pipe: добавленные поля
comment on column core.pipe.direction_id is 'ID направления трубопровода (DIR-1…): верхний уровень сети';
comment on column core.pipe.main_section_id is 'ID основного участка (MAIN-1…): средний уровень сети';
comment on column core.pipe.main_section_name is 'Наименование основного участка';
comment on column core.pipe.main_section_length_m is 'Длина основного участка по паспорту, м';
comment on column core.pipe.subsidiary is 'Дочернее общество';
comment on column core.pipe.enterprise is 'Предприятие';
comment on column core.pipe.field is 'Месторождение';
comment on column core.pipe.workshop is 'Цех';
comment on column core.pipe.network_type is 'Тип трубопроводной сети: внутрипромысловые или межпромысловые';
comment on column core.pipe.importance is 'Важность простого участка: стволовой или боковой';
comment on column core.pipe.state is 'Состояние эксплуатации простого участка';
comment on column core.pipe.commissioned_year is 'Год ввода в эксплуатацию';
comment on column core.pipe.age_years is 'Фактический возраст на дату выгрузки паспорта, лет';
comment on column core.pipe.service_life_until is 'Дата окончания срока службы участка';
comment on column core.pipe.yield_strength_mpa is 'Предел текучести стали, МПа';
comment on column core.pipe.tensile_strength_mpa is 'Временное сопротивление разрыву (предел прочности) стали, МПа';
comment on column core.pipe.design_p_atm is 'Проектное рабочее давление, атм';
comment on column core.pipe.design_t_start_c is 'Проектная температура среды в начале участка, °C';
comment on column core.pipe.q_liquid_passport_m3_d is 'Дебит жидкости по паспорту, м³/сут (в паспорте — тыс. м³/сут)';
comment on column core.pipe.q_oil_passport_t_d is 'Дебит нефти по паспорту, т/сут';
comment on column core.pipe.p_start_passport_atm is 'Давление в начале участка по паспорту, атм';
comment on column core.pipe.p_end_passport_atm is 'Давление в конце участка по паспорту, атм';
comment on column core.pipe.pressure_loss_atm is 'Удельные потери давления на участке, атм';
comment on column core.pipe.last_diagnostics_at is 'Дата последнего технического диагностирования';
comment on column core.pipe.diagnostics_method is 'Способ последней диагностики: ВТД или ТД';
comment on column core.pipe.diag_min_wall_mm is 'Минимальная толщина стенки по последнему обследованию, мм';
comment on column core.pipe.diag_max_depth_pct is 'Максимальная глубина дефекта по последнему обследованию, % стенки';
comment on column core.pipe.residual_life_years is 'Расчётный остаточный ресурс по обследованию, лет';
comment on column core.pipe.diag_conclusion is 'Заключение обследования';
comment on column core.pipe.next_diagnostics_at is 'Плановая дата следующего диагностирования';
comment on column core.pipe.unresolved_defects is 'Число неустранённых дефектов по результатам диагностирования';
comment on column core.pipe.last_ut_at is 'Дата последней толщинометрии (ЛНК УЭТ)';
comment on column core.pipe.ut_min_wall_mm is 'Минимальная толщина стенки по толщинометрии, мм';
comment on column core.pipe.inhibitor is 'Ингибитор коррозии';
comment on column core.pipe.inhibition_direction is 'Направление, защищаемое ингибитором';
comment on column core.pipe.inhibition_segment is 'Сегмент защиты ингибитором';
comment on column core.pipe.chem_reagent is 'Реагент химизации транспорта (АСПО, соли, гидраты)';
comment on column core.pipe.cleaning_possible is 'Возможна ли очистка трубы очистными устройствами';
comment on column core.pipe.cleaning_launchers is 'Камеры пуска и приёма очистных устройств';
comment on column core.pipe.last_cleaning_at is 'Дата последней очистки';
comment on column core.pipe.next_cleaning_at is 'Плановая дата следующей очистки';
comment on column core.pipe.last_revision_at is 'Дата последней ревизии';
comment on column core.pipe.revision_conclusion is 'Заключение последней ревизии';
comment on column core.pipe.last_test_at is 'Дата последнего испытания на прочность и плотность';
comment on column core.pipe.has_water_crossing is 'Есть ли на участке водный или подводный переход';
comment on column core.pipe.failures_total is 'Число отказов с начала эксплуатации (пусто = 0)';
comment on column core.pipe.priority_defects is 'Число дефектов первоочередного ремонта';

-- core.pipe_attribute
comment on column core.pipe_attribute.pipe_id is 'ID простого участка';
comment on column core.pipe_attribute.attribute_no is 'Номер колонки в pot_south (1–286)';
comment on column core.pipe_attribute.attribute_group is 'Группа колонки: Местонахождение, Материал, Ревизия, Отказы…';
comment on column core.pipe_attribute.attribute is 'Полное название колонки паспорта';
comment on column core.pipe_attribute.value_text is 'Значение как в паспорте, включая заглушки вроде «- Нет данных -»';
comment on column core.pipe_attribute.value_num is 'Значение числом, если оно числовое';

-- core.segment
comment on column core.segment.slope_pct is 'Уклон по соседним сегментам (20 м), %: плюс — подъём, минус — спуск';
comment on column core.segment.rel_z_m is 'Высота относительно окрестности ±100 м, м: минус — ниже соседей, там скапливается вода';
comment on column core.segment.is_low_point is 'Локальная низина: минимум высоты в окне ±50 м';

-- core.ili_feature: добавленные поля
comment on column core.ili_feature.feature_category is 'Категория элемента: 24 варианта описания сведены в 9 (коррозия, потеря металла, кластер, вмятина, шов…)';
comment on column core.ili_feature.defect_type_raw is 'Тип дефекта как в отчёте («внутр.», «Внутренний»…)';
comment on column core.ili_feature.defect_class is 'Геометрический класс: питтинг, язва, общая, риска или канавка («Общий» → «Общая»)';
comment on column core.ili_feature.inspection_no is 'Номер пропуска в отчёте (заполнен только у ВТД 2023-12-01)';
comment on column core.ili_feature.dist_adjusted_m is 'Дистанция после выравнивания с другими пропусками, м';
comment on column core.ili_feature.dist_shift_m is 'Поправка дистанции: dist_m = dist_raw_m − dist_shift_m (accumulated_value)';
comment on column core.ili_feature.section_length_m is 'Длина участка, к которой привязан пропуск, м';
comment on column core.ili_feature.joint_no is 'Номер трубной секции (труба между кольцевыми швами) в отчёте ВТД';
comment on column core.ili_feature.feature_no is 'Номер элемента в отчёте ВТД';
comment on column core.ili_feature.joint_length_m is 'Длина трубной секции, м';
comment on column core.ili_feature.dist_from_weld_m is 'Расстояние от ближайшего кольцевого шва, м';
comment on column core.ili_feature.ref_point_up is 'Ближайшая опорная точка против потока';
comment on column core.ili_feature.ref_point_up_dist_m is 'Расстояние до опорной точки против потока, м';
comment on column core.ili_feature.ref_point_down is 'Ближайшая опорная точка по потоку';
comment on column core.ili_feature.ref_point_down_dist_m is 'Расстояние до опорной точки по потоку, м';
comment on column core.ili_feature.repair_time_raw is 'Рекомендованный срок ремонта как в отчёте («7-10 лет», «30.0»)';
comment on column core.ili_feature.repair_in_years_min is 'Срок ремонта числом: минимум диапазона, лет';
comment on column core.ili_feature.repair_method is 'Рекомендованный метод ремонта';
comment on column core.ili_feature.repair_parameter_m is 'Параметр ремонта (длина муфты и т. п.), м';
comment on column core.ili_feature.prerepair_class is 'Классификация до ремонта (например, H ≥ 12,5 % стенки)';
comment on column core.ili_feature.recommended_repair_method is 'Второй рекомендованный метод ремонта';
comment on column core.ili_feature.cluster_no is 'Номер кластера близких дефектов';
comment on column core.ili_feature.comment is 'Комментарий отчёта ВТД';

-- core.ili_reference_point
comment on column core.ili_reference_point.name is 'Опорная точка как в отчёте ВТД';
comment on column core.ili_reference_point.estimated_from is 'По какой стороне оценено положение: against_flow или with_flow (меньший разброс)';
comment on column core.ili_reference_point.pos_m is 'Положение на участке, м: медиана «дистанция дефекта ∓ расстояние до точки»';
comment on column core.ili_reference_point.n_estimates is 'Число дефектов, по которым оценено положение';
comment on column core.ili_reference_point.iqr_m is 'Межквартильный разброс оценок, м';
comment on column core.ili_reference_point.node_code is 'Код узла сети из названия (УЗ-19), для привязки мониторинга';
comment on column core.ili_reference_point.point_type is 'Тип: tee, valve, vent, pig_trap, marker, other';
comment on column core.ili_reference_point.is_on_pipe is 'Точка лежит на этом участке: внутри профиля и разброс ≤ 20 м';

-- core.ut_measurement
comment on column core.ut_measurement.address_m is 'Адрес от начала участка, м (в данных совпадает с dist_m)';

-- core.corrosion_coupon: добавленные поля и привязка
comment on column core.corrosion_coupon.source_file_no is 'Номер исходного отчёта';
comment on column core.corrosion_coupon.source_row_no is 'Номер строки в отчёте';
comment on column core.corrosion_coupon.pipeline_purpose is 'Назначение трубопровода по отчёту';
comment on column core.corrosion_coupon.section_id_raw is 'ID участка как в отчёте (в том числе «#N/A»)';
comment on column core.corrosion_coupon.length_m is 'Длина участка по отчёту, м';
comment on column core.corrosion_coupon.ukk_name is 'Название УКК; номера УКК повторяются на разных площадках';
comment on column core.corrosion_coupon.osi is 'Индекс насыщения водной фазы (склонность к солеотложению)';
comment on column core.corrosion_coupon.flow_phase is 'Фазовое состояние потока';
comment on column core.corrosion_coupon.water_content_0 is 'Водосодержание на отметке 0';
comment on column core.corrosion_coupon.emulsion_state_0 is 'Тип эмульсии на отметке 0';
comment on column core.corrosion_coupon.hardness is 'Жёсткость воды';
comment on column core.corrosion_coupon.fluid_density is 'Плотность жидкости';
comment on column core.corrosion_coupon.section_id_filled is 'ID участка у каждого образца: исходный, присвоенный по сегменту защиты или синтетический 9900000001 для водовода';
comment on column core.corrosion_coupon.section_id_source is 'Откуда section_id_filled: source, assigned_same_protected_segment, synthetic_water_line';
comment on column core.corrosion_coupon.link_level is 'Как образец связан с трубами паспорта: section, section_assigned, tie_in, upstream_node, upstream_segment, upstream_via, protection_zone, water_line';
comment on column core.corrosion_coupon.linked_direction is 'Труба паспорта (core.pipe.direction), на которой стоит образец или в которую течёт поток';
comment on column core.corrosion_coupon.linked_pipe_id is 'Участок паспорта: свой, присвоенный или тот, куда врезается участок мониторинга';
comment on column core.corrosion_coupon.linked_position_m is 'Где поток входит в linked_pipe_id, м от его начала (УКК, тройник или 0 для начального узла)';
comment on column core.corrosion_coupon.link_evidence is 'Чем подтверждена связь: ID, общий узел, сегмент защиты, опорная точка ВТД с числом оценок';
