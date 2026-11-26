import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDocFromServer,
  disableNetwork,
  enableNetwork,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const GIS_OAUTH_SCOPES = [
  ...SCOPES,
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export interface GoogleWorkspaceUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface GisTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
  expires_in?: number;
  scope?: string;
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: GisTokenResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
            prompt?: string;
          }) => GisTokenClient;
          revoke?: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

const typedConfig = firebaseConfig as typeof firebaseConfig & {
  firestoreDatabaseId?: string;
  oAuthClientId?: string;
};
const resolvedDatabaseId = typedConfig.firestoreDatabaseId || '(default)';

const app = initializeApp(firebaseConfig);
export const db = typedConfig.firestoreDatabaseId
  ? initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        experimentalLongPollingOptions: { timeoutSeconds: 10 },
        ignoreUndefinedProperties: true,
      },
      typedConfig.firestoreDatabaseId
    )
  : initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      experimentalLongPollingOptions: { timeoutSeconds: 10 },
      ignoreUndefinedProperties: true,
    });
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
SCOPES.forEach((scope) => googleProvider.addScope(scope));
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Strictly in-memory OAuth access token & workspace user cache (never stored in localStorage/sessionStorage)
let cachedSheetsAccessToken: string | null = null;
let cachedWorkspaceUser: GoogleWorkspaceUser | null = null;
let isSigningIn = false;

type WorkspaceAuthListener = (hasToken: boolean, wsUser: GoogleWorkspaceUser | null) => void;
const workspaceListeners = new Set<WorkspaceAuthListener>();

function notifyWorkspaceListeners() {
  const effectiveUser: GoogleWorkspaceUser | null =
    cachedWorkspaceUser ||
    (auth.currentUser
      ? {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
        }
      : null);
  const hasToken = Boolean(cachedSheetsAccessToken);
  workspaceListeners.forEach((cb) => cb(hasToken, effectiveUser));
}

function loadGoogleIdentityScript(timeoutMs = 5000): Promise<boolean> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(false);
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://accounts.google.com/gsi/client"]'
    );
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      resolve(ok);
    };

    const timer = setTimeout(() => {
      finish(Boolean(window.google?.accounts?.oauth2));
    }, timeoutMs);

    if (existing) {
      const checkReady = () => {
        if (window.google?.accounts?.oauth2) {
          clearTimeout(timer);
          finish(true);
        }
      };
      existing.addEventListener('load', checkReady, { once: true });
      existing.addEventListener(
        'error',
        () => {
          clearTimeout(timer);
          finish(false);
        },
        { once: true }
      );
      const poll = setInterval(() => {
        if (done) {
          clearInterval(poll);
          return;
        }
        if (window.google?.accounts?.oauth2) {
          clearInterval(poll);
          clearTimeout(timer);
          finish(true);
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      clearTimeout(timer);
      finish(Boolean(window.google?.accounts?.oauth2));
    };
    script.onerror = () => {
      clearTimeout(timer);
      finish(false);
    };
    document.head.appendChild(script);
  });
}

// Preload GIS script silently on browser boot so user-click launches stay synchronous
if (typeof window !== 'undefined') {
  void loadGoogleIdentityScript(6000);
}

async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleWorkspaceUser> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = (await res.json()) as {
        sub?: string;
        email?: string;
        name?: string;
      };
      return {
        uid: data.sub || `google-${Date.now()}`,
        email: data.email || null,
        displayName: data.name || data.email || 'Google Account',
      };
    }
  } catch {
    // Profile fetch failed; Sheets token is still valid
  }
  return {
    uid: auth.currentUser?.uid || `google-${Date.now()}`,
    email: auth.currentUser?.email || 'Connected Gmail Account',
    displayName: auth.currentUser?.displayName || 'Google Sheets User',
  };
}

