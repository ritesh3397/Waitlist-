import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const SUBMISSIONS_FILE = path.join(process.cwd(), "submissions.json");
const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

// Define structure
interface Submission {
  id: string;
  timestamp: string;
  name: string;
  email: string;
  businessName: string;
  website: string;
  method: string;
  challenge: string;
  synced: boolean;
}

interface Settings {
  spreadsheetId: string;
  sheetUrl: string;
  lastSyncedAt: string;
  accessToken: string;
}

// Ensure database files exist
const loadSubmissions = (): Submission[] => {
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify([], null, 2));
    return [];
  }
  try {
    const data = fs.readFileSync(SUBMISSIONS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading submissions:", err);
    return [];
  }
};

const saveSubmissions = (subs: Submission[]) => {
  fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(subs, null, 2));
};

const loadSettings = (): Settings => {
  const defaultSettings: Settings = {
    spreadsheetId: "",
    sheetUrl: "",
    lastSyncedAt: "",
    accessToken: "",
  };
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
    return { ...defaultSettings, ...JSON.parse(data) };
  } catch (err) {
    console.error("Error reading settings:", err);
    return defaultSettings;
  }
};

const saveSettings = (sets: Settings) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(sets, null, 2));
};

// Push to Google Sheets helper
async function appendToGoogleSheets(
  spreadsheetId: string,
  accessToken: string,
  rows: any[][]
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:G:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: "A:G",
          majorDimension: "ROWS",
          values: rows,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Google Sheets Appending failed:", errText);
      let errMsg = errText;
      try {
        const parsed = JSON.parse(errText);
        if (parsed.error && parsed.error.message) {
          errMsg = parsed.error.message;
        }
      } catch (parseErr) {
        // use raw errText if not JSON
      }
      return { success: false, error: errMsg };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Google Sheets append API error:", error);
    return { success: false, error: error?.message || "Network error communicating with Google APIs" };
  }
}

// API Routes

