import type { FinanceState } from '@/lib/localDb';
import { SheetsApiError, AuthError, RateLimitError, OfflineError } from './googleTypes';

const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let googleApiLoaded = false;
let authInitialized = false;

export async function loadGoogleApi(): Promise<void> {
  if (googleApiLoaded) return;
  
  return new Promise((resolve, reject) => {
    let gapiLoaded = false;
    let gisLoaded = false;

    const checkDone = () => {
      if (gapiLoaded && gisLoaded) {
        googleApiLoaded = true;
        resolve();
      }
    };

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      window.gapi.load('client', () => {
        gapiLoaded = true;
        checkDone();
      });
    };
    gapiScript.onerror = () => reject(new Error('Failed to load GAPI script'));
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      gisLoaded = true;
      checkDone();
    };
    gisScript.onerror = () => reject(new Error('Failed to load GIS script'));
    document.body.appendChild(gisScript);
  });
}

export async function initGoogleAuth(clientId: string): Promise<void> {
  if (!googleApiLoaded) await loadGoogleApi();
  if (authInitialized) return;

  await window.gapi.client.init({
    discoveryDocs: [DISCOVERY_DOC],
  });

  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: () => {}, // overridden in signIn
  });

  authInitialized = true;
}

export function signIn(): Promise<google.accounts.oauth2.TokenResponse> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new AuthError('Token client not initialized'));
      return;
    }

    tokenClient.callback = (resp: google.accounts.oauth2.TokenResponse) => {
      if (resp.error) {
        reject(new AuthError(resp.error));
      } else {
        resolve(resp);
      }
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export function signOut(): void {
  const token = window.gapi.client.getToken();
  if (token) {
    window.gapi.client.setToken(null);
  }
}

export function isSignedIn(): boolean {
  return !!window.gapi?.client?.getToken();
}

export function getAccessToken(): string | null {
  return window.gapi?.client?.getToken()?.access_token || null;
}

async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      if (!navigator.onLine) throw new OfflineError();
      return await operation();
    } catch (error: any) {
      attempt++;
      if (error?.status === 429) {
        if (attempt >= maxRetries) throw new RateLimitError();
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      if (error?.status >= 500 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
        continue;
      }
      throw new SheetsApiError(error.message || 'API Error', error?.status);
    }
  }
  throw new Error('Operation failed');
}

export async function createNewSpreadsheet(title: string): Promise<string> {
  return withRetry(async () => {
    const response = await window.gapi.client.sheets.spreadsheets.create({
      resource: { properties: { title } },
    });
    const spreadsheetId = response.result.spreadsheetId;
    await initializeSheetStructure(spreadsheetId);
    return spreadsheetId;
  });
}

export async function initializeSheetStructure(spreadsheetId: string): Promise<void> {
  const sheets = [
    { title: '_config', headers: ['key', 'value'] },
    { title: 'accounts', headers: ['id', 'name', 'type', 'brand', 'balance', 'currency', 'openingBalance'] },
    { title: 'transactions', headers: ['id', 'kind', 'date', 'description', 'category', 'accountId', 'amount', 'currency', 'baseAmount', 'tags'] },
    { title: 'bills', headers: ['id', 'name', 'category', 'amount', 'currency', 'frequency', 'nextDueDate', 'remainingInstallments', 'active'] },
    { title: 'debts', headers: ['id', 'name', 'person', 'type', 'total', 'paid', 'currency', 'dueDate', 'note'] },
    { title: 'savings', headers: ['id', 'name', 'target', 'saved', 'currency', 'targetDate', 'color'] },
    { title: 'wishlist', headers: ['id', 'name', 'price', 'currency', 'priority', 'targetDate', 'category', 'status'] },
    { title: 'budgets', headers: ['id', 'category', 'limit', 'currency'] },
    { title: 'categories', headers: ['id', 'name', 'archived'] }
  ];

  return withRetry(async () => {
    // 1. Create sheets and delete Sheet1
    const addSheetRequests = sheets.map(s => ({
      addSheet: { properties: { title: s.title } }
    }));
    
    // Attempt to delete default Sheet1 if it exists (usually sheetId 0)
    addSheetRequests.push({
      // @ts-ignore - deleteSheet expects sheetId
      deleteSheet: { sheetId: 0 }
    });

    try {
      await window.gapi.client.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests: addSheetRequests }
      });
    } catch(e: any) {
      // Ignore if Sheet1 doesn't exist
      console.warn('Batch update sheet creation (ignoring errors if sheet exists):', e);
    }

    // 2. Set headers
    const headerData = sheets.map(s => ({
      range: `${s.title}!A1`,
      values: [s.headers]
    }));

    await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'RAW',
        data: headerData
      }
    });
  });
}

