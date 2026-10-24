
let isRecording = false;
let recordedEvents = [];

function getElementDetails(target) {
  if (!(target instanceof Element)) {
    return {
      elementType: "unknown",
      elementName: "Unknown element",
      selector: null
    };
  }

  // If an icon or span inside a button is clicked, identify its parent control.
  const element = target.closest(
    'button, input, textarea, select, a, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="combobox"], [role="option"], [contenteditable="true"]'
  ) || target;

  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute("role");
  const inputType = tag === "input"
    ? (element.getAttribute("type") || "text").toLowerCase()
    : null;

  let elementType = tag;

  if (tag === "button" || role === "button") {
    elementType = "button";
  } else if (tag === "input") {
    elementType = inputType === "checkbox"
      ? "checkbox"
      : inputType === "radio"
        ? "radio button"
        : inputType === "submit" || inputType === "reset"
          ? "button"
          : inputType === "password"
            ? "password field"
            : inputType === "file"
              ? "file input"
              : "input field";
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
  } else if (role === "option") {
    elementType = "option";
  } else if (element.isContentEditable) {
    elementType = "editable field";
  }

  const getText = (value) =>
    typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

  // Prefer accessible labels over arbitrary page text.
  let elementName =
    getText(element.getAttribute("aria-label")) ||
    getText(element.getAttribute("aria-labelledby")
      ? element.ownerDocument.getElementById(
          element.getAttribute("aria-labelledby").split(/\s+/)[0]
        )?.innerText
      : "") ||
    getText(element.labels
      ? Array.from(element.labels).map(label => label.innerText).join(" ")
      : "") ||
    getText(element.getAttribute("placeholder")) ||
    getText(element.getAttribute("title")) ||
    getText(element.getAttribute("alt")) ||
    getText(element.innerText) ||
    getText(element.getAttribute("name")) ||
    getText(element.id);

  // Never expose values from sensitive fields.
  const isSensitive =
    inputType === "password" ||
    element.getAttribute("autocomplete") === "current-password" ||
    element.getAttribute("autocomplete") === "new-password" ||
    element.getAttribute("autocomplete") === "one-time-code" ||
    element.getAttribute("type") === "hidden" ||
    element.matches('[data-private], [data-sensitive]');

  if (isSensitive) {
    elementName =
      getText(element.getAttribute("aria-label")) ||
      getText(element.labels
        ? Array.from(element.labels).map(label => label.innerText).join(" ")
        : "") ||
      (inputType === "password" ? "Password field" : "Sensitive field");
  }

  if (!elementName) {
    elementName = `${elementType} element`;
  }

  return {
    elementType,
    elementName: elementName.slice(0, 100),
    selector: buildSelector(element),
    isSensitive
  };
}

function buildSelector(element) {
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  const tag = element.tagName.toLowerCase();
  const name = element.getAttribute("name");

  if (name) {
    return `${tag}[name="${CSS.escape(name)}"]`;
  }

  const testId =
    element.getAttribute("data-testid") ||
    element.getAttribute("data-test");

  if (testId) {
    const attribute = element.hasAttribute("data-testid")
      ? "data-testid"
      : "data-test";

    return `${tag}[${attribute}="${CSS.escape(testId)}"]`;
  }

  // Build a short path using tag names and sibling positions.
  const parts = [];
  let current = element;

  while (
    current &&
    current instanceof Element &&
    parts.length < 4
  ) {
    let part = current.tagName.toLowerCase();

    if (current.parentElement) {
      const sameTagSiblings = Array.from(
        current.parentElement.children
      ).filter(child => child.tagName === current.tagName);

      if (sameTagSiblings.length > 1) {
        part += `:nth-of-type(${
          sameTagSiblings.indexOf(current) + 1
        })`;
      }
    }

    parts.unshift(part);

    if (current.id) {
      parts[0] = `#${CSS.escape(current.id)}`;
      break;
    }

    current = current.parentElement;
  }

  return parts.join(" > ");
}

function addEvent(action, target, extra = {}) {
  if (!isRecording) return;

  const details = getElementDetails(target);

  recordedEvents.push({
    action,
    elementType: details.elementType,
    elementName: details.elementName,
    selector: details.selector,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    ...extra
  });

  // Keep the extension popup informed of the current event count.
  chrome.storage.local.set({
    isRecording: true,
    recordedEvents
  });
}

function handleClick(event) {
  if (!isRecording) return;

  const details = getElementDetails(event.target);

  addEvent(
    details.elementType === "link" ? "click_link" : "click",
    event.target
  );
}

function handleInput(event) {
  if (!isRecording) return;

  const target = event.target;

  if (!(target instanceof Element)) return;

  const details = getElementDetails(target);

  // Do not capture the values typed into fields.
  if (
    details.isSensitive ||
    target.matches('input[type="password"], input[type="hidden"]')
  ) {
    addEvent("interact_sensitive_field", target);
    return;
  }

  addEvent("input", target);
}

function handleChange(event) {
  if (!isRecording) return;

  const target = event.target;

  if (!(target instanceof Element)) return;

  const details = getElementDetails(target);

  if (details.isSensitive) {
    addEvent("change_sensitive_field", target);
    return;
  }

  const extra = {};

  // Capture safe, useful state for checkboxes and radio buttons.
  if (
    target.matches('input[type="checkbox"], input[type="radio"]') ||
    target.getAttribute("role") === "checkbox" ||
    target.getAttribute("role") === "radio"
  ) {
    extra.checked = target.matches('input[type="checkbox"], input[type="radio"]')
      ? target.checked
      : target.getAttribute("aria-checked");
  }

  // Record that a selection changed, but not the user's entered text.
  addEvent("change", target, extra);
}

function handleNavigation() {
  if (!isRecording) return;

  recordedEvents.push({
    action: "navigation",
    elementType: "page",
    elementName: document.title || "Page",
    selector: null,
    url: window.location.href,
    timestamp: new Date().toISOString()
  });

  chrome.storage.local.set({
    isRecording: true,
    recordedEvents
  });
}

document.addEventListener("click", handleClick, true);
document.addEventListener("input", handleInput, true);
document.addEventListener("change", handleChange, true);

// Listen for commands from popup.js.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "START_RECORDING") {
    recordedEvents = [];
    isRecording = true;

    recordedEvents.push({
      action: "recording_started",
      elementType: "page",
      elementName: document.title || "Page",
      selector: null,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });

    chrome.storage.local.set({
      isRecording: true,
      recordedEvents
    });

    sendResponse({
      success: true,
      eventCount: recordedEvents.length
    });

    return true;
  }

  if (message.action === "STOP_RECORDING") {
    isRecording = false;

    const events = [...recordedEvents];

    chrome.storage.local.set({
      isRecording: false,
      recordedEvents: []
    });

    recordedEvents = [];

    sendResponse({
      success: true,
      events
    });

    return true;
  }
});
