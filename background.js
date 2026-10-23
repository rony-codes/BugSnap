
const API_BASE_URL = "https://bugsnap-9nc9.onrender.com";
const API_URL = `${API_BASE_URL}/api/sessions`;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action !==  `${API_BASE_URL}/report/${encodeURIComponent(data.sessionId)}`) {
    return;
  }

  saveSession(message.events)
    .then((data) => {
      sendResponse({
        success: true,
        sessionId: data.sessionId,
        eventCount: data.eventCount,
        sessionUrl: `${API_URL}/${data.sessionId}`
      });
    })
    .catch((error) => {
      console.error("[BugSnap] Failed to save session:", error);

      sendResponse({
        success: false,
        message: error.message
      });
    });

  return true;
});

async function saveSession(events) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ events })
  });

  const data = await response.json();

  if (!response.ok || !data.success || !data.sessionId) {
    throw new Error(data.message || "Unable to save session.");
  }

  console.log("[BugSnap] Session saved:", data.sessionId);

  return data;
}
