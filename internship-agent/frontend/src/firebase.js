import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAFo259377Lx9L7dPfAJTqgHoa1z-spaAw",
  authDomain: "fourth-splice-506406-p8.firebaseapp.com",
  projectId: "fourth-splice-506406-p8",
  storageBucket: "fourth-splice-506406-p8.firebasestorage.app",
  messagingSenderId: "32053597002",
  appId: "1:32053597002:web:d38fd52d98fb1f99fba7b3",
  measurementId: "G-MSWS4DYM76"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
