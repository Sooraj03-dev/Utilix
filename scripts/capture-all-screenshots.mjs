import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const BASE_URL = "http://127.0.0.1:3000";
const OUTPUT_DIR = path.resolve(process.cwd(), "docs", "screenshots");

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function makeMockToken(uid) {
  const payload = {
    uid,
    exp: Date.now() + 8 * 3600 * 1000,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

const PAGES = [
  {
    name: "01_login_portal.png",
    url: `${BASE_URL}/login`,
    user: null,
    waitMs: 1200,
  },
  {
    name: "02_student_dashboard.png",
    url: `${BASE_URL}/dashboard`,
    user: "student-01",
    waitMs: 1500,
  },
  {
    name: "03_resource_catalog.png",
    url: `${BASE_URL}/resources`,
    user: "student-01",
    waitMs: 2000, // allow debounce and api fetch
  },
  {
    name: "04_fairness_governance.png",
    url: `${BASE_URL}/rules`,
    user: "student-01",
    waitMs: 1200,
  },
  {
    name: "05_requests_lifecycle.png",
    url: `${BASE_URL}/requests`,
    user: "student-01",
    waitMs: 2000,
  },
  {
    name: "06_waitlist_conflicts.png",
    url: `${BASE_URL}/conflicts`,
    user: "student-01",
    waitMs: 2000,
  },
  {
    name: "07_returns_desk.png",
    url: `${BASE_URL}/returns`,
    user: "coordinator-01",
    waitMs: 1500,
  },
  {
    name: "08_approvals_desk.png",
    url: `${BASE_URL}/approvals`,
    user: "coordinator-01",
    waitMs: 2000,
  },
  {
    name: "09_coordinator_dashboard.png",
    url: `${BASE_URL}/dashboard/coordinator`,
    user: "coordinator-01",
    waitMs: 1500,
  },
  {
    name: "10_admin_governance.png",
    url: `${BASE_URL}/dashboard/admin`,
    user: "admin-01",
    waitMs: 1500,
  },
  {
    name: "11_profile_onboarding.png",
    url: `${BASE_URL}/complete-profile`,
    user: null,
    waitMs: 1200,
  },
];

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(ws) {
    this.ws = ws;
    this.id = 1;
    this.callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        } else {
          resolve(msg.result);
        }
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function run() {
  console.log("Launching Headless Chrome on port", PORT);
  const tempProfileDir = path.resolve(process.cwd(), "scratch", "chrome-profile");
  if (!fs.existsSync(tempProfileDir)) {
    fs.mkdirSync(tempProfileDir, { recursive: true });
  }

  const chromeProc = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${tempProfileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-translate",
    "--window-size=1440,900",
  ]);

  chromeProc.on("error", (err) => {
    console.error("Chrome spawn error:", err);
  });

  // Wait for Chrome to open debugging port
  let versionData = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) {
        versionData = await res.json();
        break;
      }
    } catch {}
    await sleep(200);
  }

  if (!versionData) {
    chromeProc.kill();
    throw new Error("Failed to connect to Chrome debugging port");
  }

  console.log("Connected to Chrome:", versionData.Browser);

  // Create a new target / tab
  const newTabRes = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" });
  const tabData = await newTabRes.json();
  const wsUrl = tabData.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const cdp = new CDPClient(ws);

  await cdp.send("Page.enable");
  await cdp.send("Network.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1366,
    height: 850,
    deviceScaleFactor: 2, // 2x crisp HiDPI
    mobile: false,
  });

  for (const page of PAGES) {
    console.log(`\nCapturing [${page.name}] from ${page.url}...`);

    // Manage cookies
    await cdp.send("Network.clearBrowserCookies");
    if (page.user) {
      const token = makeMockToken(page.user);
      await cdp.send("Network.setCookie", {
        name: "utilix_mock_session",
        value: token,
        url: "http://127.0.0.1:3000",
        path: "/",
      });
      await cdp.send("Network.setExtraHTTPHeaders", {
        headers: {
          Cookie: `utilix_mock_session=${token}`,
        },
      });
    } else {
      await cdp.send("Network.setExtraHTTPHeaders", { headers: {} });
    }

    // Navigate and await load event
    const loadPromise = new Promise((resolve) => {
      const handler = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.method === "Page.loadEventFired") {
          ws.removeEventListener("message", handler);
          resolve();
        }
      };
      ws.addEventListener("message", handler);
    });

    await cdp.send("Page.navigate", { url: page.url });
    await loadPromise;

    // Additional settling time
    await sleep(page.waitMs);

    // Wait until loading spinners and skeleton pulses disappear
    for (let attempt = 0; attempt < 25; attempt++) {
      try {
        const evalRes = await cdp.send("Runtime.evaluate", {
          expression: `
            Boolean(
              document.querySelector('.animate-spin, .animate-pulse') ||
              (document.body && document.body.innerText.includes('Loading…')) ||
              (document.body && document.body.innerText.includes('Loading resources…'))
            )
          `,
          returnByValue: true,
        });
        if (!evalRes.result?.value) {
          break;
        }
      } catch {}
      await sleep(400);
    }

    // Small micro-settle for any entrance transitions
    await sleep(400);

    // Capture screenshot
    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });

    const filePath = path.join(OUTPUT_DIR, page.name);
    fs.writeFileSync(filePath, Buffer.from(shot.data, "base64"));
    console.log(`Saved: ${filePath} (${Math.round(shot.data.length * 0.75 / 1024)} KB)`);
  }

  console.log("\nAll screenshots captured successfully!");
  ws.close();
  chromeProc.kill();
}

run().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});
