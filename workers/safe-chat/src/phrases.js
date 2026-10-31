/** Preset phrase buttons — always allowed (even when free text is off). */
export const PHRASES = [
  { id: "hi", ru: "Привет!", uk: "Привіт!", en: "Hi!", da: "Hej!" },
  { id: "gg", ru: "GG", uk: "GG", en: "GG", da: "GG" },
  { id: "cemetery", ru: "Пойдём на кладбище", uk: "Підемо на цвинтар", en: "Let's hit the cemetery", da: "Skal vi til kirkegården?" },
  { id: "street", ru: "На улицу!", uk: "На вулицю!", en: "To the street!", da: "Ud på gaden!" },
  { id: "help", ru: "Нужна помощь", uk: "Потрібна допомога", en: "Need help", da: "Brug for hjælp" },
  { id: "thanks", ru: "Спасибо!", uk: "Дякую!", en: "Thanks!", da: "Tak!" },
  { id: "lol", ru: "😂", uk: "😂", en: "😂", da: "😂" }
];

export function phraseById(id) {
  return PHRASES.find(p => p.id === id) || null;
}

export function phraseText(id, lang) {
  const p = phraseById(id);
  if (!p) return null;
  const l = ["ru", "uk", "en", "da"].includes(lang) ? lang : "en";
  return p[l] || p.en;
}
