/** Sandbox Stripe checkout — only when subscribe page sets data-stripe-endpoint (preview/hosting env). */
(function () {
  const endpoint = document.body?.dataset?.stripeEndpoint;
  const btn = document.querySelector(".btn-subscribe");
  if (!endpoint || !btn) return;
  const isProdHost = /halloween\.punk\.|punk-me-40605\.(web\.app|firebaseapp\.com)/i.test(location.hostname);
  if (isProdHost) return;

  btn.disabled = false;
  btn.removeAttribute("aria-disabled");
  btn.querySelector(".soon")?.remove();
  btn.addEventListener("click", async () => {
    const uid = window.me?.uid || window.uid;
    if (!uid) {
      alert("Sign in to the game first, then return to subscribe.");
      location.href = "index.html#account";
      return;
    }
    btn.disabled = true;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          successUrl: location.origin + "/subscribe.html?paid=1",
          cancelUrl: location.origin + "/subscribe.html?cancel=1"
        })
      });
      const data = await res.json();
      if (data.url) location.href = data.url;
      else throw new Error(data.error || "no_url");
    } catch (e) {
      console.error(e);
      alert("Sandbox checkout unavailable (configure STRIPE_* on server).");
      btn.disabled = false;
    }
  });
})();
