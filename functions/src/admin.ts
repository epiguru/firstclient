import { remoteConfig } from "firebase-admin";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

var serviceAccount = require("../ena-chat-firebase-adminsdk-fbsvc-bb0e619bc1.json");
export const projectId = serviceAccount.project_id;

export const appEnv =
  process.env.NODE_ENV === "production" ? "production" : "development";

if (appEnv === "development") {
  console.log("USING EMULATORS");
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = "localhost:9199";
  process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST = "localhost:5001";
} else {
  console.log("[PRODUCTION]");
}

const admin = getApps().length
  ? getApps()[0]
  : initializeApp({
      projectId: serviceAccount.project_id,
      credential: cert(serviceAccount),
    });

export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();
export const config = remoteConfig();

export default admin;
