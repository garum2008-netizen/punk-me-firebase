# Brand cleanup — `imagine_images/RgdDh.jpg` (PR #47)

| | |
|--|--|
| **Branch** | `cursor/brand-cleanup-d81d` (**from `origin/main` @ `450d6da` only**) |
| **Draft PR** | [#47](https://github.com/garum2008-netizen/punk-me-firebase/pull/47) |
| **Head SHA** | `6ca8a28` |
| **changed_files** | **4** |
| **Deploy** | нет |

## Файлы в PR (только эти 4)

1. `imagine_images/RgdDh.jpg`
2. `scripts/patch-rgdh-poster.py`
3. `scripts/scan-imagine-brands.mjs`
4. `docs/release/BRAND_ASSET_SCAN.md`

## Патч изображения

- Inpaint **только** розовые компоненты текста «ADOPT ME HALLOWEEN» (`cy` между черепом и летучей мышью).
- Череп, летучая мышь, девочка, кот, прилавок — вне маски.
- Новый текст: неон **PUNK ME** / **HALLOWEEN** (blur-glow + core), 1168×784.

### Proof (не коммитится)

```bash
python3 scripts/patch-rgdh-poster.py --restore-backup --proof-dir /opt/cursor/artifacts
```

Кропы: `/opt/cursor/artifacts/brand-rgdh-crop-before.jpg`, `brand-rgdh-crop-after.jpg`.

### OCR

| | Результат |
|--|-----------|
| `imagine_images/RgdDh.jpg` после патча | `grep -i adopt` на tesseract stdout → **пусто** |
| `node scripts/scan-imagine-brands.mjs` | **hits: []** |

## Находки брендов

| # | Файл | Строка / область | Находка | Действие |
|---|------|------------------|---------|----------|
| 1 | `imagine_images/RgdDh.jpg` | неон столб ~212–302×315–402 | **ADOPT ME HALLOWEEN** | **исправлено** |
| 2 | остальные `imagine_images/*.jpg` | OCR | чужие бренды | нет |
| 3 | `js/i18n.js` | `auth_google`, `audio_youtube_narrator*` | Google / YouTube | сервис продукта |
| 4 | `data/story/dialogues.json` | — | Adopt Me / Roblox | нет |
| 5 | `docs/**` | ТЗ | Roblox и др. | не HUD |

## PR #43 / #44

| Ветка | PR | `RgdDh.jpg` до #47 |
|-------|-----|-------------------|
| `cursor/scenario-preview-d81d` | **#43** | 185368 B, Adopt Me |
| `cursor/roblox-ep1-d99c` | **#44** | 185368 B, Adopt Me |

Код: `js/game.js` (cemetery bg), `js/world/location-enrich.mjs` (~500).

**PR #43:** не пушить (QA freeze).
