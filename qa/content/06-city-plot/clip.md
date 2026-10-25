# 06-city-plot

**Версия (commit):** `477574607b1dff56bde7d33036da6b1e53bbed57`
**Дата съёмки:** 2026-10-25
**Язык UI:** ru
**Разрешение:** 1920×1080

## Управление
- Desktop: WASD, E / #btnTalk, мышь; мобильный: джойстик, #touchTalk

## Состояние
До: coins=100, quest=—
После: coins=49, quest=—

## Таймкоды

| Time | Event | Notes |
| --- | --- | --- |
| 00:00 | boot | load |
| 00:00 | char_select | Cobalt |
| 00:00 | onboarding_cleared | post-tutorial state for build layer |
| 00:00 | capture_start | audio+video |
| 00:14 | city_arrive | city street plots visible |
| 00:26 | plots_before | [{"id":"plot_shop","built":false,"cost":120},{"id":"plot_club","built":false,"cost":220},{"id":"plot_garage","built":false,"cost":180}] |
| 00:26 | earn_coins | job for coins (need 120) |
| 01:03 | plot_purchased | plot_shop −120 coins |
| 01:25 | plot_visible | built shop on street |
| 01:26 | capture_end | stop |

## Известные ошибки / ограничения
В HUD нет кнопки «купить участок»; покупка через purchaseCityPlot (маркер на карте без E)
