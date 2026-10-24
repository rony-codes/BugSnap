
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("status");

const resultBox = document.getElementById("result");
const sessionIdText = document.getElementById("sessionId");
const copyBtn = document.getElementById("copyBtn");
const reportLink = document.getElementById("reportLink");

function updateStatus(isRecording, eventCount = 0) {
  statusText.textContent = isRecording
    ? `Status: Recording (${eventCount} events)`
    : "Status: Not recording";
}

function sendTabMessage(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });

  if (!tabs[0]?.id) {
    throw new Error("No active browser tab found.");
  }

  return tabs[0];
}

// Copy only the session ID.
copyBtn.addEventListener("click", async () => {
  const sessionId = sessionIdText.textContent;

  if (!sessionId) {
    return;
  }

  try {
    await navigator.clipboard.writeText(sessionId);

    copyBtn.textContent = "Copied!";

    setTimeout(() => {
      copyBtn.textContent = "Copy Session ID";
    }, 1500);
  } catch (error) {
    console.error("[BugSnap] Copy failed:", error);

    // Fallback: select the ID so it can be copied manually.
    const range = document.createRange();
    range.selectNodeContents(sessionIdText);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    copyBtn.textContent = "Select and copy ID";
  }
});

startBtn.addEventListener("click", async () => {
  try {
    const tab = await getActiveTab();

    const response = await sendTabMessage(tab.id, {
      action: "START_RECORDING"
    });

    if (!response?.success) {
      throw new Error(
        response?.message || "Could not start recording."
      );
    }

    // Hide any previous session result.
    resultBox.hidden = true;

    updateStatus(true, response.eventCount);
  } catch (error) {
    statusText.textContent = "Status: Cannot access this page";

    console.error("[BugSnap] Full error:", error);
    console.error("[BugSnap] Error message:", error.message);
    console.error("[BugSnap] Stack:", error.stack);
  }
});

stopBtn.addEventListener("click", async () => {
  statusText.textContent = "Status: Stopping...";

  try {
    const tab = await getActiveTab();

    const result = await sendTabMessage(tab.id, {
      action: "STOP_RECORDING"
    });

    if (!result?.success) {
      throw new Error(
        result?.message || "Could not stop recording."
      );
    }

    const events = result.events;

    if (!Array.isArray(events) || events.length === 0) {
      await chrome.storage.local.set({
        isRecording: false,
        recordedEvents: []
      });

      updateStatus(false);
      alert("No events were recorded.");
      return;
    }

    statusText.textContent = "Status: Saving session...";

    const saved = await sendRuntimeMessage({
      action: "SAVE_SESSION",
      events
    });

    if (!saved?.success || !saved.sessionId || !saved.sessionUrl) {
      throw new Error(
        saved?.message || "Session save failed."
      );
    }

    await chrome.storage.local.set({
      isRecording: false,
      recordedEvents: []
    });

    updateStatus(false);

    // Display the saved session inside the extension popup.
    sessionIdText.textContent = saved.sessionId;
    reportLink.href = saved.sessionUrl;
    resultBox.hidden = false;

    console.log("[BugSnap] Session ID:", saved.sessionId);
    console.log("[BugSnap] Session URL:", saved.sessionUrl);
  } catch (error) {
    statusText.textContent = "Status: Save failed";

    console.error("[BugSnap] Save error:", error);

    alert(
      "BugSnap could not save the session.\n\n" +
      error.message +
      "\n\nYour recorded events may still be stored locally."
    );
  }
});

// Restore recording status whenever the popup opens.
async function restoreStatus() {
  try {
    const state = await chrome.storage.local.get([
      "isRecording",
      "recordedEvents"
    ]);

    updateStatus(
      Boolean(state.isRecording),
      Array.isArray(state.recordedEvents)
        ? state.recordedEvents.length
        : 0
    );
  } catch (error) {
    console.error(
      "[BugSnap] Could not restore status:",
      error
    );
  }
}

restoreStatus();
