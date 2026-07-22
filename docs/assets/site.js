window.ARCHIVE_SITE = {
  // Paste your Chrome Web Store URL after approval (leave empty until then)
  chromeStoreUrl: "",

  // Buttondown newsletter username — create free at https://buttondown.com
  // Form posts to: https://buttondown.com/api/emails/embed/subscribe/YOUR_USERNAME
  buttondownUsername: "",

  // Optional Formspree fallback for name + email (https://formspree.io — free tier)
  formspreeId: "",

  supportEmail: "archivememory.support@gmail.com",
  githubUrl: "https://github.com/archivememorysupport/archive",
};

(function initSite() {
  const cfg = window.ARCHIVE_SITE;

  document.querySelectorAll("[data-chrome-store]").forEach((el) => {
    if (cfg.chromeStoreUrl) {
      el.href = cfg.chromeStoreUrl;
      el.classList.remove("is-disabled");
    } else {
      el.href = "#install";
      el.classList.add("is-disabled");
    }
  });

  const emailForm = document.getElementById("updates-form");
  if (emailForm && cfg.buttondownUsername) {
    emailForm.action = `https://buttondown.com/api/emails/embed/subscribe/${cfg.buttondownUsername}`;
  }

  const formspreeForm = document.getElementById("updates-form-fallback");
  if (formspreeForm && cfg.formspreeId) {
    formspreeForm.action = `https://formspree.io/f/${cfg.formspreeId}`;
  }
})();
