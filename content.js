
let isRecording = false;
let recordedEvents = [];
let lastRecordedClick = null;

const pendingInputs = new Map();
const INPUT_DEBOUNCE_MS = 800;

function clean(value) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim()
    : "";
}

function getElementDetails(target) {
  if (!(target instanceof Element)) {
    return {
      elementType: "unknown",
      elementName: "Unknown element",
      selector: null,
      sensitive: false
    };
  }

  const selectorQuery = [
    "button",
    "input",
    "textarea",
    "select",
    "a",
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="combobox"]',
    '[contenteditable="true"]'
  ].join(", ");

  const element = target.closest(selectorQuery) || target;
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute("role");
  const inputType = tag === "input"
    ? (element.getAttribute("type") || "text").toLowerCase()
    : "";

  let elementType = tag;

  if (tag === "button" || role === "button") {
    elementType = "button";
  } else if (tag === "input") {
    elementType =
      inputType === "checkbox" ? "checkbox" :
      inputType === "radio" ? "radio button" :
      inputType === "password" ? "password field" :
      ["submit", "reset", "button"].includes(inputType) ? "button" :
      inputType === "email" ? "email field" :
      inputType === "search" ? "search field" :
      "input field";
  } else if (tag === "textarea") {
    elementType = "text area";
  } else if (tag === "select" || role === "combobox") {
    elementType = "dropdown";
  } else if (tag === "a" || role === "link") {
    elementType = "link";
  } else if (role === "checkbox") {
    elementType = "checkbox";
  } else if (role === "radio") {
    elementType = "radio button";
  } else if (element.isContentEditable) {
    elementType = "editable field";
  }

  const labelledBy = clean(
    element.getAttribute("aria-labelledby")
  )
    .split(/\s+/)
    .filter(Boolean)
    .map(id => document.getElementById(id)?.innerText || "")
    .join(" ");

  const labels = element.labels
    ? Array.from(element.labels)
        .map(label => label.innerText)
        .join(" ")
    : "";

  let elementName =
    clean(element.getAttribute("aria-label")) ||
    clean(labelledBy) ||
    clean(labels) ||
    clean(element.getAttribute("placeholder")) ||
    clean(element.getAttribute("title")) ||
    clean(element.innerText) ||
    clean(element.getAttribute("name")) ||
    clean(element.id) ||
    `${elementType} element`;

  const sensitive =
    inputType === "password" ||
    inputType === "hidden" ||
    ["current-password", "new-password", "one-time-code"].includes(
      element.getAttribute("autocomplete")
    ) ||
    element.matches("[data-private], [data-sensitive]");

  if (sensitive) {
    elementName =
      clean(element.getAttribute("aria-label")) ||
      clean(labels) ||
      (inputType === "password"
        ? "Password field"
        : "Sensitive field");
  }

  let selector = tag;

  if (element.id) {
    selector = `#${CSS.escape(element.id)}`;
  } else if (element.getAttribute("data-testid")) {
    selector = `[data-testid="${CSS.escape(
      element.getAttribute("data-testid")
    )}"]`;
  } else if (element.getAttribute("name")) {
    selector = `${tag}[name="${CSS.escape(
      element.getAttribute("name")
    )}"]`;
  }

  return {
    elementType,
    elementName: elementName.slice(0, 100),
    selector,
    sensitive,
    tag,
    inputType
  };
}

function saveEventsToStorage() {
  chrome.storage.local.set({
    isRecording,
    recordedEvents
  });
}

function recordEvent(eventType, target, extraDetails = {}) {
  if (!isRecording) return;

  const element = getElementDetails(target);

  recordedEvents.push({
    timestamp: new Date().toISOString(),
    eventType,
    targetElement: element.elementType,
    details: {
      elementName: element.elementName,
      selector: element.selector,
      url: location.href,
      ...extraDetails
    }
  });

  saveEventsToStorage();
}

function describeClick(element) {
  if (element.elementType === "link") {
    return "Clicked link";
  }

  if (element.elementType === "button") {
    return "Clicked button";
  }

  if (element.elementType === "checkbox") {
    return "Clicked checkbox";
  }

  if (element.elementType === "radio button") {
    return "Selected radio button";
  }

  if (element.elementType === "dropdown") {
    return "Opened dropdown";
  }

  if (
    element.elementType.includes("field") ||
    element.elementType === "text area" ||
    element.elementType === "editable field"
  ) {
    return "Focused field";
  }

  // Avoid recording clicks on headings, paragraphs, and generic containers.
  return null;
}

