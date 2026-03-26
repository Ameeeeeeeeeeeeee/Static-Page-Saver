function getCssText() {
  let css = "";
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) css += rule.cssText + "\n";
    } catch (_) {}
  }
  return css;
}

function buildHtml() {
  const clone = document.cloneNode(true);

  clone.querySelectorAll("script").forEach((el) => el.remove());
  clone.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());

  const head = clone.querySelector("head");
  if (head) {
    const style = clone.createElement("style");
    style.textContent = getCssText();
    head.appendChild(style);
  }

  return "<!doctype html>\n" + clone.documentElement.outerHTML;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== "EXPORT_STATIC_PAGE") return;

  try {
    sendResponse({ ok: true, html: buildHtml() });
  } catch (e) {
    sendResponse({ ok: false, error: String(e) });
  }
});
