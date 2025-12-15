// AEM SWIFT NAV - Background Service Worker

const ENVIRONMENT_CONFIG = {
  qa: {
    ip: "https://18.180.111.160",
    patterns: ["18.180.111.160", "qa.", "qa-"],
  },
  stg: {
    ip: "https://54.144.15.212",
    patterns: ["54.144.15.212", "stg.", "stage"],
  },
  prod: {
    ip: "https://54.243.158.24",
    patterns: ["54.243.158.24", "www.", "preview."],
  },
};

const PATH_CONFIG = {
  touch: {
    xf: "/aem/experience-fragments.html",
    dam: "/assets.html",
    sites: "/sites.html",
    editor: "/editor.html",
    props: "/mnt/overlay/wcm/core/content/sites/properties.html",
    forms: "/aem/forms.html/content/dam/formsanddocuments",
  },
  classic: {
    xf: "/siteadmin#/content/experience-fragments",
    dam: "/damadmin#/content/dam",
    sites: "/siteadmin#/content",
    editor: "?wcmmode=classic",
  },
};

// --- Helper Functions ---

function getTargetEnvIP(url) {
  const hostname = new URL(url).hostname;
  if (hostname.includes("qa") || hostname.includes("18.180")) {
    return ENVIRONMENT_CONFIG.qa.ip;
  }
  if (hostname.includes("stg") || hostname.includes("54.144")) {
    return ENVIRONMENT_CONFIG.stg.ip;
  }
  return ENVIRONMENT_CONFIG.prod.ip;
}

function extractContentPath(url) {
  const path = url.pathname;
  if (path.includes("/content/")) {
    const patterns = [
      // Case 1: Already inside editor/admin (captures /content/...)
      /^\/(editor|sites|siteadmin|damadmin|assets|aem\/experience-fragments|aem\/forms)\.html(\/content\/.*)/,
      // Case 2: Published page (captures content/...)
      /^\/(content\/.*)/,
    ];
    for (const pattern of patterns) {
      const match = path.match(pattern);
      if (match) {
        let extracted = match[2] || match[1];
        if (extracted) {
             // 1. Strip extension (.html)
             extracted = extracted.replace(/\.html$/, "");
             // 2. Ensure path ALWAYS starts with /
             if (!extracted.startsWith("/")) {
                 extracted = "/" + extracted;
             }
             return extracted;
        }
      }
    }
  }
  return null;
}

function openInNextTab(url, currentTab) {
  chrome.tabs.create({ url: url, index: currentTab.index + 1 });
}

function fetchMetaPath() {
  const meta = document.querySelector('meta[property="og:image"]');
  if (meta && meta.content) {
    try {
        const urlObj = new URL(meta.content, window.location.origin);
        let path = urlObj.pathname;
        if(path.includes("/content/")) {
            if (path.includes(".thumb")) {
                path = path.split(".thumb")[0];
            } else if (path.includes(".")) {
                path = path.substring(0, path.lastIndexOf("."));
            }
            if (!path.startsWith("/")) {
                path = "/" + path;
            }
            return path;
        }
    } catch (e) {
        return null;
    }
  }
  return null;
}

// --- Core Logic ---

async function navigate(target, tab) {
  const currentUrl = new URL(tab.url);
  const origin = currentUrl.origin;
  
  // FIX: Declare newUrl at the top scope to avoid redeclaration errors
  let newUrl = "";
  let contentPath = extractContentPath(currentUrl);
  
  // 1. One-Click Feature for Public Sites
  if (!contentPath && target === "editor") {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: fetchMetaPath,
        });
        if (results && results[0] && results[0].result) {
            contentPath = results[0].result;
            const targetIP = getTargetEnvIP(tab.url);
            newUrl = `${targetIP}${PATH_CONFIG.touch.editor}${contentPath}.html`;
            openInNextTab(newUrl, tab);
            return;
        }
    } catch (err) {
        console.error("Meta extraction failed:", err);
    }
  }

  // 2. Handle Forms (Converted to await to fix variable scope error)
  if (target === "forms") {
    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.querySelector(".guideContainerNode")?.dataset.repositoryPath || null,
        });
        
        const formPath = results[0]?.result; // Added safe access ?.
        const targetIP = origin.includes("http") ? origin : ENVIRONMENT_CONFIG.prod.ip;
        
        // No 'const' here, we update the main newUrl variable
        newUrl = formPath
          ? `${targetIP}${PATH_CONFIG.touch.editor}${formPath}.html`
          : `${targetIP}${PATH_CONFIG.touch.forms}`;
          
        openInNextTab(newUrl, tab);
        return;
    } catch (err) {
        console.error("Forms extraction failed:", err);
        return;
    }
  }

  // 3. Standard AEM Path Logic
  if (!contentPath && !["published", "props"].includes(target)) {
    alert("Could not determine AEM content path.");
    return;
  }

  const pathWithoutPage = contentPath
    ? contentPath.substring(0, contentPath.lastIndexOf("/"))
    : "";
  
  const projectPath = pathWithoutPage.replace("/content/", "");
  
  const baseOrigin = (origin.includes("/content") || origin.includes("18.180") || origin.includes("54.")) 
                     ? origin 
                     : ENVIRONMENT_CONFIG.prod.ip;

  switch (target) {
    case "sites":
      newUrl = `${baseOrigin}${PATH_CONFIG.touch.sites}${pathWithoutPage}`;
      break;
    case "dam":
      newUrl = `${baseOrigin}${PATH_CONFIG.touch.dam}/content/dam/${projectPath.split('/')[0]}`;
      break;
    case "xf":
      if (contentPath) {
          const parts = contentPath.split("/"); 
          // parts indices: 0="", 1="content", 2="brand"
          let xfRootParts = [];
          
          if (parts[2] === "experience-fragments" && parts.length >= 8) {
              xfRootParts = parts.slice(0, 8);
              newUrl = `${baseOrigin}${PATH_CONFIG.touch.xf}${xfRootParts.join("/")}/site`;
          } else if (parts[2] !== "experience-fragments" && parts.length >= 7) {
              const brand = parts[2];
              const type = parts[3];
              const region = parts[4];
              const affiliate = parts[5];
              const lang = parts[6];
              newUrl = `${baseOrigin}${PATH_CONFIG.touch.xf}/content/experience-fragments/${brand}/${type}/${region}/${affiliate}/${lang}/site`;
          } else {
             const project = parts[2] === "experience-fragments" ? parts[3] : parts[2];
             newUrl = `${baseOrigin}${PATH_CONFIG.touch.xf}/content/experience-fragments/${project}`;
          }
      }
      break;
    case "editor":
      newUrl = `${baseOrigin}${PATH_CONFIG.touch.editor}${contentPath}.html`;
      break;
    case "props":
      newUrl = `${baseOrigin}${PATH_CONFIG.touch.props}?item=${contentPath}`;
      break;
    case "published":
      newUrl = `${baseOrigin}${contentPath}.html?wcmmode=disabled`;
      break;
  }

  if (newUrl) openInNextTab(newUrl, tab);
}

