import { getApp, setLogLevel } from "@react-native-firebase/app";
import { connectAuthEmulator, getAuth } from "@react-native-firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
} from "@react-native-firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
} from "@react-native-firebase/functions";
import {
  connectStorageEmulator,
  getStorage,
} from "@react-native-firebase/storage";
import Constants from "expo-constants";

// Export setLogLevel for use in _layout.tsx
export { setLogLevel };

export const emulatorsEnabled =
  __DEV__ && Constants.expoConfig?.extra?.emulatorsEnabledInDev;

// Get the initialized Firebase app instance
// In React Native Firebase, the app is initialized automatically
// when the app starts using the configuration from google-services.json/GoogleService-Info.plist
const app = getApp();

// Initialize Firebase services
export const auth_instance = getAuth(app);
export const firestore_instance = getFirestore(app);
export const functions_instance = getFunctions(app);
export const storage_instance = getStorage(app);

// Use emulators in dev mode if needed
if (emulatorsEnabled) {
  connectAuthEmulator(auth_instance, "http://localhost:9099");
  connectFunctionsEmulator(functions_instance, "localhost", 5001);
  connectFirestoreEmulator(firestore_instance, "localhost", 8080);
  connectStorageEmulator(storage_instance, "localhost", 9199);
  console.log("Firebase emulators enabled");
} else {
  console.log("Firebase emulators disabled");
}
