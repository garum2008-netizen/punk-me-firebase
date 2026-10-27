/* Safe chat UI strings — RU / UK / EN / DA */
const SAFE_CHAT_I18N = {
  ru: {
    chatNotSent: "Сообщение не отправлено",
    chatFreeTextOff: "Только готовые фразы",
    chatReport: "Пожаловаться",
    chatBlock: "Скрыть игрока",
    chatReported: "Жалоба отправлена"
  },
  uk: {
    chatNotSent: "Повідомлення не надіслано",
    chatFreeTextOff: "Лише готові фрази",
    chatReport: "Поскаржитися",
    chatBlock: "Приховати гравця",
    chatReported: "Скаргу надіслано"
  },
  en: {
    chatNotSent: "Message not sent",
    chatFreeTextOff: "Quick phrases only",
    chatReport: "Report",
    chatBlock: "Hide player",
    chatReported: "Report submitted"
  },
  da: {
    chatNotSent: "Besked ikke sendt",
    chatFreeTextOff: "Kun hurtigfraser",
    chatReport: "Anmeld",
    chatBlock: "Skjul spiller",
    chatReported: "Anmeldelse sendt"
  }
};

window.tSafeChat = function (key) {
  const lang = typeof window.getLanguage === "function" ? window.getLanguage() : "en";
  const pack = SAFE_CHAT_I18N[lang] || SAFE_CHAT_I18N.uk || SAFE_CHAT_I18N.en;
  return pack[key] || SAFE_CHAT_I18N.en[key] || key;
};
