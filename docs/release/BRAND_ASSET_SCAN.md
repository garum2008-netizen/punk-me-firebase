# Brand cleanup — `imagine_images/RgdDh.jpg` (PR #47)

| | |
|--|--|
| **Branch** | `cursor/brand-cleanup-d81d` (**base `main` @ `450d6da`**) |
| **Draft PR** | [#47](https://github.com/garum2008-netizen/punk-me-firebase/pull/47) |
| **Head SHA** | `5099c14` |
| **changed_files** | **4** |
| **Deploy** | нет |

## Файлы PR (только 4)

1. `imagine_images/RgdDh.jpg` (патч от оригинала **185368 B** с `main`)
2. `scripts/patch-rgdh-poster.py`
3. `scripts/scan-imagine-brands.mjs`
4. `docs/release/BRAND_ASSET_SCAN.md`

## Метод патча (v3)

Координаты **1168×784** (разметка владельца):

| Зона | x | y |
|------|---|---|
| Череп (не трогать) | ~200–295 | ~215–285 |
| «ADOPT ME» → **PUNK ME** | 200–295 | 288–318 |
| «HALLOWEEN» (замена текста) | 197–297 | 320–348 |
| Летучая мышь (не трогать) | | ~350–378 |
| Голова девочки (не трогать) | | с ~360 |

**Маска правки:** прямоугольник **x 190–305, y 284–350** (+ inpaint только по розовым пикселям букв внутри). **Ниже y=350 не изменяется.**

Пайплайн: `cv2.inpaint` фона → неон **PUNK ME** / **HALLOWEEN** (цвет с черепа, blur-glow + screen/add) → **вне маски пиксели копируются из оригинала** → JPEG **q=95**. Скрипт падает, если вне маски (до сохранения) ΔRGB > 3.

```bash
git show origin/main:imagine_images/RgdDh.jpg > /tmp/RgdDh_orig_main.jpg
python3 scripts/patch-rgdh-poster.py --from-main-bytes /tmp/RgdDh_orig_main.jpg --proof-dir /opt/cursor/artifacts
```

## Визуальная проверка (не OCR)

**Tesseract на неоне ненадёжен** (до и после даёт пустой/шумный текст) — приёмка только по кропам.

| Кроп | Путь | Что видно (агент, 2026-10-27) |
|------|------|-------------------------------|
| **До** | `/opt/cursor/artifacts/brand-rgdh-crop-before.jpg` (x 150–560, y 150–560) | Розовый неон **ADOPT ME** / **HALLOWEEN**, череп сверху, мышь снизу, девочка слева |
| **После** | `/opt/cursor/artifacts/brand-rgdh-crop-after.jpg` | **ADOPT ME** не читается; вместо него **PUNK ME** / **HALLOWEEN** в розовом неоне; **череп, мышь, волосы девочки, кот** на месте без размытия |

## Находки брендов

| # | Файл | Находка | Действие |
|---|------|---------|----------|
| 1 | `imagine_images/RgdDh.jpg` | ADOPT ME HALLOWEEN (визуально) | **исправлено** |
| 2 | остальные JPG | — | визуально/OCR не надёжно; grep текста — чисто |
| 3 | `js/i18n.js` | Google / YouTube | сервис продукта |
| 4 | игровые диалоги | Adopt Me / Roblox | нет |

## PR #43 / #44

Тот же исходный `RgdDh.jpg` (**185368 B**) на **#43** (`d0512fd`) и **#44** (`roblox-ep1-d99c`). После merge #47 в `main` — подтянуть JPG в эти ветки.

**PR #43:** не пушить (QA freeze).
