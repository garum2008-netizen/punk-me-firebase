# PUNK ME — Character Bible

Original punk-gang teens for **PUNK ME**. Visual references live in `imagine_images/` as posters/UI only.

## Playable gang

### Razor (Рейзор)
- **Look:** Black spiky hair, leather jacket, heavy chain, narrow stance. Ref: `imagine_images/LTPb8.jpg`
- **Personality:** Street captain, protective, tests newcomers with duels.
- **Role:** Gang leader on the street, chain-fight tutor, intro quest giver.
- **Catchphrases (RU):** «Цепи — наш гимн.» · «Ночь принадлежит банде.»
- **Catchphrases (EN):** “Chains are our anthem.” · “The night belongs to the gang.”
- **Catchphrases (DA):** “Kæder er vores hymne.” · “Natten tilhører banden.”

### Vienna (Вена) — pink mohawk
- **3D:** Meshy **Neon Rebel** `assets/models/meshy/punk_pink.glb` (canonical Vienna; original texture, default hero).
- **Look:** Hot-pink mohawk, dark punk dress, neon choker. Ref: `imagine_images/Oo040.jpg`
- **Personality:** Bold, cemetery-side strategist, builder of the crew’s territory.
- **Role:** Cemetery jobs, crypt-building quest, morale on the street.
- **Catchphrases (RU):** «NOT DEAD YET — про нас.» · «Кладбище платит честно.»
- **Catchphrases (EN):** “NOT DEAD YET — that's us.” · “The cemetery pays fair.”
- **Catchphrases (DA):** “NOT DEAD YET — det er os.” · “Kirkegården betaler fair.”

### Cobalt (Кобальт) — blue pigtails
- **Look:** Cyan-blue twin tails, skull tee, spike bracelets. Inspired by blue-pigtail girl in street art (`imagine_images/77Mdp.jpg` gang lineup).
- **Personality:** Fast talker, parkour scout, cheers the team up.
- **Role:** Parkour rep quest, quick emotes, scout on rooftops (future).
- **Catchphrases (RU):** «Прыгай выше неона!» · «Я вижу короткий путь.»
- **Catchphrases (EN):** “Jump higher than the neon!” · “I see a shortcut.”
- **Catchphrases (DA):** “Hop højere end neonen!” · “Jeg ser en genvej.”

### Mohawk (Ирокез) — green flame
- **3D:** Meshy `assets/models/meshy/mohawk.glb` (Inna; original texture, clips Idle / Walking / Running).
- **Look:** Lime-green mohawk, spell scrolls, neon gloves. Ref: `imagine_images/Lix06.jpg`
- **Personality:** Reckless mage, loves flashy magic and shop scrolls.
- **Role:** Magic shop hype, parkour rep ally, spell VFX in fights.
- **Catchphrases (RU):** «Магия жжёт по-настоящему.» · «Купи свиток — не пожалеешь.»
- **Catchphrases (EN):** “Magic really burns.” · “Buy a scroll — you won't regret it.”
- **Catchphrases (DA):** “Magien brænder ægte.” · “Køb en rune — du fortryder ikke.”

## NPC-only

### Ghost (Призрак сцены)
- **Look:** Pale skin, lavender hair, stage headphones. Ref: `imagine_images/ilRF3.jpg`
- **Role:** Ambient lore, bass-night warnings, no playable slot yet.

### Gravedigger (Смотритель)
- **Look:** Earth tones, shovel, worn coat. Ref: `imagine_images/HePl7.jpg`
- **Role:** Cemetery job board, paid shifts.

## Animation notes (all rigs: CC0 Quaternius teen + Universal Animation Library)
| Beat | Clips (retargeted) |
|------|---------------------|
| Idle | `Idle_Loop`, character-tuned speed |
| Walk / run | `Walk_Loop` / `Jog_Fwd_Loop` |
| Talk | `Idle_Talking_Loop` + jaw procedural |
| Emote | `Sword_Idle`, `Idle_Torch_Loop` (per character) |
| Fight chain | `Jog_Fwd_Loop` + arm overlay |
| Hit / KO | procedural + `Crouch_Idle_Loop` |
| Victory | `Idle_Talking_Loop` + emote scale |

Procedural layer: head look-at player, blink timer, breath on spine (all characters).
