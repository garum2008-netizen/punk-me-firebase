# Cosmetic catalog (data + premium proposal)

**Source of truth:** `data/story/avatar-catalog.json`

## Free tiers (counts)

| Category | Count in JSON | Target met |
|----------|---------------|------------|
| Skin tones | 12 | ✅ |
| Hairstyles | 15 | ✅ |
| Hair colors | 20 | ✅ |
| Face presets | 8 | ✅ |
| Body presets | 6 | ✅ |
| Clothing styles | 5 | ⚠️ (20 clothing **pieces** need mesh expansion; styles = color sets) |
| Accessories | 10 | ✅ |

Combinatorics: >12×15×20×6×5×2^10 visible variants via tint/hair/body/style/accessory flags.

## Premium packs (proposed, inactive)

| Pack | Items | Indicative |
|------|-------|------------|
| Cyber Angel | wings, cyber outfit, aura | €TBD |
| Dark Punk | gothic outfit, chains | €TBD |
| Street Legend | street crop, backpack, headphones | €TBD |
| Fantasy Guardian | angel waves, wings, crown | €TBD |

Fold into `MONETIZATION_CH1_PROPOSAL.md` Model B hybrid. **No checkout.**

## Shop screen

In-game `#shopModal` — gameplay items only today; cosmetic SKUs require catalog wiring + parent gate (preview).
