export interface Submission {
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

export interface Settings {
  spreadsheetId: string;
  sheetUrl: string;
  lastSyncedAt: string;
  hasToken: boolean;
}
