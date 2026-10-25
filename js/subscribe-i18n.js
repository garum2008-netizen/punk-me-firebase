const SUB_I18N = {
  ru: {
    page_title: "PUNK ME — Цена и условия",
    back_game: "Играть (бесплатно сейчас)",
    age_label: "13+ — не детская игра. Отдельная детская версия существует.",
    model_title: "Подписка",
    model_free: "Подписка на канал (YouTube и др.) — бесплатно, новости и трейлеры.",
    model_paid: "Платная подписка открывает полный доступ к игре PUNK ME в браузере.",
    price: "4,99 € / месяц",
    price_note: "Автопродление каждый месяц, пока не отмените. Отмена в любой момент в настройках аккаунта после запуска оплаты (инструкция будет в письме-подтверждении).",
    iap: "Внутриигровые аксессуары (одежда, питомцы, декор) можно будет покупать за реальные деньги — только с согласия владельца аккаунта; лимиты для несовершеннолетних — с согласия родителей.",
    minors: "До 18 лет — только с согласия родителя или законного представителя.",
    eu_title: "Право на отказ (ЕС)",
    eu_body: "Для цифрового контента в ЕС у вас есть 14 дней на отказ от договора. Если вы соглашаетесь на немедленный доступ к игре и отказываетесь от права на отказ до окончания 14 дней, доступ начинается сразу после оплаты (стандартная формулировка директивы о правах потребителей).",
    eu_checkbox: "Я понимаю: при будущей оплате мне нужно будет отметить согласие на немедленный доступ и отказ от 14-дневного права на отказ для цифрового контента (сейчас оплата не активна).",
    subscribe_btn: "Подписаться",
    subscribe_soon: "Скоро — оплата ещё не подключена",
    seller_title: "Продавец",
    seller_body: "ContractBot / Inna Kragh · support@contractbot.dk (контакт для цены и условий)",
    links_terms: "Условия использования",
    links_privacy: "Политика конфиденциальности",
    not_gated: "Игра сейчас доступна без оплаты — этот раздел только информирует о будущей модели.",
    account_link: "Войти в аккаунт"
  },
  en: {
    page_title: "PUNK ME — Price & terms",
    back_game: "Play (free for now)",
    age_label: "13+ — not a kids' game. A separate kids' version exists.",
    model_title: "Subscription",
    model_free: "Channel subscription (YouTube, etc.) is free — news and trailers.",
    model_paid: "Paid subscription unlocks full access to the PUNK ME browser game.",
    price: "€4.99 / month",
    price_note: "Auto-renews monthly until you cancel. Cancel anytime in account settings once billing is live (steps will be in your confirmation email).",
    iap: "In-game accessories (clothes, pets, decor) may be purchased with real money — only with account-holder consent; under-18s require parental consent.",
    minors: "Under 18: parental or guardian consent required.",
    eu_title: "EU withdrawal right",
    eu_body: "In the EU you have 14 days to withdraw from a digital content contract. If you agree to immediate access and waive the 14-day withdrawal right for digital content, access starts right after payment (standard Consumer Rights Directive pattern).",
    eu_checkbox: "I understand: when payment goes live I will need to tick consent for immediate access and waiver of the 14-day withdrawal right for digital content (billing is not active yet).",
    subscribe_btn: "Subscribe",
    subscribe_soon: "Coming soon — not chargeable yet",
    seller_title: "Seller",
    seller_body: "ContractBot / Inna Kragh · support@contractbot.dk (price & terms contact)",
    links_terms: "Terms of use",
    links_privacy: "Privacy policy",
    not_gated: "The game is currently playable without payment — this page describes the upcoming model only.",
    account_link: "Sign in to your account"
  },
  da: {
    page_title: "PUNK ME — Pris og vilkår",
    back_game: "Spil (gratis lige nu)",
    age_label: "13+ — ikke et børnespil. En separat børneversion findes.",
    model_title: "Abonnement",
    model_free: "Kanal-abonnement (YouTube osv.) er gratis — nyheder og trailere.",
    model_paid: "Betalt abonnement låser fuld adgang til PUNK ME i browseren op.",
    price: "4,99 € / måned",
    price_note: "Fornyes automatisk hver måned, indtil du opsiger. Opsig når som helst i kontoindstillinger, når betaling er live (vejledning i bekræftelsesmail).",
    iap: "Tilbehør i spillet (tøj, kæledyr, dekoration) kan købes for rigtige penge — kun med kontohaverens samtykke; under 18 kræver forældres samtykke.",
    minors: "Under 18: kræver forælder/værges samtykke.",
    eu_title: "Fortrydelsesret (EU)",
    eu_body: "I EU har du 14 dage til at fortryde et digitalt indholdskøb. Hvis du accepterer øjeblikkelig adgang og fraskriver dig 14-dages fortrydelsesret for digitalt indhold, starter adgang ved betaling (standard forbrugerret).",
    eu_checkbox: "Jeg forstår: når betaling aktiveres, skal jeg markere samtykke til øjeblikkelig adgang og fraskrivelse af 14-dages fortrydelsesret (betaling er ikke aktiv endnu).",
    subscribe_btn: "Abonner",
    subscribe_soon: "Kommer snart — kan ikke betales endnu",
    seller_title: "Sælger",
    seller_body: "ContractBot / Inna Kragh · support@contractbot.dk (pris og vilkår)",
    links_terms: "Brugsvilkår",
    links_privacy: "Privatlivspolitik",
    not_gated: "Spillet kan spilles uden betaling nu — denne side beskriver kun den kommende model.",
    account_link: "Log ind på konto"
  }
};

let subLang = "en";

function subT(k) {
  return (SUB_I18N[subLang] && SUB_I18N[subLang][k]) || SUB_I18N.en[k] || k;
}

function applySubI18n() {
  document.querySelectorAll("[data-sub]").forEach(el => {
    const k = el.getAttribute("data-sub");
    if (k) el.textContent = subT(k);
  });
  document.documentElement.lang = subLang;
  document.title = subT("page_title");
  document.querySelectorAll(".lang-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.lang === subLang);
  });
}

function setSubLang(lang) {
  if (!SUB_I18N[lang]) lang = "en";
  subLang = lang;
  try { localStorage.setItem("punkme_lang", lang); } catch (e) {}
  applySubI18n();
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    const stored = localStorage.getItem("punkme_lang");
    if (stored && SUB_I18N[stored]) subLang = stored;
    else {
      const l = (navigator.language || "en").slice(0, 2).toLowerCase();
      if (SUB_I18N[l]) subLang = l;
    }
  } catch (e) {}
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.onclick = () => setSubLang(btn.dataset.lang);
  });
  applySubI18n();
});
