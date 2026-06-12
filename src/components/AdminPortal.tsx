import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileSpreadsheet,
  Link2,
  RefreshCw,
  Search,
  Filter,
  Download,
  Trash2,
  CheckCircle,
  XCircle,
  Database,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Clipboard,
  Check,
  CircleAlert
} from "lucide-react";
import { Submission, Settings as SettingsType } from "../types";
import { googleSignIn } from "../lib/firebase";

export default function AdminPortal() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<SettingsType>({
    spreadsheetId: "",
    sheetUrl: "",
    lastSyncedAt: "",
    hasToken: false,
  });

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");
  const [syncFilter, setSyncFilter] = useState("all");

  // Custom configuration inputs
  const [clientIdInput, setClientIdInput] = useState(() => {
    return localStorage.getItem("google_client_id") || "";
  });
  const [manualSheetId, setManualSheetId] = useState("");
  const [copiedId, setCopiedId] = useState(false);

  // Diagnostics and reporting states
  const [diagnosticReport, setDiagnosticReport] = useState<{
    lastCheckedId: string | null;
    googleApiResponse: any;
    wasParsedFromUrl: boolean;
  }>({
    lastCheckedId: null,
    googleApiResponse: null,
    wasParsedFromUrl: false,
  });

  // Security prompt for destructive actions
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const fetchSubmissions = async () => {
    try {
      const response = await fetch("/api/admin/submissions");
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (err) {
      console.error("Error loading submissions:", err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/admin/settings");
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  useEffect(() => {
    fetchSubmissions();
    fetchSettings();

    // Comprehensive handling of Google OAuth callback redirect parameters (both fragments and queries)
    const hash = window.location.hash;
    const search = window.location.search;

    console.log("Checking OAuth callback parameters - Hash:", hash, "Search:", search);

    // 1. Success path: checking the hash segment
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        // Cache the token in session storage for the client-side sheet actions
        sessionStorage.setItem("google_access_token", token);
        saveOAuthToken(token);
      }
    }

    // 2. Error in Hash path
    if (hash && hash.includes("error")) {
      const params = new URLSearchParams(hash.substring(1));
      const errType = params.get("error");
      const errDesc = params.get("error_description");
      console.error("Google OAuth received error in hash:", errType, errDesc);
      setError(`Google OAuth Error: ${errType}${errDesc ? ` - ${errDesc}` : ""} (Fragment Parameter)`);
      window.history.replaceState(null, "", window.location.pathname);
    }

    // 3. Error in Query path
    if (search && search.includes("error")) {
      const params = new URLSearchParams(search);
      const errType = params.get("error");
      const errDesc = params.get("error_description");
      console.error("Google OAuth received error in query:", errType, errDesc);
      setError(`Google OAuth Error: ${errType}${errDesc ? ` - ${errDesc}` : ""} (Query Parameter)`);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const handleConnectGoogleAutomatic = async () => {
    setAuthLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await googleSignIn();
      if (result) {
        // Cache accessToken locally and store on server settings
        sessionStorage.setItem("google_access_token", result.accessToken);
        await saveOAuthToken(result.accessToken);
      }
    } catch (err: any) {
      console.error("Google automatic popup auth failed:", err);
      setError(`Google Authentication Popup failed: ${err?.message || err}`);
    } finally {
      setAuthLoading(false);
    }
  };

  const saveOAuthToken = async (token: string) => {
    setAuthLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/save-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });

      if (response.ok) {
        setSuccessMsg("Google Sheets account authorized successfully!");
        fetchSettings();
        // Clear url hash representation
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        setError("Failed to register access token on the server.");
      }
    } catch (err) {
      setError("Failed to communicate authorization with the server.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Trigger Implicit Google OAuth Flow
  const handleConnectGoogle = () => {
    if (!clientIdInput.trim()) {
      setError("Please input a valid Google OAuth Client ID to complete authentication.");
      const element = document.getElementById("client-id-input");
      if (element) element.focus();
      return;
    }

    // Save Client ID in browser cache
    localStorage.setItem("google_client_id", clientIdInput.trim());

    setError(null);
    const scope = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";
    const redirectUri = window.location.origin;

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: clientIdInput.trim(),
      redirect_uri: redirectUri,
      response_type: "token",
      scope: scope,
      include_granted_scopes: "true",
      state: "wallovo-oauth"
    }).toString();

    // Redirect to Google Consent View
    window.location.href = authUrl;
  };

  // Save manual sheet connection details
  const handleSaveSheetSettings = async (sheetId: string) => {
    let cleanId = sheetId.trim();
    let wasParsed = false;

    // Fast robust parsing of any google doc/spreadsheet URL patterns
    if (cleanId.includes("/d/") || cleanId.includes("spreadsheets") || cleanId.includes("google.com")) {
      const matches = cleanId.match(/\/d\/([a-zA-Z0-9-_]{20,})/);
      if (matches && matches[1]) {
        cleanId = matches[1];
        wasParsed = true;
      } else {
        const fallbackMatches = cleanId.match(/([a-zA-Z0-9-_]{25,})/);
        if (fallbackMatches && fallbackMatches[1]) {
          cleanId = fallbackMatches[1];
          wasParsed = true;
        }
      }
    }

    if (!cleanId) {
      setError("Please supply a valid Google Sheet URL or custom ID.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const url = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: cleanId,
          sheetUrl: url,
        }),
      });

      // Update manual parser status diagnostics
      setDiagnosticReport(prev => ({
        ...prev,
        lastCheckedId: cleanId,
        googleApiResponse: response.ok ? "MANUAL_PARSE_CONNECT_SUCCESS" : "CONNECT_FAIL_ON_SERVER",
        wasParsedFromUrl: wasParsed
      }));

      if (response.ok) {
        setSuccessMsg(`Spreadsheet linked successfully! Extracted ID: "${cleanId}"`);
        fetchSettings();
        setManualSheetId("");
      } else {
        setError("Failed to verify spreadsheet linkage on the server.");
      }
    } catch (err) {
      setError("Failed to save Sheet settings.");
    } finally {
      setLoading(false);
    }
  };

  // Automatically Create a Brand-New Google Sheets Spreadsheet using user token
  const handleCreateAutoSheet = async () => {
    setError(null);
    setSuccessMsg(null);

    // Read cached token
    // Since we save it on the server, we need the active token. To check if active, we fetch settings first.
    // Let's first make a client-side API call if we can, or let the server do it?
    // Let's fetch settings. To be 100% robust, we can query Google directly using client side token if we have it, or do it on the server.
    // It's exceptionally clean to do it from the client with the user's token!
    // But wait, the token is saved in the server's `settings.json`. How do we read it? It is private.
    // Let's let the user pass their client token or read it. Wait, the server can handle creating sheets too, of course! But we can also trigger a helper sheet-creator or do it from client-side if we fetch.
    // To make it easy, we can provide a simple helper: let the user pass the token or use the server's cached token.
    // Let's implement active creation. To do it reliably from the client, if we have the token we can do a fetch.
    // Let's fetch the spreadsheet creation on the client:

    // We can fetch from local session or verify settings.
    // Let's see: if the token is saved on the server, but not exposed to client, we can have a server API or client API:
    // Let's add a server-endpoint or do it securely. Let's do a client-side POST to Google Sheets API!
    // But how do we get the token? We can request the user to click synclogin or we can fetch a temporary sync from the server if they confirm.
    // Wait, let's look at `/server.ts` - we didn't add a "create sheet" route there, but we can easily call Google directly from the client if the user authenticates, or can we let the admin trigger a spreadsheet creation?
    // Actually, when they login, we save the `accessToken` in settings, but we also keep it in our state (or can get it from hash callback!).
    // Wait! A very elegant way is: when the callback completes, the client saves the `access_token` in memory! Let's save the active token in the browser's React state upon callback or store it in sessionStorage (which is session-based and safe).
    // Let's look up sessionStorage:
    let tempToken = sessionStorage.getItem("google_access_token");
    if (!tempToken) {
      // Hash could have loaded it
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        const params = new URLSearchParams(hash.substring(1));
        tempToken = params.get("access_token");
        if (tempToken) {
          sessionStorage.setItem("google_access_token", tempToken);
        }
      }
    }

    if (!tempToken && settings.hasToken) {
      // If we don't have it in session storage but server has it, we can trigger sync directly, but Google creation needs token.
      setError("Please click the Google Sheets connection button again to initialize sheet creation.");
      return;
    }

    if (!tempToken) {
      setError("Please authorize your Google Account first.");
      return;
    }

    setLoading(true);
    try {
      // Create Sheet
      const res = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tempToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: {
            title: "Wallovo Waitlist Submissions",
          },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to create spreadsheet via Google API:", errorText);
        let errorMsg = `Google API Error (${res.status})`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error && parsed.error.message) {
            errorMsg = `Google Sheets API Error: ${parsed.error.message} (${res.status})`;
          }
        } catch (_) {
          errorMsg = `Google Sheets API Error (${res.status}): ${errorText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      const spreadsheetId = data.spreadsheetId;
      const sheetUrl = data.spreadsheetUrl;

      // Initialize row headers
      const initHeaders = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:G1?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${tempToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [
              [
                "Timestamp",
                "Name",
                "Email",
                "Business Name",
                "Website",
                "Current Testimonial Method",
                "Biggest Challenge",
              ],
            ],
          }),
        }
      );

      if (!initHeaders.ok) {
        const headerErrText = await initHeaders.text();
        console.warn("Failed to initialize column header rows in the new Spreadsheet:", headerErrText);
        try {
          const parsed = JSON.parse(headerErrText);
          if (parsed.error && parsed.error.message) {
            setError(`Google API Warning: Could not initialize header rows (${parsed.error.message}).`);
          }
        } catch (_) {
          setError(`Google API Warning: Could not initialize header rows (Status ${initHeaders.status}).`);
        }
      }

      // Save connection settings in the backend
      const saveResponse = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId,
          sheetUrl,
        }),
      });

      if (saveResponse.ok) {
        setSuccessMsg("Created and connected brand new Google Sheet: 'Wallovo Waitlist Submissions'!");
        setDiagnosticReport({
          lastCheckedId: spreadsheetId,
          googleApiResponse: "AUTO_SHEET_CREATED_SUCCESS",
          wasParsedFromUrl: false
        });
        fetchSettings();
      } else {
        throw new Error("Created Google Sheet, but failed to register settings on the server.");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred during sheet creation.");
    } finally {
      setLoading(false);
    }
  };

  // Manually trigger full syncing (with optional forceAll boolean argument)
  const handleSyncData = async (forceAll: boolean = false) => {
    setSyncing(true);
    setError(null);
    setSuccessMsg(null);

    const tempToken = sessionStorage.getItem("google_access_token") || "";

    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: tempToken, forceAll }),
      });

      const data = await response.json();

      setDiagnosticReport(prev => ({
        ...prev,
        lastCheckedId: data.spreadsheetId || settings.spreadsheetId,
        googleApiResponse: data.googleResponse || (response.ok ? "APPEND_SUCCESS_200_OK" : data.error || "FAILED_RESPONSE"),
      }));

      if (response.ok) {
        setSuccessMsg(data.message || `Successfully synced missing rows!`);
        fetchSubmissions();
        fetchSettings();
      } else {
        setError(data.error || "Syncing failed. Verify your Google sheets connection.");
      }
    } catch (err: any) {
      setError(`Failed to execute sync api call: ${err?.message || err}`);
    } finally {
      setSyncing(false);
    }
  };

  // Disconnect Sheet
  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect Google Sheets integration? Unsynchronized data will not be lost from the server.")) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spreadsheetId: "",
          sheetUrl: "",
        }),
      });

      if (response.ok) {
        setSuccessMsg("Google Sheets disconnected successfully.");
        sessionStorage.removeItem("google_access_token");
        fetchSettings();
      }
    } catch (err) {
      setError("Failed to disconnect settings.");
    } finally {
      setLoading(false);
    }
  };

  // Deletion logic with matching word confirmation
  const handleDeleteAll = async () => {
    if (deleteInput !== "YES_DELETE_ALL") {
      setError("Please type the confirmation text 'YES_DELETE_ALL' exactly as required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/clear-submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "YES_DELETE_ALL" }),
      });

      if (response.ok) {
        setSuccessMsg("Successfully purged all submissions database.");
        setSubmissions([]);
        setShowDeleteConfirm(false);
        setDeleteInput("");
      } else {
        setError("Failed to confirm deletion authority.");
      }
    } catch (err) {
      setError("System failed to clear database.");
    } finally {
      setLoading(false);
    }
  };

  // Export array to raw CSV of active records
  const handleExportCSV = () => {
    if (submissions.length === 0) {
      setError("No submission records available of any status for export.");
      return;
    }

    const headers = [
      "Timestamp",
      "Name",
      "Email",
      "Business Name",
      "Website",
      "Current Testimonial Method",
      "Biggest Challenge",
    ];
    const rows = submissions.map((sub) => [
      sub.timestamp,
      sub.name,
      sub.email,
      sub.businessName,
      sub.website,
      sub.method,
      sub.challenge,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))].join(
        "\n"
      );

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `wallovo_waitlist_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setSuccessMsg("Waitlist roster downloaded as CSV!");
  };

  // Calculations for KPI blocks
  const totalSubmissions = submissions.length;
  const syncedCount = submissions.filter((sub) => sub.synced).length;
  const unsyncedCount = totalSubmissions - syncedCount;
  const syncPercentage = totalSubmissions > 0 ? Math.round((syncedCount / totalSubmissions) * 100) : 0;

  // Breakdown of testimonial collection methods
  const methodStatistics = submissions.reduce((acc: { [key: string]: number }, sub) => {
    acc[sub.method] = (acc[sub.method] || 0) + 1;
    return acc;
  }, {});

  // Copy helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Filter and Search submissions
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.challenge.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesMethod = methodFilter === "all" || sub.method === methodFilter;

    const matchesSync =
      syncFilter === "all" ||
      (syncFilter === "synced" && sub.synced) ||
      (syncFilter === "pending" && !sub.synced);

    return matchesSearch && matchesMethod && matchesSync;
  });

  return (
    <div className="w-full space-y-8" id="admin-portal-root">
      {/* Messages */}
      <AnimatePresence mode="popLayout">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-start gap-3"
            id="admin-error-banner"
          >
            <CircleAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
            <div className="flex-1">
              <span className="font-semibold">Error: </span>
              {error}
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300 text-xs">Dismiss</button>
          </motion.div>
        )}
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-3"
            id="admin-success-banner"
          >
            <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <div className="flex-1">
              <span className="font-semibold">Success: </span>
              {successMsg}
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-300 text-xs">Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Metrics Dashboard block */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-metrics-grid">
        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium font-sans">Total Signs</div>
            <div className="text-2xl font-bold font-mono text-slate-100">{totalSubmissions}</div>
          </div>
        </div>

        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium font-sans">Excel Synced</div>
            <div className="text-2xl font-bold font-mono text-slate-100">{syncedCount}</div>
          </div>
        </div>

        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium font-sans">Pending Sync</div>
            <div className="text-2xl font-bold font-mono text-slate-100">{unsyncedCount}</div>
          </div>
        </div>

        <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium font-sans">Sync Coverage</div>
            <div className="text-2xl font-bold font-mono text-slate-100">{syncPercentage}%</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Google Sheets Config + Statistics charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Google Integration Panel (8 cols) */}
        <div className="lg:col-span-8 p-6 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Google Sheets Synchronization
            </h4>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  settings.spreadsheetId ? "bg-emerald-500 animate-pulse" : "bg-slate-600"
                }`}
              />
              <span className="text-xs font-semibold text-slate-400 font-sans">
                {settings.spreadsheetId ? "Connected" : "Inactive Link"}
              </span>
            </div>
          </div>

          {/* Setup Inputs / Connected Details */}
          {!settings.spreadsheetId ? (
            <div className="space-y-5">
              {/* Method 1: Automatic Firebase Google Authenticate */}
              <div className="bg-slate-950/40 border border-slate-800 p-5 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-400" />
                  <h5 className="text-sm font-bold text-slate-200">Method 1: Automatic One-Click Google Sign-In (Recommended)</h5>
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Connect your Google Account instantly using standard secure popup authentication. One-click is all it takes to enable Google Sheets integration.
                </p>
                <div className="pt-1 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleConnectGoogleAutomatic}
                    disabled={authLoading}
                    className="flex items-center gap-2.5 px-4 border border-[#4285F4] rounded-lg text-xs font-semibold text-white bg-[#4285F4]/15 hover:bg-[#4285F4]/25 active:scale-95 transition shadow-sm cursor-pointer py-2 disabled:opacity-50"
                  >
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    </svg>
                    <span>Connect Google Account (Automatic)</span>
                  </button>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    settings.hasToken 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    {settings.hasToken ? "Authorized" : "Not Logged In"}
                  </span>
                </div>
              </div>

              {/* Method 2: Custom Client ID */}
              <div className="bg-slate-950/20 border border-slate-800/80 p-5 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-slate-500" />
                  <h5 className="text-sm font-bold text-slate-300">Method 2: Client OAuth ID Credentials (Advanced)</h5>
                </div>
                <p className="text-xs text-slate-400 font-sans leading-relaxed">
                  Prefer to use your own private credentials? You can enter a custom Google Client ID below to initiate authentication.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="col-span-1 sm:col-span-9 space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase font-sans">
                      OAuth Client ID (Required for custom build)
                    </label>
                    <input
                      type="password"
                      id="client-id-input"
                      placeholder="Enter custom Google Client ID..."
                      value={clientIdInput}
                      onChange={(e) => {
                        setClientIdInput(e.target.value);
                        localStorage.setItem("google_client_id", e.target.value);
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="col-span-1 sm:col-span-3 flex items-end">
                    <button
                      onClick={handleConnectGoogle}
                      disabled={authLoading}
                      className="w-full flex items-center justify-center gap-1.5 px-4 py-2 cursor-pointer border border-transparent rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] transition shadow-md disabled:opacity-50"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                      Configure ID
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 font-sans">
                  Redirect URI to authorize: <code className="bg-slate-950 px-1 py-0.5 rounded text-indigo-400 select-all">{window.location.origin}</code>
                </div>
              </div>

              {/* Sheet Attachment Options */}
              <div className="border-t border-slate-800/60 pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Create New sheet */}
                  <div className="flex-1 p-4 bg-slate-950/20 border border-slate-800/80 rounded-xl flex flex-col justify-between gap-4">
                    <div>
                      <h5 className="text-sm font-bold text-slate-200 mb-1">Method A: Auto-Create Brand New Sheet</h5>
                      <p className="text-xs text-slate-400">
                        Let the application automatically construct and initialize a formatted spreadsheet called "Wallovo Waitlist" directly inside your Drive.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateAutoSheet}
                      disabled={loading}
                      className="w-fit flex items-center gap-1.5 px-4 py-2 cursor-pointer border border-teal-500/30 rounded-lg text-xs font-semibold text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 active:scale-95 transition"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Create spreadsheet automatically
                    </button>
                  </div>

                  {/* Connect Existing sheet */}
                  <div className="flex-1 p-4 bg-slate-950/20 border border-slate-800/80 rounded-xl flex flex-col gap-3">
                    <div>
                      <h5 className="text-sm font-bold text-slate-200 mb-1">Method B: Match Existing Spreadsheet</h5>
                      <p className="text-xs text-slate-400">
                        Connect an existing worksheet by inserting its full URL or dedicated Google spreadsheet ID.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Spreadsheet ID or URL..."
                        value={manualSheetId}
                        onChange={(e) => setManualSheetId(e.target.value)}
                        className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={() => handleSaveSheetSettings(manualSheetId)}
                        disabled={loading}
                        className="px-3 py-1.5 cursor-pointer border border-transparent rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 active:scale-95 transition"
                      >
                        Connect
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-slate-950/30 border border-slate-800 rounded-xl space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
                <div>
                  <h5 className="text-sm font-bold text-slate-200 mb-1">Spreadsheet Connected:</h5>
                  <div className="flex items-center gap-2 text-xs text-indigo-400 font-mono">
                    <span className="bg-slate-900/80 px-2 py-1 rounded border border-slate-800 break-all select-all">
                      {settings.spreadsheetId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(settings.spreadsheetId)}
                      className="text-slate-500 hover:text-slate-300 p-1 bg-slate-900 rounded border border-slate-800 transition active:scale-90"
                      title="Copy full active spreadsheet ID"
                    >
                      {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={settings.sheetUrl || `https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-500/20 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 transition"
                  >
                    View Sheet
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <button
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
                  >
                    <LogOut className="w-3 h-3" />
                    Disconnect
                  </button>
                </div>
              </div>

              {/* Google Account Authentication & Re-authorization section */}
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-900 font-sans">
                  <h6 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-indigo-400" />
                    Google Account Authentication Status
                  </h6>
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                    settings.hasToken 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse"
                  }`}>
                    {settings.hasToken ? "Authorized & Active" : "Action Required: Token Missing / Expired"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option 1: Automatic Reconnect */}
                  <div className="p-3 bg-slate-900/25 border border-slate-800/80 rounded-lg space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Automatic One-Click Reconnect
                      </div>
                      <p className="text-[11px] text-slate-400 font-sans leading-relaxed mt-1">
                        Access tokens naturally expire after 1 hour. Simply trigger a fast secure popup to re-authorize and refresh spreadsheet writing capabilities.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={handleConnectGoogleAutomatic}
                        disabled={authLoading}
                        className="inline-flex items-center gap-2 px-3 py-1.5 cursor-pointer border border-[#4285F4] rounded-lg text-xs font-semibold text-white bg-[#4285F4]/15 hover:bg-[#4285F4]/25 active:scale-95 transition disabled:opacity-50"
                      >
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-3.5 h-3.5 shrink-0">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                        <span>Reconnect Google (Automatic)</span>
                      </button>
                    </div>
                  </div>

                  {/* Option 2: Custom ID Credentials */}
                  <div className="p-3 bg-slate-900/10 border border-slate-800/40 rounded-lg space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        Custom Credentials (Advanced)
                      </div>
                      <p className="text-[11px] text-slate-450 font-sans leading-relaxed mt-1">
                        Use a custom GCP credential string structure to authenticate.
                      </p>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <input
                        type="password"
                        placeholder="Enter Google OAuth Client ID..."
                        value={clientIdInput}
                        onChange={(e) => {
                          setClientIdInput(e.target.value);
                          localStorage.setItem("google_client_id", e.target.value);
                        }}
                        className="w-full px-2 py-1 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-100 placeholder-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        onClick={handleConnectGoogle}
                        disabled={authLoading}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1 cursor-pointer border border-transparent rounded text-[10px] font-semibold text-white bg-slate-800 hover:bg-slate-700 transition"
                      >
                        <Link2 className="w-3 h-3" />
                        Authorize via Client ID
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sync Actions & Force Option Row */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/50 p-4 border border-slate-800/60 rounded-xl">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 font-sans flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      Status: Ready to Sync
                    </div>
                    <div className="text-sm font-semibold text-slate-200">
                      Sync Coverage: <span className="font-mono text-indigo-400">{syncedCount} / {totalSubmissions}</span> entries written
                    </div>
                    <div className="text-[11px] text-slate-500 font-sans">
                      {settings.lastSyncedAt ? (
                        <span>Last Successful Sync: <strong className="text-slate-400 font-mono">{new Date(settings.lastSyncedAt).toLocaleString()}</strong></span>
                      ) : (
                        <span>No Sync History Recorded Yet</span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* Sync Pending (only writes unsynced) */}
                    <button
                      onClick={() => handleSyncData(false)}
                      disabled={syncing}
                      className="flex items-center justify-center gap-2 px-4 py-2 cursor-pointer border border-transparent rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 transition shadow-lg shadow-emerald-600/15 disabled:opacity-50"
                      title="Append new, unsynchronized leads only."
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                      {syncing ? "Syncing..." : "Sync Pending Submissions"}
                    </button>

                    {/* Force Sync All (Re-syncs older records to new spreadsheet) */}
                    <button
                      onClick={() => handleSyncData(true)}
                      disabled={syncing}
                      className="flex items-center justify-center gap-2 px-4 py-2 cursor-pointer border border-slate-705 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 active:scale-95 transition disabled:opacity-50"
                      title="Force writing of the complete Waitlist Roster. Useful if you connected a manual spreadsheet and want to populate all existing history."
                    >
                      <Database className="w-3.5 h-3.5 text-indigo-400" />
                      Force Sync All Records
                    </button>
                  </div>
                </div>

                {/* Diagnostics Monitor Block */}
                <div className="p-4 bg-slate-900/20 border border-slate-800/80 rounded-xl space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <CircleAlert className="w-3.5 h-3.5 text-indigo-400" />
                    Google Sheets Sync Diagnostics:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs font-sans text-slate-300">
                    <div>
                      <span className="text-slate-500">Active Spreadsheet ID: </span>
                      <code className="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded font-mono break-all">{settings.spreadsheetId}</code>
                    </div>
                    <div>
                      <span className="text-slate-500">Last Checked Stream ID: </span>
                      <code className="text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono break-all">{diagnosticReport.lastCheckedId || settings.spreadsheetId || "None"}</code>
                    </div>
                    <div>
                      <span className="text-slate-500 font-sans">URL Parsing Verified: </span>
                      <span className="font-semibold text-indigo-400">
                        {diagnosticReport.wasParsedFromUrl ? "Yes, parsed from shareable link" : "Parsed as ID / default"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Google API Status / Response Code: </span>
                      <span className={`font-mono font-semibold ${
                        String(diagnosticReport.googleApiResponse).includes("ERROR") || String(diagnosticReport.googleApiResponse).includes("FAIL")
                          ? "text-rose-400" 
                          : "text-emerald-400"
                      }`}>
                        {diagnosticReport.googleApiResponse ? String(diagnosticReport.googleApiResponse) : "No operations executed yet in this session"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Analytical distribution breakdown chart (4 cols) */}
        <div className="lg:col-span-4 p-6 bg-slate-900/30 border border-slate-800 rounded-2xl flex flex-col justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-200 mb-1 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-400" />
              Source Distribution
            </h4>
            <p className="text-xs text-slate-400 mb-4">Breakdown of current testimonial structures</p>
          </div>

          <div className="space-y-3.5 my-auto">
            {["Google Reviews", "WhatsApp Screenshots", "Manual Collection", "No System", "Other"].map((method) => {
              const count = methodStatistics[method] || 0;
              const percent = totalSubmissions > 0 ? Math.round((count / totalSubmissions) * 100) : 0;
              return (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium font-sans">
                    <span className="text-slate-300">{method}</span>
                    <span className="text-slate-400 font-mono">
                      {count} ({percent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-800/80 pt-4 mt-4 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-sans">Roster Actions:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1 px-3 py-1.5 cursor-pointer rounded-lg text-xs font-semibold border border-indigo-500/20 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 transition"
                title="Download local submissions as direct CSV"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
              <button
                onClick={() => {
                  setSuccessMsg(null);
                  setError(null);
                  setShowDeleteConfirm(true);
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 cursor-pointer rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition"
                title="Clear database submissions"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Purge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Search controls & submissions grid panel */}
      <div className="p-6 bg-slate-900/30 border border-slate-800 rounded-2xl space-y-6" id="lead-recordings-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Waitlist Roster
          </h4>

          {/* Search/Filter block */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition w-44"
              />
            </div>

            {/* Testimonial Dropdown Filter */}
            <div className="relative inline-block text-left">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition cursor-pointer appearance-none"
              >
                <option value="all">All Methods</option>
                <option value="Google Reviews">Google Reviews</option>
                <option value="WhatsApp Screenshots">WhatsApp Screenshots</option>
                <option value="Manual Collection">Manual Collection</option>
                <option value="No System">No System</option>
                <option value="Other">Other</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Sync Filter dropdown */}
            <div className="relative inline-block text-left">
              <select
                value={syncFilter}
                onChange={(e) => setSyncFilter(e.target.value)}
                className="pl-3 pr-8 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500 transition cursor-pointer appearance-none"
              >
                <option value="all">All Syncs</option>
                <option value="synced">Excel Synced</option>
                <option value="pending">Local/Pending</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Submissions list visual cards/table */}
        {filteredSubmissions.length === 0 ? (
          <div className="text-center py-12 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">No matching waitlist submissions found.</p>
            <p className="text-xs text-slate-500 mt-1">Submit responses on the form view to populate leads.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800 text-slate-400 font-sans">
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Details</th>
                  <th className="p-3.5">Company / Web</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5">Biggest Challenge</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 bg-slate-950/10">
                {filteredSubmissions.map((sub, index) => (
                  <tr key={sub.id} className="hover:bg-slate-900/20 transition-all font-sans">
                    <td className="p-3.5 text-slate-500 font-mono">
                      {new Date(sub.timestamp).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="p-3.5 space-y-0.5">
                      <div className="font-bold text-slate-200">{sub.name}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{sub.email}</div>
                    </td>
                    <td className="p-3.5 space-y-1 text-slate-300">
                      <div>{sub.businessName || <span className="text-slate-600">—</span>}</div>
                      {sub.website && (
                        <a
                          href={sub.website.startsWith("http") ? sub.website : `https://${sub.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-0.5 text-[10px] text-indigo-400 hover:underline"
                        >
                          {sub.website}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded font-medium border border-indigo-500/10">
                        {sub.method}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 max-w-xs truncate" title={sub.challenge}>
                      {sub.challenge || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3.5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                          sub.synced
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/10"
                        }`}
                      >
                        {sub.synced ? "Synced" : "Pending"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Overlay Component */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-slate-900 border border-rose-500/30 p-6 rounded-2xl shadow-2xl space-y-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 space-y-1">
                <h5 className="text-base font-bold text-slate-100">Prune Entire Leads Database?</h5>
                <p className="text-xs text-slate-400">
                  This destructive operation will permanently purge all recorded waitlist members on the server. Google Sheets rows will NOT be deleted.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-300">
                Type the word <code className="bg-slate-950 px-1 py-0.5 rounded text-rose-400 font-mono">YES_DELETE_ALL</code> below to confirm:
              </p>
              <input
                type="text"
                placeholder="YES_DELETE_ALL"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteInput("");
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={loading}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 active:scale-95 transition"
              >
                Confirm Purge
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
