// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDN80SPwOxy0DBzWTqm1uZ4dGBsvMGI4rk",
  authDomain: "mytodo-b074c.firebaseapp.com",
  projectId: "mytodo-b074c",
  storageBucket: "mytodo-b074c.firebasestorage.app",
  messagingSenderId: "484495895347",
  appId: "1:484495895347:web:e3dd796fbce0ca1833ac46"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Offline persistence: مرة واحدة فقط هنا
enableIndexedDbPersistence(db).catch((err) => {
  // هذه الأخطاء لا يجب أن توقف التطبيق
  console.warn("Offline persistence not enabled:", err.code);
});

export { auth, db };
console.log("PROJECT ID:", firebaseConfig.projectId);