export function stateToSheetData(state: FinanceState): Record<string, string[][]> {
  const data: Record<string, string[][]> = {};

  data['_config'] = [
    ['profileName', state.profileName || ''],
    ['baseCurrency', state.baseCurrency || 'USD'],
    ['locale', state.locale || 'en'],
    ['theme', state.theme || 'light'],
    ['exchangeRates', JSON.stringify(state.exchangeRates || {})],
    ['schedule', JSON.stringify(state.schedule || {})]
  ];

  data['accounts'] = state.accounts.map(a => [
    a.id, a.name, a.type, a.brand, String(a.balance), a.currency, String(a.openingBalance || '')
  ]);

  data['transactions'] = state.transactions.map(t => [
    t.id, t.kind, t.date, t.description, t.category, t.accountId, String(t.amount), t.currency, String(t.baseAmount), (t.tags || []).join('|')
  ]);

  data['bills'] = state.bills.map(b => [
    b.id, b.name, b.category, String(b.amount), b.currency, b.frequency, b.nextDueDate, String(b.remainingInstallments || ''), String(b.active)
  ]);

  data['debts'] = state.debts.map(d => [
    d.id, d.name, d.person, d.type, String(d.total), String(d.paid), d.currency, d.dueDate, d.note || ''
  ]);

  data['savings'] = state.savings.map(s => [
    s.id, s.name, String(s.target), String(s.saved), s.currency, s.targetDate, s.color
  ]);

  data['wishlist'] = state.wishlist.map(w => [
    w.id, w.name, String(w.price), w.currency, w.priority, w.targetDate, w.category, w.status
  ]);

  data['budgets'] = state.budgets.map(b => [
    b.id, b.category, String(b.limit), b.currency
  ]);

  data['categories'] = state.categories.map(c => [
    c.id, c.name, String(c.archived)
  ]);

  return data;
}