// 1. Submit to waitlist
app.post("/api/waitlist/submit", async (req, res) => {
  try {
    const { name, email, businessName, website, method, challenge } = req.body;

    if (!name || !email || !method) {
      res.status(400).json({ error: "Missing required fields (Name, Email, or Method)" });
      return;
    }

    const submissions = loadSubmissions();

    // Check for duplicates
    const isDuplicate = submissions.some(
      (sub) => sub.email.trim().toLowerCase() === email.trim().toLowerCase()
    );
    if (isDuplicate) {
      res.status(409).json({ error: "This email is already registered on the waitlist." });
      return;
    }

    const timestamp = new Date().toISOString();
    const newSubmission: Submission = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp,
      name: name.trim(),
      email: email.trim(),
      businessName: (businessName || "").trim(),
      website: (website || "").trim(),
      method,
      challenge: (challenge || "").trim(),
      synced: false,
    };

    // Save to server local JSON database immediately
    submissions.push(newSubmission);
    saveSubmissions(submissions);

    // Try background sync with Google Sheet if configured and active token exists
    const settings = loadSettings();
    let autoSynced = false;

    if (settings.spreadsheetId && settings.accessToken) {
      const row = [
        newSubmission.timestamp,
        newSubmission.name,
        newSubmission.email,
        newSubmission.businessName,
        newSubmission.website,
        newSubmission.method,
        newSubmission.challenge,
      ];
      const appendResult = await appendToGoogleSheets(
        settings.spreadsheetId,
        settings.accessToken,
        [row]
      );
      if (appendResult.success) {
        newSubmission.synced = true;
        autoSynced = true;
        // save again with synced: true
        saveSubmissions(submissions);
      }
    }

    res.status(201).json({
      success: true,
      message: "You're on the list. We'll invite early users soon.",
      autoSynced,
    });
  } catch (error) {
    console.error("Error submitting waitlist:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 2. Get list of submissions (Admin only)
app.get("/api/admin/submissions", (req, res) => {
  try {
    const submissions = loadSubmissions();
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Failed to load submissions" });
  }
});

// 3. Clear submissions/Delete (with protection)
app.post("/api/admin/clear-submissions", (req, res) => {
  try {
    const { confirm } = req.body;
    if (confirm !== "YES_DELETE_ALL") {
      res.status(400).json({ error: "Delete not confirmed custom string" });
      return;
    }
    saveSubmissions([]);
    res.json({ success: true, message: "All submissions deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete submissions" });
  }
});

// 4. Get integration settings
app.get("/api/admin/settings", (req, res) => {
  try {
    const settings = loadSettings();
    // Return settings except the raw token, maybe return a masked or indicator
    res.json({
      spreadsheetId: settings.spreadsheetId,
      sheetUrl: settings.sheetUrl,
      lastSyncedAt: settings.lastSyncedAt,
      hasToken: !!settings.accessToken,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to load settings" });
  }
});

// 5. Update settings
app.post("/api/admin/settings", (req, res) => {
  try {
    const { spreadsheetId, sheetUrl } = req.body;
    const settings = loadSettings();
    settings.spreadsheetId = spreadsheetId || "";
    settings.sheetUrl = sheetUrl || "";
    saveSettings(settings);
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// 6. Save Google integration token
app.post("/api/admin/save-token", (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      res.status(400).json({ error: "Missing access token" });
      return;
    }
    const settings = loadSettings();
    settings.accessToken = accessToken;
    saveSettings(settings);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save integration token" });
  }
});

// 7. Sync all pending entries to Google Sheets
app.post("/api/admin/sync", async (req, res) => {
  try {
    const { accessToken: clientToken, forceAll } = req.body;
    const settings = loadSettings();
    const activeToken = clientToken || settings.accessToken;

    if (!activeToken) {
      res.status(401).json({ 
        error: "A valid Google Access Token is required to sync. Please authenticate by clicking 'Connect Google'." 
      });
      return;
    }

    if (!settings.spreadsheetId) {
      res.status(400).json({ 
        error: "No Google Spreadsheet ID is currently active. Please connect a spreadsheet first." 
      });
      return;
    }

    // Capture the active token in the server so background works
    if (clientToken) {
      settings.accessToken = clientToken;
    }

    const submissions = loadSubmissions();
    const unsyncedSet = forceAll ? submissions : submissions.filter((sub) => !sub.synced);

    console.log(`[Sync Diagnostics] Active Spreadsheet ID: "${settings.spreadsheetId}"`);
    console.log(`[Sync Diagnostics] Force sync all elements: ${!!forceAll}. Pending sync count: ${unsyncedSet.length}`);

    if (unsyncedSet.length === 0) {
      res.json({ 
        success: true, 
        message: "Already up to date. No new entries to sync.", 
        msg: "Already up to date. No new entries to sync.",
        count: 0,
        spreadsheetId: settings.spreadsheetId,
        lastSyncedAt: settings.lastSyncedAt,
        googleResponse: "OK_NO_OP_ALREADY_SYNCED"
      });
      return;
    }

    const rows = unsyncedSet.map((sub) => [
      sub.timestamp,
      sub.name,
      sub.email,
      sub.businessName,
      sub.website,
      sub.method,
      sub.challenge,
    ]);

    const appendResult = await appendToGoogleSheets(
      settings.spreadsheetId,
      activeToken,
      rows
    );

    if (!appendResult.success) {
      console.error(`[Sync Diagnostics] Google Sheets API append failed for target: ${settings.spreadsheetId} with error:`, appendResult.error);
      res.status(502).json({ 
        error: `Google Sheets API append failed: ${appendResult.error || "Please verify your permission levels and sheet URL."}`,
        spreadsheetId: settings.spreadsheetId,
        googleResponse: appendResult.error || "UNKNOWN_ERROR_RESPONSE"
      });
      return;
    }

    // Mark as completed
    if (forceAll) {
      submissions.forEach((sub) => {
        sub.synced = true;
      });
    } else {
      unsyncedSet.forEach((sub) => {
        sub.synced = true;
      });
    }

    settings.lastSyncedAt = new Date().toISOString();
    saveSettings(settings);
    saveSubmissions(submissions);

    console.log(`[Sync Diagnostics] Successfully synced ${unsyncedSet.length} rows to spreadsheet ID ${settings.spreadsheetId}`);

    res.json({
      success: true,
      message: `Successfully synced ${unsyncedSet.length} entries to Google Sheets!`,
      count: unsyncedSet.length,
      lastSyncedAt: settings.lastSyncedAt,
      spreadsheetId: settings.spreadsheetId,
      googleResponse: "APPEND_SUCCESS_200_OK"
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ error: `Internal server error during sync: ${error?.message || error}` });
  }
});

// Serve frontend with Vite middleware in development
const isProd = process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), "dist"));

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