function handleClick(event) {
  if (!isRecording) return;

  const element = getElementDetails(event.target);
  const action = describeClick(element);

  if (!action) return;

  // Suppress duplicate clicks on the same element within a short interval.
  const now = Date.now();
  const clickKey = `${element.selector}|${element.elementName}`;

  if (
    lastRecordedClick &&
    lastRecordedClick.key === clickKey &&
    now - lastRecordedClick.time < 250
  ) {
    return;
  }

  lastRecordedClick = { key: clickKey, time: now };

  recordEvent("click", event.target, {
    description: `${action}: ${element.elementName}`
  });
}

function isTextEntryField(target) {
  if (!(target instanceof Element)) return false;

  if (target instanceof HTMLTextAreaElement) return true;
  if (target.isContentEditable) return true;

  if (!(target instanceof HTMLInputElement)) return false;

  return [
    "text",
    "email",
    "search",
    "tel",
    "url",
    "number"
  ].includes((target.type || "text").toLowerCase());
}

function handleInput(event) {
  if (!isRecording) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const element = getElementDetails(target);

  // Never record typed values. Sensitive fields produce no typing events.
  if (element.sensitive) return;

  // Group text entry into one event per field interaction.

  if (isTextEntryField(target)) {
    const key = element.selector || element.elementName;

    if (pendingInputs.has(key)) {
      clearTimeout(pendingInputs.get(key).timer);
    }

    const pendingInput = {
      target,
      elementName: element.elementName,
      timer: setTimeout(() => {
        pendingInputs.delete(key);

        if (!isRecording) return;

        recordEvent("input", target, {
          description: `Entered text in ${element.elementName}`
        });
      }, INPUT_DEBOUNCE_MS)
    };

    pendingInputs.set(key, pendingInput);
    return;
  }


  // Don't produce a stream of input events for other controls.
}

function flushPendingInputs() {
  for (const [key, pendingInput] of pendingInputs.entries()) {
    clearTimeout(pendingInput.timer);
    pendingInputs.delete(key);

    if (!isRecording) continue;

    recordEvent("input", pendingInput.target, {
      description: `Entered text in ${pendingInput.elementName}`
    });
  }
}

function handleFocusOut(event) {
  if (!isRecording) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const element = getElementDetails(target);
  const key = element.selector || element.elementName;

  if (!isTextEntryField(target) || element.sensitive) return;

  if (pendingInputs.has(key)) {
    clearTimeout(pendingInputs.get(key).timer);
    pendingInputs.delete(key);

    recordEvent("input", target, {
      description: `Entered text in ${element.elementName}`
    });
  }
}

function handleChange(event) {
  if (!isRecording) return;

  const target = event.target;
  if (!(target instanceof Element)) return;

  const element = getElementDetails(target);

  if (element.sensitive) return;

  if (
    target instanceof HTMLInputElement &&
    ["checkbox", "radio"].includes(target.type)
  ) {
    recordEvent("change", target, {
      checked: target.checked,
      description: target.checked
        ? `Selected ${element.elementName}`
        : `Unselected ${element.elementName}`
    });
    return;
  }

  if (
    target instanceof HTMLSelectElement ||
    target.getAttribute("role") === "combobox"
  ) {
    // Do not record selected values because they may contain personal data.
    recordEvent("change", target, {
      description: `Changed selection in ${element.elementName}`
    });
  }
}

document.addEventListener("click", handleClick, true);
document.addEventListener("input", handleInput, true);
document.addEventListener("focusout", handleFocusOut, true);
document.addEventListener("change", handleChange, true);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_RECORDING") {
    flushPendingInputs();

    recordedEvents = [];
    lastRecordedClick = null;
    isRecording = true;

    recordedEvents.push({
      timestamp: new Date().toISOString(),
      eventType: "recording_started",
      targetElement: "page",
      details: {
        elementName: document.title || "Page",
        selector: null,
        url: location.href,
        description: `Started recording on ${document.title || location.href}`
      }
    });

    saveEventsToStorage();

    sendResponse({
      success: true,
      eventCount: recordedEvents.length
    });

    return true;
  }

  if (message.action === "STOP_RECORDING") {
    // Flush pending typing events before returning the session.
    flushPendingInputs();
    isRecording = false;

    const events = [...recordedEvents];
    recordedEvents = [];

    chrome.storage.local.set({
      isRecording: false,
      recordedEvents: []
    });

    sendResponse({
      success: true,
      events
    });

    return true;
  }
});
