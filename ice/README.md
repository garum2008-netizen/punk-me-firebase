# ICE

Три модуля на одной очереди. Платные боты не добавляются.

| Модуль | Роль |
| --- | --- |
| Content Production | Текст и медиакандидат. У бизнес-каналов и детских каналов разные настройки. |
| Media Validation | Файл есть, URL открывается, формат совпадает с каналом. Иначе в Buffer ничего не уходит. |
| Publishing Queue | `PENDING → GENERATING → VALIDATING → READY → DRAFT → APPROVED → SCHEDULED`, повтор при технической ошибке, защита от дубля, журнал. |

Рабочий прогон останавливается на `DRAFT`. `APPROVED` и `SCHEDULED` включаются только отдельным разрешением и в этой сборке не отправляют новый пост в живой Buffer.

Детские каналы не получают новый текст. Уже стоящие публикации не переписываются. `WHO OWNS THE TRUTH?` остаётся черновиком до отдельного GO.

Проверенный черновик: Buffer `6af0e14bd6bbae6fa10f1ce0` на Facebook Legal Tech Counsellor. Повтор того же текста блокируется.

```bash
python3 -m unittest ice.tests.test_factory
python3 -m ice report --db ice/state/ice.db
python3 -m ice prepare-draft --db ice/state/ice.db \
  --campaign contractbot_eu --channel linkedin_inna \
  --brief eu-law-venue --out ice/state/draft-intent.json
```

`prepare-draft` только собирает черновик. Команда не планирует и не публикует.

Библиотека недели 16–20 ноября 2026 лежит в `ice/config/week-2026-11-16.json`. Это предложенные пакеты, не даты Buffer. `python3 -m unittest ice.tests.test_library` проверяет, что ни один из них не уходит в Buffer и не получает `dueAt`. Датский текст ждёт носителя языка. Reels и Shorts не назначаются: среди подключённых каналов нет делового YouTube или Instagram.
