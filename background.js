let creatingOffscreen = null;

async function ensureOffscreen(path = "offscreen.html") {
  const offscreenUrl = chrome.runtime.getURL(path);

  if ("getContexts" in chrome.runtime) {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ["OFFSCREEN_DOCUMENT"],
      documentUrls: [offscreenUrl],
    });
    if (contexts.length > 0) return;
  }

  if (creatingOffscreen) {
    await creatingOffscreen;
    return;
  }

  creatingOffscreen = chrome.offscreen.createDocument({
    url: path,
    reasons: ["BLOBS"],
    justification:
      "Generate blob URLs for static HTML downloads without opening tabs.",
  });

  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

function onceMessage(type, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(new Error(`Timeout waiting for ${type}`));
    }, timeout);

    function listener(msg) {
      if (msg?.type !== type) return;
      clearTimeout(timer);
      chrome.runtime.onMessage.removeListener(listener);
      resolve(msg);
    }

    chrome.runtime.onMessage.addListener(listener);
  });
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "START_EXPORT") {
    (async () => {
      try {
        const res = await chrome.tabs.sendMessage(msg.tabId, {
          type: "EXPORT_STATIC_PAGE",
        });
        sendResponse(
          res?.ok ? res : { ok: false, error: res?.error || "Export failed" },
        );
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }

  if (msg.type === "START_DOWNLOAD_JOB") {
    (async () => {
      try {
        await ensureOffscreen();

        chrome.runtime.sendMessage({
          type: "OFFSCREEN_BUILD_BLOB_URL",
          html: msg.html,
        });

        const result = await onceMessage("OFFSCREEN_BLOB_URL_READY");

        const downloadId = await chrome.downloads.download({
          url: result.url,
          filename: `${msg.filename}.html`,
          saveAs: !!msg.saveAs,
          conflictAction: "uniquify",
        });

        chrome.runtime.sendMessage({
          type: "OFFSCREEN_REVOKE_BLOB_URL",
          url: result.url,
        });

        sendResponse({ ok: true, downloadId });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true;
  }
});
