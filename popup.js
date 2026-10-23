
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusText = document.getElementById("status");

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

startBtn.addEventListener("click", async () => {
  try {
    const tab = await getActiveTab();

    const response = await sendTabMessage(tab.id, {
      action: "START_RECORDING"
    });

    if (!response?.success) {
      throw new Error("Could not start recording.");
    }

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
      throw new Error("Could not stop recording.");
    }

    const events = result.events;

    if (events.length === 0) {
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

    if (!saved?.success) {
      throw new Error(saved?.message || "Session save failed.");
    }

    await chrome.storage.local.set({
      isRecording: false,
      recordedEvents: []
    });

    updateStatus(false);

    alert(
      "BugSnap session saved successfully!\n\n" +
      `Session ID: ${saved.sessionId}\n\n` +
      "Open this URL to view your saved session:\n" +
      saved.sessionUrl
    );

    console.log("[BugSnap] Session URL:", saved.sessionUrl);
  } catch (error) {
    statusText.textContent = "Status: Save failed";
    console.error("[BugSnap]", error.message);

    alert(
      "BugSnap could not save the session.\n\n" +
      error.message +
      "\n\nYour recorded events may still be stored locally."
    );
  }
});

// Restore the popup status whenever it opens.
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
    console.error("[BugSnap] Could not restore status:", error);
  }
}

restoreStatus();
