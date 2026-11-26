
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
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";

// Initialize Firebase
const app = initializeApp(window.UNITARY_FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Login elements
const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const submitBtn = document.getElementById("submitBtn");
const googleBtn = document.getElementById("googleBtn");
const message = document.getElementById("message");

// Profile elements
const profileSection = document.getElementById("profileSection");
const profileForm = document.getElementById("profileForm");
const displayNameInput = document.getElementById("displayName");
const usernameInput = document.getElementById("username");
const bioInput = document.getElementById("bio");
const isPrivateInput = document.getElementById("isPrivate");
const profileMessage = document.getElementById("profileMessage");

let isSignup = false;

function showMessage(text) {
  message.textContent = text;
}

// Create a profile when needed
async function ensureProfile(user) {
  const profileRef = doc(db, "profiles", user.uid);
  const snapshot = await getDoc(profileRef);

  if (!snapshot.exists()) {
    const name = user.displayName ||
      user.email?.split("@")[0] || "Unitary User";

    await setDoc(profileRef, {
      uid: user.uid,
      username: name.toLowerCase().replace(/[^a-z0-9_]/g, "") || "user",
      displayName: name,
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
    showMessage("Welcome to Unitary!");

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
    showMessage("Welcome to Unitary!");

  } catch (error) {
    console.error(error);
    showMessage(error.message);
  } finally {
    googleBtn.disabled = false;
  }
});

// Load and display profile
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    profileSection.hidden = true;
    return;
  }

  try {
    await ensureProfile(user);

    const snapshot = await getDoc(
      doc(db, "profiles", user.uid)
    );

    if (snapshot.exists()) {
      const profile = snapshot.data();

      displayNameInput.value = profile.displayName || "";
      usernameInput.value = profile.username || "";
      bioInput.value = profile.bio || "";
      isPrivateInput.checked = profile.isPrivate === true;

      profileSection.hidden = false;
      profileMessage.textContent = "Profile loaded.";
    }
  } catch (error) {
    console.error(error);
    profileMessage.textContent = error.message;
  }
});

// Save profile changes
profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = auth.currentUser;

  if (!user) {
    profileMessage.textContent = "Please log in first.";
    return;
  }

  const displayName = displayNameInput.value.trim();
  const username = usernameInput.value.trim().toLowerCase();
  const bio = bioInput.value.trim();

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    profileMessage.textContent =
      "Username must be 3–20 letters, numbers or underscores.";
    return;
  }

  try {
    profileMessage.textContent = "Saving profile...";

    await updateDoc(doc(db, "profiles", user.uid), {
      displayName,
      username,
      bio,
      isPrivate: isPrivateInput.checked
    });

    profileMessage.textContent = "Profile saved successfully!";

  } catch (error) {
    console.error(error);
    profileMessage.textContent = error.message;
  }
});

// Unitary profile picture preview
const profilePictureInput =
  document.getElementById("profilePicture");

const avatarPreview =
  document.getElementById("avatarPreview");

let avatarPreviewUrl = "";

profilePictureInput.addEventListener("change", () => {
  const file = profilePictureInput.files[0];

  if (!file) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    profileMessage.textContent =
      "Please select a JPG, PNG or WebP image.";
    profilePictureInput.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    profileMessage.textContent =
      "Please select an image smaller than 5 MB.";
    profilePictureInput.value = "";
    return;
  }

  if (avatarPreviewUrl) {
    URL.revokeObjectURL(avatarPreviewUrl);
  }

  avatarPreviewUrl = URL.createObjectURL(file);
  avatarPreview.src = avatarPreviewUrl;
  avatarPreview.hidden = false;

  profileMessage.textContent =
    "Picture preview ready!";
});
      
