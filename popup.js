const $ = (id) => document.getElementById(id);

function cleanName(name) {
  return (
    (name || "page")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || "page"
  );
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function loadPrefs(defaultFilename) {
  const { filename = defaultFilename } = await chrome.storage.local.get([
    "filename",
  ]);
  return { filename };
}

async function savePrefs(filename) {
  await chrome.storage.local.set({ filename });
}

function setBusy(isBusy) {
  $("quickBtn").disabled = isBusy;
  $("saveAsBtn").disabled = isBusy;
  $("filename").disabled = isBusy;
}

async function start(saveAs) {
  try {
    setBusy(true);

    const tab = await getActiveTab();
    const filename = cleanName($("filename").value);

    await savePrefs(filename);

    const exportRes = await chrome.runtime.sendMessage({
      type: "START_EXPORT",
      tabId: tab.id,
    });

    if (!exportRes?.ok) {
      setBusy(false);
      return;
    }

    chrome.runtime.sendMessage({
      type: "START_DOWNLOAD_JOB",
      html: exportRes.html,
      filename,
      saveAs,
    });

    window.close();
  } catch (e) {
    console.error(e);
    setBusy(false);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const tab = await getActiveTab();
  const defaultFilename = cleanName(tab?.title || "page");
  const prefs = await loadPrefs(defaultFilename);

  $("filename").value = prefs.filename;
  $("filename").select();

  $("quickBtn").addEventListener("click", () => start(false));
  $("saveAsBtn").addEventListener("click", () => start(true));

  $("filename").addEventListener("keydown", (e) => {
    if (e.key === "Enter") start(true);
  });
});
