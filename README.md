# AEM SWIFT NAV - Chrome Extension

**AEM SWIFT NAV** is a productivity tool designed for Adobe Experience Manager (AEM) developers and content authors. It streamlines navigation between environments (QA, Stage, Prod), automates UI switching, and provides intelligent shortcuts for moving between sites, assets, and experience fragments.

## 🚀 Key Features

### 1. Environment Management
- **One-Click Login:** Instant access to QA, Staging, and Production environments.
- **Environment Switcher:** Instantly toggle the current page between **QA ↔ PROD** with a single click (`Alt+Q`).
- **Package Manager:** Direct links to the CRX Package Manager for all environments.

### 2. Intelligent Navigation
- **Public to Author ("One-Click"):** While on a live public site, clicking **Editor** automatically finds the internal AEM path via meta tags and opens it in the AEM Editor on the correct environment.
- **Smart XF Routing:** Automatically constructs the correct Experience Fragment path based on your current location:
  `/content/experience-fragments/{brand}/{type}/{region}/{affiliate}/{language}/site`
- **Context-Aware Forms:** Detects if you are editing an AEM Form and directs you to the correct editor path.

### 3. Productivity Tools
- **UI Toggler:** Seamlessly switch between **Classic UI** (`siteadmin`, `damadmin`) and **Touch UI** (`sites.html`, `assets.html`) without losing your place.
- **Deep Linking:** Jump directly to **Sites**, **DAM**, **Page Properties**, or **View as Published**.
- **Compact UI:** A clean, dark-mode interface designed to fit all shortcuts without scrolling.

---

## 🛠️ Installation

1. **Download the Source Code**
   Ensure you have the following files in a folder:
   - `manifest.json`
   - `popup.html`
   - `popup.js`
   - `background.js`
   - `contentScript.js`
   - Icon file (e.g., `aem-swift-nav-icon.png`)

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/` in your browser.

3. **Enable Developer Mode**
   - Toggle the switch in the top-right corner.

4. **Load Unpacked**
   - Click the **"Load unpacked"** button and select the folder containing your extension files.

---

## ⌨️ Keyboard Shortcuts

You can customize these shortcuts at `chrome://extensions/shortcuts`.

| Command | Default Key | Description |
| :--- | :--- | :--- |
| **Go to Sites** | `Alt+S` | Opens the current path in Sites Admin. |
| **Go to DAM** | `Alt+D` | Opens the corresponding DAM folder. |
| **Go to XF** | `Alt+X` | Smart navigation to the Experience Fragment site. |
| **Switch Env** | `Alt+Q` | Toggles the current page between QA and PROD IPs. |
| **Toggle UI** | *(Custom)* | Switches between Classic and Touch UI. |

---

## 📂 Project Structure

- **`manifest.json`**: Configuration file defining permissions, background scripts, and commands.
- **`popup.html`**: The compact user interface with a 3-column layout.
- **`popup.js`**: Handles button clicks in the popup.
- **`background.js`**: The core logic engine (URL parsing, path extraction, env switching).
- **`contentScript.js`**: Minimal script injected to assist with DOM operations.

---

## 🧩 Logic & Behavior

**Environment IP Mapping:**
- **QA:** `18.180.111.160`
- **Stage:** `54.144.15.212`
- **Prod:** `54.243.158.24`

**XF Path Logic:**
The extension strictly enforces a 5-level deep structure for Experience Fragments:
`.../experience-fragments/{brand}/{type}/{region}/{affiliate}/{language}/site`

**Classic ↔ Touch:**
Detects `siteadmin#` or `damadmin#` hashes to correctly convert Classic paths to Touch UI paths.

---

## 📝 Credits

**Created by:** Surender Nadar
