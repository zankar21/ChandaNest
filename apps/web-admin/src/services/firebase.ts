import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider, getToken as getAppCheckToken } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

let appCheckPromise: Promise<string | null> | null = null;
export function initAppCheckIfEnabled() {
  if (import.meta.env.VITE_ENABLE_APP_CHECK !== "true") return null;
  if (appCheckPromise) return appCheckPromise;
  const providerKey = import.meta.env.VITE_RECAPTCHA_KEY || "";
  const appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaV3Provider(providerKey),
    isTokenAutoRefreshEnabled: true
  });
  appCheckPromise = getAppCheckToken(appCheck, false).then((res) => res.token).catch(() => null);
  return appCheckPromise;
}
