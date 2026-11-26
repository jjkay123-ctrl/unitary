
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// Firebase connection
const firebaseConfig = window.UNITARY_FIREBASE_CONFIG;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Page elements
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const submitBtn = document.getElementById("submitBtn");
const googleBtn = document.getElementById("googleBtn");
const message = document.getElementById("message");

let isSignup = false;

function showMessage(text) {
  message.textContent = text;
}

// Create a profile if the user does not already have one
async function ensureProfile(user) {
  const profileRef = doc(db, "profiles", user.uid);
  const profileSnapshot = await getDoc(profileRef);

  if (!profileSnapshot.exists()) {
    const displayName =
      user.displayName ||
      (user.email ? user.email.split("@")[0] : "Unitary User");

    await setDoc(profileRef, {
      uid: user.uid,
      username: displayName.toLowerCase().replace(/[^a-z0-9_]/g, ""),
      displayName: displayName,
      email: user.email || "",
      bio: "",
      avatarUrl: user.photoURL || "",
      isPrivate: false,
      createdAt: serverTimestamp()
    });
  }
}

// Login and registration tabs
loginTab.addEventListener("click", () => {
  isSignup = false;
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
  submitBtn.textContent = "Log in";
  showMessage("");
});

signupTab.addEventListener("click", () => {
  isSignup = true;
  signupTab.classList.add("active");
  loginTab.classList.remove("active");
  submitBtn.textContent = "Create account";
  showMessage("");
});

// Email and password
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitBtn.disabled = true;
  showMessage("Please wait...");

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let result;

    if (isSignup) {
      result = await createUserWithEmailAndPassword(
        auth, email, password
      );
    } else {
      result = await signInWithEmailAndPassword(
        auth, email, password
      );
    }

    await ensureProfile(result.user);

    showMessage(
      isSignup
        ? "Your Unitary account and profile have been created!"
        : "Welcome back to Unitary!"
    );

  } catch (error) {
    console.error(error);
    showMessage(error.message);
  } finally {
    submitBtn.disabled = false;
  }
});

// Google sign-in
googleBtn.addEventListener("click", async () => {
  googleBtn.disabled = true;
  showMessage("Connecting to Google...");

  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureProfile(result.user);
    showMessage("Welcome to Unitary! Your profile is ready.");

  } catch (error) {
    console.error(error);
    showMessage(error.message);
  } finally {
    googleBtn.disabled = false;
  }
});

// Monitor signed-in users
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      await ensureProfile(user);
      console.log("Unitary profile is ready:", user.uid);
    } catch (error) {
      console.error("Profile creation failed:", error);
    }
  }
});
  

