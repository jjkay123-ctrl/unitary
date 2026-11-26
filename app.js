
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

// Connect to the Firebase project
const firebaseConfig = window.UNITARY_FIREBASE_CONFIG;

if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Firebase configuration is missing. Check config.js.");
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
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

// Display messages
function showMessage(text) {
  message.textContent = text;
}

// Switch between login and registration
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

// Email and password authentication
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  submitBtn.disabled = true;
  showMessage("Please wait...");

  try {
    if (isSignup) {
      await createUserWithEmailAndPassword(auth, email, password);
      showMessage("Your Unitary account has been created successfully!");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      showMessage("You are signed in successfully!");
    }
  } catch (error) {
    const messages = {
      "auth/email-already-in-use": "This email already has an account.",
      "auth/invalid-email": "Please enter a valid email address.",
      "auth/weak-password": "Please choose a stronger password.",
      "auth/invalid-credential": "Email or password is incorrect.",
      "auth/popup-closed-by-user": "Google sign-in was cancelled.",
      "auth/unauthorized-domain": "This website domain is not authorized in Firebase."
    };

    showMessage(messages[error.code] || "Something went wrong. Please try again.");
    console.error(error);
  } finally {
    submitBtn.disabled = false;
  }
});

// Google sign-in
googleBtn.addEventListener("click", async () => {
  googleBtn.disabled = true;
  showMessage("Connecting to Google...");

  try {
    await signInWithPopup(auth, googleProvider);
    showMessage("Google sign-in successful!");
  } catch (error) {
    showMessage(
      error.code === "auth/unauthorized-domain"
        ? "Add your website domain to Firebase Authorized domains."
        : "Google sign-in could not be completed. Please try again."
    );
    console.error(error);
  } finally {
    googleBtn.disabled = false;
  }
});

// Monitor sign-in status
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Unitary user signed in:", user.uid);
  } else {
    console.log("No user signed in.");
  }
});
                  
