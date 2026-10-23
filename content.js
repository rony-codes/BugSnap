
let isRecording = false;
let recordedEvents = [];
let stateReady;

function loadRecordingState() {
  stateReady = chrome.storage.local.get([
    "isRecording",
    "recordedEvents"
  ]).then((state) => {
    isRecording = Boolean(state.isRecording);
    recordedEvents = Array.isArray(state.recordedEvents)
      ? state.recordedEvents
      : [];

    if (isRecording) {
      document.addEventListener("click", handleClick, true);
    }
  });

  return stateReady;
}

function handleClick(event) {
  if (!isRecording || !(event.target instanceof Element)) {
    return;
  }

  const element = event.target;
  const tagName = element.tagName.toLowerCase();
  const id = element.id;
  const className =
    typeof element.className === "string"
      ? element.className
      : element.getAttribute("class") || "";

  const targetElement =
    tagName +
    (id ? `#${id}` : "") +
    (className.trim()
      ? "." + className.trim().split(/\s+/).join(".")
      : "");

  const recordedEvent = {
    timestamp: new Date().toISOString(),
    eventType: "click",
    targetElement,
    details: {
      tagName,
      id,
      className,
      text: (
        element.innerText ||
        element.textContent ||
        ""
      ).trim().slice(0, 100)
    }
  };

  recordedEvents.push(recordedEvent);

  // Persist each update so the popup can display the real count.
  chrome.storage.local.set({
    isRecording: true,
    recordedEvents
  }).catch((error) => {
    console.error("[BugSnap] Failed to store event:", error);
  });

  console.log(
    `[BugSnap] Event recorded. Total: ${recordedEvents.length}`,
    recordedEvent
  );
}

chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (message.action === "START_RECORDING") {
      loadRecordingState().then(async () => {
        if (!isRecording) {
          recordedEvents = [];
          isRecording = true;
        }

        document.removeEventListener("click", handleClick, true);
        document.addEventListener("click", handleClick, true);

        await chrome.storage.local.set({
          isRecording: true,
          recordedEvents
        });

        sendResponse({
          success: true,
          isRecording: true,
          eventCount: recordedEvents.length
        });
      }).catch((error) => {
        sendResponse({
          success: false,
          message: error.message
        });
      });

      return true;
    }

    if (message.action === "STOP_RECORDING") {
      loadRecordingState().then(async () => {
        document.removeEventListener("click", handleClick, true);
        isRecording = false;

        await chrome.storage.local.set({
          isRecording: false,
          recordedEvents
        });

        console.log(
          `[BugSnap] Recording stopped. Total events: ${recordedEvents.length}`
        );

        sendResponse({
          success: true,
          isRecording: false,
          events: recordedEvents
        });
      }).catch((error) => {
        sendResponse({
          success: false,
          message: error.message
        });
      });

      return true;
    }

    if (message.action === "GET_RECORDING_STATUS") {
      stateReady.then(() => {
        sendResponse({
          success: true,
          isRecording,
          eventCount: recordedEvents.length
        });
      });

      return true;
    }
  }
);

loadRecordingState();
