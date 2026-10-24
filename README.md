# BugSnap Beta 🐞

**Turn browser interactions into structured bug reports.**

BugSnap is a Chrome extension designed to help testers and developers record browser interactions and generate structured bug reports that are easier to understand, reproduce, and share.

> ⚠️ **Beta Notice:** BugSnap is currently in beta. Some features may not work reliably in every browsing session. Feedback and bug reports are welcome.

## ✨ Features

- **Record browser interactions** — Capture supported user actions while testing a website.
- **Generate bug reports** — Turn recorded actions into structured reproduction steps.
- **Readable reports** — Avoid unnecessary raw HTML in the generated report.
- **Copy Markdown** — Copy report content into tools such as Taiga, Jira, GitHub Issues, or other Markdown-compatible platforms.
- **Shareable reports** — Generate report links through the BugSnap backend.
- **Simple workflow** — Start recording, interact with a website, stop recording, and review the report.

*Features may have limitations during beta testing.*

## 🧰 Requirements

- Google Chrome or a compatible Chromium-based browser.
- An internet connection to access the deployed BugSnap backend and share reports.
- The BugSnap extension ZIP downloaded from the official project release.

## 📥 Installation Guide

Because BugSnap is not currently distributed through the Chrome Web Store, it must be installed manually.

### Step 1: Download BugSnap

Download the latest beta ZIP from the project's Releases page:

**[Download BugSnap Beta](https://github.com/rony-codes/BugSnap/releases)**

Download the ZIP asset attached to the latest release.

### Step 2: Extract the ZIP

1. Locate the downloaded ZIP file.
2. Right-click it and select **Extract All**.
3. Choose a convenient location, such as your Desktop.
4. Open the extracted folder.

Make sure `manifest.json` is directly inside the folder you will select in Chrome.

### Step 3: Open Chrome Extensions

Open Google Chrome and visit:

`chrome://extensions`

### Step 4: Enable Developer Mode

Enable the **Developer mode** toggle, usually located in the top-right corner of the Extensions page.

### Step 5: Load BugSnap

1. Click **Load unpacked**.
2. Select the extracted BugSnap extension folder containing `manifest.json`.
3. Confirm that BugSnap appears in your extensions list.

### Step 6: Pin BugSnap

1. Click the Extensions puzzle-piece icon in Chrome.
2. Find BugSnap.
3. Click the pin icon to keep it accessible in the toolbar.

**Installation complete!**

## 🚀 How to Use BugSnap

1. Open the website you want to test.
2. Open BugSnap from the Chrome toolbar.
3. Start recording.
4. Perform the actions you want to document, such as clicking buttons, entering text, or navigating a page.
5. Stop recording.
6. Open the generated report.
7. Review the captured steps for accuracy.
8. Copy the Markdown report and paste it into your issue tracker.

### Example workflow

```text
Open website
    ↓
Start recording
    ↓
Perform test actions
    ↓
Stop recording
    ↓
Review generated report
    ↓
Copy Markdown into issue tracker
```

## 🐛 Known Issues

BugSnap is under active development. Current beta testing has identified the following issues:

- Recording may fail when a website is opened for the first time.
- Refreshing the website may be required before recording works.
- Some initial actions may not be captured immediately.
- Extension-to-page communication may occasionally fail.

If you encounter these issues, please report them with the steps you followed and the browser details.

Refreshing the page may serve as a temporary workaround, but it is not considered a permanent fix.

## 🔒 Privacy and Data Handling

BugSnap records browser interactions to help generate reproduction steps. Before using it, please consider the following:

- Do not intentionally enter passwords, OTPs, payment details, or other sensitive information while recording.
- Review generated reports before sharing them.
- Share report links only with people who should have access to the report.
- Recorded sessions may be sent to the configured BugSnap backend for report generation and retrieval.

The extension and backend should be reviewed for sensitive-data handling and access controls before using BugSnap with confidential or production information.

## 💬 Feedback and Bug Reports

Found a bug or have an idea for improvement?

Open an issue in the BugSnap GitHub repository:

**[Report an Issue](https://github.com/rony-codes/BugSnap/issues)**

When reporting an issue, include:

- A short description of the problem.
- Steps to reproduce it.
- Expected behavior.
- Actual behavior.
- Browser and operating system details.
- Screenshots or console errors, where relevant.

Please remove passwords, tokens, personal information, and other sensitive data before submitting a report.

## 🗺️ Roadmap

Planned areas for improvement include:

- Improving recording reliability on the first page load.
- Preventing the loss of initial user actions.
- Improving the clarity of generated reproduction steps.
- Improving sensitive-data protection.
- Refining the report and extension interfaces.
- Making beta installation and feedback easier.

## 🛠️ Development

BugSnap consists of a Chrome extension and a backend service.

The extension includes files such as:

- `manifest.json` — Extension configuration.
- `background.js` — Background extension logic.
- `content.js` — Browser-page interaction capture.
- `popup.html` — Extension popup interface.
- `popup.js` — Popup behavior.

The backend is maintained separately in the `server/` directory.

For local backend development, consult the backend configuration and dependencies before starting the server. Do not commit `.env` files, database credentials, or other secrets.

## 📄 License
## Copyright and Usage

Copyright © 2026 Rohan Kumar. All rights reserved.

BugSnap and its original source code are proprietary. No license is granted to copy, modify, redistribute, or commercially use this code except where explicitly authorized in writing by the copyright holder.

Third-party dependencies and assets remain subject to their respective licenses.

This notice is informational and is not a substitute for a formal legal agreement.

---

**BugSnap Beta** — Make bug reporting easier, one interaction at a time. 🐞
