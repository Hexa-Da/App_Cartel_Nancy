import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBFB_-a5O4KD1V0MSa4HYpsEMekpBTL044",
  authDomain: "cummap-7afee.firebaseapp.com",
  databaseURL: "https://cummap-7afee-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cummap-7afee",
  storageBucket: "cummap-7afee.firebasestorage.app",
  messagingSenderId: "402641775282",
  appId: "1:402641775282:web:585cabb0a67ae4475937ab"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const database = getDatabase(app);