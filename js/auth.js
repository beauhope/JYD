import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const lockScreen = document.getElementById("lockScreen");
const app = document.getElementById("app");
const statusText = document.getElementById("status");

// Register
export function registerUser() {
  createUserWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(() => alert("Account created ✅"))
    .catch((error) => alert(error.message));
}

// Login
export function loginUser() {
  signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value)
    .then(() => alert("Logged in ✅"))
    .catch((error) => alert(error.message));
}

// Logout
export function logoutUser() {
  signOut(auth);
}

// Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    lockScreen.style.display = "none";
    app.classList.remove("hidden");
    statusText.textContent = "Logged in as " + user.email;
  } else {
    lockScreen.style.display = "flex";
    app.classList.add("hidden");
    statusText.textContent = "Not logged in";
  }
});

console.log("Auth loaded");
