-- Общие функции приведения типов для слоя core.

create schema if not exists core;
create schema if not exists quarantine;
create schema if not exists mart;
create schema if not exists dq;

-- число: десятичная запятая -> точка, мусор ('#N/A', '- Нет данных -') -> NULL
create or replace macro core.num(x) as
    try_cast(replace(nullif(trim(x), ''), ',', '.') as double);

-- id участка: в паспорте записан как '1250009583.0'
create or replace macro core.pipe_key(x) as
    try_cast(core.num(x) as bigint);

-- дата из 'дд.мм.гггг' / 'дд.мм.гггг ч:мм:сс' / ISO
create or replace macro core.dt(x) as
    coalesce(try_strptime(trim(x), '%d.%m.%Y')::date,
             try_strptime(trim(x), '%d.%m.%Y %H:%M:%S')::date,
             try_cast(trim(x) as date));

-- текст: пустое и заглушки -> NULL
create or replace macro core.txt(x) as
    case when trim(x) in ('', '#N/A', '- Нет данных -', 'nan') then null else trim(x) end;