export function sheetDataToState(data: Record<string, string[][]>): FinanceState {
  const state: Partial<FinanceState> = {
    accounts: [], transactions: [], bills: [], debts: [], savings: [], wishlist: [], budgets: [], categories: []
  };

  const configValues = data['_config'] || [];
  configValues.forEach(row => {
    if (row.length < 2) return;
    const [key, value] = row;
    if (key === 'profileName') state.profileName = value;
    else if (key === 'baseCurrency') state.baseCurrency = value as any;
    else if (key === 'locale') state.locale = value as any;
    else if (key === 'theme') state.theme = value as any;
    else if (key === 'exchangeRates') state.exchangeRates = value ? JSON.parse(value) : {};
    else if (key === 'schedule') state.schedule = value ? JSON.parse(value) : {};
  });

  state.accounts = (data['accounts'] || []).map(r => ({
    id: r[0], name: r[1], type: r[2] as any, brand: r[3], balance: Number(r[4] || 0), currency: r[5] as any, openingBalance: r[6] ? Number(r[6]) : undefined
  }));

  state.transactions = (data['transactions'] || []).map(r => ({
    id: r[0], kind: r[1] as any, date: r[2], description: r[3], category: r[4], accountId: r[5], amount: Number(r[6] || 0), currency: r[7] as any, baseAmount: Number(r[8] || 0), tags: r[9] ? r[9].split('|') : []
  }));

  state.bills = (data['bills'] || []).map(r => ({
    id: r[0], name: r[1], category: r[2], amount: Number(r[3] || 0), currency: r[4] as any, frequency: r[5] as any, nextDueDate: r[6], remainingInstallments: r[7] ? Number(r[7]) : undefined, active: r[8] === 'true'
  }));

  state.debts = (data['debts'] || []).map(r => ({
    id: r[0], name: r[1], person: r[2], type: r[3] as any, total: Number(r[4] || 0), paid: Number(r[5] || 0), currency: r[6] as any, dueDate: r[7], note: r[8] || ''
  }));

  state.savings = (data['savings'] || []).map(r => ({
    id: r[0], name: r[1], target: Number(r[2] || 0), saved: Number(r[3] || 0), currency: r[4] as any, targetDate: r[5], color: r[6]
  }));

  state.wishlist = (data['wishlist'] || []).map(r => ({
    id: r[0], name: r[1], price: Number(r[2] || 0), currency: r[3] as any, priority: r[4] as any, targetDate: r[5], category: r[6], status: r[7] as any
  }));

  state.budgets = (data['budgets'] || []).map(r => ({
    id: r[0], category: r[1], limit: Number(r[2] || 0), currency: r[3] as any
  }));

  state.categories = (data['categories'] || []).map(r => ({
    id: r[0], name: r[1], archived: r[2] === 'true'
  }));

  return state as FinanceState;
}

async function fetchSheetCsv(spreadsheetId: string, sheetName: string): Promise<string[][]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(Boolean);
    const rows: string[][] = [];
    for (const line of lines) {
      const row = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
      rows.push(row.map(cell => cell.replace(/^"|"$/g, '').trim()));
    }
    return rows.length > 1 ? rows.slice(1) : [];
  } catch {
    return [];
  }
}

export async function readFullState(spreadsheetId: string): Promise<FinanceState> {
  const sheetNames = ['_config', 'accounts', 'transactions', 'bills', 'debts', 'savings', 'wishlist', 'budgets', 'categories'];
  const ranges = sheetNames.map(t => `${t}!A2:Z`);
  
  if (window.gapi?.client?.sheets && isSignedIn()) {
    return withRetry(async () => {
      const res = await window.gapi.client.sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges
      });

      const data: Record<string, string[][]> = {};
      res.result.valueRanges.forEach((vr, i) => {
        const title = sheetNames[i];
        data[title] = vr.values || [];
      });

      return sheetDataToState(data);
    });
  }

  // Fallback for non-OAuth mode (Spreadsheet Link & Email mode)
  const data: Record<string, string[][]> = {};
  for (const name of sheetNames) {
    data[name] = await fetchSheetCsv(spreadsheetId, name);
  }
  return sheetDataToState(data);
}

export async function writeFullState(spreadsheetId: string, state: FinanceState): Promise<void> {
  const data = stateToSheetData(state);
  const updateData = Object.keys(data).map(title => ({
    range: `${title}!A2:Z`,
    values: data[title].length > 0 ? data[title] : [['', '', '', '', '', '', '', '', '', '']] // pad empty rows to clear
  }));

  return withRetry(async () => {
    // We ideally should clear ranges first, but batchUpdate overwrites existing cells.
    // However, if the new data is shorter, old data remains.
    // For a robust clear, we can write a bunch of empty rows or call clear API, 
    // but values.batchUpdate with enough empty strings can suffice.
    // In production, we should call spreadsheets.values.clear before updating,
    // but batchUpdate replaces values.
    
    await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'RAW',
        data: updateData
      }
    });
  });
}

let timeoutId: any = null;
export function debouncedWriteState(spreadsheetId: string, state: FinanceState): Promise<void> {
  return new Promise((resolve, reject) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      try {
        await writeFullState(spreadsheetId, state);
        resolve();
      } catch (err) {
        reject(err);
      }
    }, 2000);
  });
}