function requestSheetsTokenViaGisSync(): Promise<{
  user: GoogleWorkspaceUser;
  accessToken: string;
}> {
  const oauth2 = window.google?.accounts?.oauth2;
  const clientId = typedConfig.oAuthClientId;
  if (!oauth2 || !clientId) {
    return Promise.reject(new Error('Google OAuth client is not ready yet.'));
  }

  return new Promise((resolve, reject) => {
    try {
      const tokenClient = oauth2.initTokenClient({
        client_id: clientId,
        scope: GIS_OAUTH_SCOPES,
        prompt: 'select_account',
        callback: (resp: GisTokenResponse) => {
          if (resp.error || !resp.access_token) {
            const msg =
              resp.error_description ||
              resp.error ||
              'Google account permission was not granted.';
            reject(new Error(`Google login failed: ${msg}`));
            return;
          }
          const accessToken = resp.access_token;
          cachedSheetsAccessToken = accessToken;
          void fetchGoogleUserProfile(accessToken).then((profile) => {
            cachedWorkspaceUser = profile;
            notifyWorkspaceListeners();
            resolve({ user: profile, accessToken });
          });
        },
        error_callback: (err) => {
          if (err?.type === 'popup_closed') {
            reject(
              new Error(
                'Gmail login popup was closed before finishing. Please select your Gmail ID and allow Google Sheets access.'
              )
            );
          } else if (err?.type === 'popup_failed_to_open') {
            reject(
              new Error(
                'Login popup was blocked by your browser. Please allow popups for this site and click Sign in with Google again.'
              )
            );
          } else {
            reject(new Error(err?.message || 'Google OAuth popup failed. Please try again.'));
          }
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Failed to start Gmail login popup.'));
    }
  });
}

export const FIREBASE_PROJECT_INFO = {
  projectId: firebaseConfig.projectId,
  databaseId: resolvedDatabaseId,
  consoleManageUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/databases/${resolvedDatabaseId}/data`,
  consoleOverviewUrl: `https://console.firebase.google.com/project/${firebaseConfig.projectId}/overview`,
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error: ', serialized);
  throw new Error(serialized);
}

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  if (!firebaseConfig?.projectId) {
    console.error('Please check your Firebase configuration: missing projectId.');
    return { ok: false, message: 'Invalid Firebase configuration' };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    await disableNetwork(db).catch(() => {});
    return { ok: false, message: 'Device offline — operating in local mode' };
  }
  if (!auth.currentUser) {
    return { ok: true, message: 'Firebase configured — sign in with Google to sync' };
  }
  try {
    await enableNetwork(db).catch(() => {});
    await getDocFromServer(doc(db, 'test', 'connection'));
    return { ok: true, message: 'Connected to Cloud Firestore' };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline') || msg.includes('unavailable')) {
      return { ok: false, message: 'Firestore client offline — local sync active' };
    }
    return { ok: true, message: 'Firestore reachable' };
  }
}

export function getWorkspaceGoogleUser(): GoogleWorkspaceUser | null {
  return (
    cachedWorkspaceUser ||
    (auth.currentUser
      ? {
          uid: auth.currentUser.uid,
          email: auth.currentUser.email,
          displayName: auth.currentUser.displayName,
        }
      : null)
  );
}

export function initGoogleWorkspaceAuthListener(onTokenStateChange: WorkspaceAuthListener) {
  workspaceListeners.add(onTokenStateChange);

  const unsubFirebase = onAuthStateChanged(auth, (fbUser) => {
    if (fbUser) {
      if (!cachedWorkspaceUser) {
        cachedWorkspaceUser = {
          uid: fbUser.uid,
          email: fbUser.email,
          displayName: fbUser.displayName,
        };
      }
      if (!isSigningIn && !cachedSheetsAccessToken) {
        onTokenStateChange(false, cachedWorkspaceUser);
      } else {
        notifyWorkspaceListeners();
      }
    } else if (!cachedSheetsAccessToken) {
      cachedWorkspaceUser = null;
      onTokenStateChange(false, null);
    } else {
      notifyWorkspaceListeners();
    }
  });

  return () => {
    workspaceListeners.delete(onTokenStateChange);
    unsubFirebase();
  };
}

export async function signInWithGoogleFirebase(): Promise<GoogleWorkspaceUser> {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const wsUser: GoogleWorkspaceUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
    };
    cachedWorkspaceUser = wsUser;
    if (credential?.accessToken) {
      cachedSheetsAccessToken = credential.accessToken;
    }
    notifyWorkspaceListeners();
    return wsUser;
  } catch (err) {
    const code = (err as { code?: string })?.code || '';
    const canFallbackToGis = Boolean(typedConfig.oAuthClientId);
    if (
      canFallbackToGis &&
      (code === 'auth/unauthorized-domain' ||
        code === 'auth/operation-not-allowed' ||
        code === 'auth/configuration-not-found' ||
        code === 'auth/internal-error' ||
        code === 'auth/popup-blocked')
    ) {
      const loaded = await loadGoogleIdentityScript(4000);
      if (loaded) {
        const gisRes = await requestSheetsTokenViaGisSync();
        return gisRes.user;
      }
    }
    throw err;
  } finally {
    isSigningIn = false;
  }
}

export async function signInForGoogleSheets(): Promise<{
  user: GoogleWorkspaceUser;
  accessToken: string;
}> {
  isSigningIn = true;
  try {
    // 1. Synchronous GIS OAuth flow using provisioned oAuthClientId (avoids popup blockers & unauthorized-domain issues in AI Studio iframes)
    if (typedConfig.oAuthClientId && window.google?.accounts?.oauth2) {
      return await requestSheetsTokenViaGisSync();
    }

    // 2. If GIS script is still loading, wait briefly then launch GIS OAuth
    if (typedConfig.oAuthClientId) {
      const gisReady = await loadGoogleIdentityScript(5000);
      if (gisReady && window.google?.accounts?.oauth2) {
        return await requestSheetsTokenViaGisSync();
      }
    }

    // 3. Fallback to Firebase GoogleAuthProvider popup
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error(
        'Could not obtain Google Sheets access token. Please allow Google Sheets permission when signing in with Gmail.'
      );
    }
    const wsUser: GoogleWorkspaceUser = {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
    };
    cachedWorkspaceUser = wsUser;
    cachedSheetsAccessToken = credential.accessToken;
    notifyWorkspaceListeners();
    return { user: wsUser, accessToken: credential.accessToken };
  } finally {
    isSigningIn = false;
  }
}

export function getSheetsAccessToken(): string | null {
  return cachedSheetsAccessToken;
}

export function clearSheetsAccessToken(): void {
  const tokenToRevoke = cachedSheetsAccessToken;
  cachedSheetsAccessToken = null;
  if (tokenToRevoke && typeof window !== 'undefined' && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(tokenToRevoke);
    } catch {
      // Ignore revoke failure
    }
  }
  notifyWorkspaceListeners();
}

export async function signOutFirebase(): Promise<void> {
  const tokenToRevoke = cachedSheetsAccessToken;
  cachedSheetsAccessToken = null;
  cachedWorkspaceUser = null;
  if (tokenToRevoke && typeof window !== 'undefined' && window.google?.accounts?.oauth2?.revoke) {
    try {
      window.google.accounts.oauth2.revoke(tokenToRevoke);
    } catch {
      // Ignore revoke failure
    }
  }
  await signOut(auth).catch(() => {});
  notifyWorkspaceListeners();
}