function toggleUi(tab) {
  const currentUrl = new URL(tab.url);
  const origin = currentUrl.origin;
  const path = currentUrl.pathname;
  const hash = currentUrl.hash;
  let newUrl = "";

  if (path.includes("siteadmin")) {
    const cleanPath = hash.replace("#", "");
    newUrl = `${origin}${PATH_CONFIG.touch.sites}${cleanPath}`;
  } else if (path.includes("damadmin")) {
    const cleanPath = hash.replace("#", "");
    newUrl = `${origin}${PATH_CONFIG.touch.dam}${cleanPath}`;
  } else {
    const contentPath = extractContentPath(currentUrl) || "/";
    const contentPathClean = contentPath.replace(".html", "");

    if (path.startsWith("/sites.html"))
      newUrl = `${origin}${PATH_CONFIG.classic.sites}${contentPathClean.replace("/content", "")}`;
    else if (path.startsWith("/assets.html"))
      newUrl = `${origin}${PATH_CONFIG.classic.dam}${contentPathClean.replace("/content/dam", "")}`;
    else if (path.startsWith("/aem/experience-fragments.html"))
      newUrl = `${origin}${PATH_CONFIG.classic.xf}${contentPathClean.replace("/content/experience-fragments", "")}`;
    else if (path.startsWith("/editor.html"))
      newUrl = `${origin}${contentPathClean}.html?wcmmode=classic`;
    else
      alert("UI Toggle is only available in Sites, DAM, XF, or Editor view.");
  }

  if (newUrl) openInNextTab(newUrl, tab);
}

function switchEnvironment(tab) {
  const currentUrl = new URL(tab.url);
  const currentEnv = Object.keys(ENVIRONMENT_CONFIG).find((env) =>
    ENVIRONMENT_CONFIG[env].patterns.some((p) =>
      currentUrl.hostname.includes(p)
    )
  );

  if (!currentEnv) {
    alert("AEM environment not detected.");
    return;
  }

  let targetEnv = "qa"; 
  if (currentEnv === "qa") {
    targetEnv = "prod";
  } else if (currentEnv === "prod") {
    targetEnv = "qa";
  } 
  
  const targetIP = ENVIRONMENT_CONFIG[targetEnv].ip;
  const newUrl = currentUrl.href.replace(currentUrl.origin, targetIP);
  openInNextTab(newUrl, tab);
}

// --- Listeners ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "triggerCommand") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      executeCommand(request.commandName, tabs[0]);
    });
  }
});

chrome.commands.onCommand.addListener((command, tab) => {
    chrome.storage.local.get(["extensionEnabled"], (result) => {
      if (result.extensionEnabled !== false) {
        executeCommand(command, tab);
      }
    });
});

function executeCommand(commandName, tab) {
    const commands = {
        "go-to-xf": () => navigate("xf", tab),
        "go-to-dam": () => navigate("dam", tab),
        "go-to-sites": () => navigate("sites", tab),
        "go-to-forms": () => navigate("forms", tab),
        "go-to-page-properties": () => navigate("props", tab),
        "view-as-published": () => navigate("published", tab),
        "go-to-editor": () => navigate("editor", tab),
        "toggle-ui": () => toggleUi(tab),
        "switch-environment": () => switchEnvironment(tab),
      };
      if (commands[commandName]) commands[commandName]();
}
