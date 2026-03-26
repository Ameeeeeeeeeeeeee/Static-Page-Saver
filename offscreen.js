chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "OFFSCREEN_BUILD_BLOB_URL") {
    try {
      const blob = new Blob([msg.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      chrome.runtime.sendMessage({
        type: "OFFSCREEN_BLOB_URL_READY",
        url,
      });
      sendResponse?.({ ok: true });
    } catch (e) {
      sendResponse?.({ ok: false, error: String(e) });
    }
    return true;
  }

  if (msg.type === "OFFSCREEN_REVOKE_BLOB_URL") {
    try {
      URL.revokeObjectURL(msg.url);
      sendResponse?.({ ok: true });
    } catch (e) {
      sendResponse?.({ ok: false, error: String(e) });
    }
    return true;
  }
});
