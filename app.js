
/* =========================================================
   UNITARY — MAIN APPLICATION
   Firebase Authentication, Firestore and Storage
   Firebase COMPAT SDK
   ========================================================= */

"use strict";

/* =========================================================
   1. FIREBASE INITIALIZATION
   ========================================================= */

const firebaseConfig = window.UNITARY_FIREBASE_CONFIG;

if (!firebaseConfig) {
  throw new Error(
    "Firebase configuration missing. Check config.js and UNITARY_FIREBASE_CONFIG."
  );
}

if (!window.firebase) {
  throw new Error("Firebase SDK failed to load.");
}

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

const FieldValue = firebase.firestore.FieldValue;

/* =========================================================
   2. APPLICATION STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;
let currentConversationId = null;

let unsubscribeAuth = null;
let unsubscribeFeed = null;
let unsubscribeMessages = null;
let unsubscribeNotifications = null;
let unsubscribeConversations = null;

let currentAuthMode = "login";
let currentFeedFilter = "all";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const DEFAULT_AVATAR =
  "https://placehold.co/150x150?text=Unitary";

/* =========================================================
   3. GENERAL HELPERS
   ========================================================= */

function getElement(id) {
  return document.getElementById(id);
}

function showElement(id) {
  const element = getElement(id);
  if (element) element.hidden = false;
}

function hideElement(id) {
  const element = getElement(id);
  if (element) element.hidden = true;
}

function setText(id, value) {
  const element = getElement(id);
  if (element) element.textContent = value ?? "";
}

function setMessage(id, message, isError = false) {
  const element = getElement(id);
  if (!element) return;

  element.textContent = message;
  element.dataset.status = isError ? "error" : "success";
}

function showGlobalMessage(message) {
  const element = getElement("globalMessage");
  if (!element) return;

  element.textContent = message;
  element.hidden = false;
}

function clearGlobalMessage() {
  const element = getElement("globalMessage");
  if (element) {
    element.textContent = "";
    element.hidden = true;
  }
}

function createElement(tag, text, className) {
  const element = document.createElement(tag);

  if (text !== undefined) {
    element.textContent = text;
  }

  if (className) {
    element.className = className;
  }

  return element;
}

function formatDate(timestamp) {
  if (!timestamp) return "";

  const date = timestamp.toDate
    ? timestamp.toDate()
    : new Date(timestamp);

  return date.toLocaleString();
}

function getFriendlyError(error) {
  const messages = {
    "auth/email-already-in-use":
      "This email already has an account.",

    "auth/invalid-email":
      "Please enter a valid email address.",

    "auth/weak-password":
      "Please choose a stronger password.",

    "auth/user-not-found":
      "No account was found with those details.",

    "auth/wrong-password":
      "The password is incorrect.",

    "auth/invalid-credential":
      "The email or password is incorrect.",

    "auth/network-request-failed":
      "Network error. Check your internet connection.",

    "auth/popup-closed-by-user":
      "The sign-in window was closed.",

    "auth/too-many-requests":
      "Too many attempts. Please try again later.",

    "permission-denied":
      "You do not have permission to perform this action."
  };

  return messages[error.code] ||
    error.message ||
    "Something went wrong. Please try again.";
}

function requireLogin() {
  if (!currentUser) {
    showGlobalMessage("Please log in first.");
    return false;
  }

  return true;
}

function createSafeImage(url, alt = "Image") {
  const image = document.createElement("img");

  image.src = url || DEFAULT_AVATAR;
  image.alt = alt;
  image.loading = "lazy";

  return image;
}

/* =========================================================
   4. LOADING SCREEN
   ========================================================= */

function hideLoadingScreen() {
  hideElement("loadingScreen");
}

/* =========================================================
   5. AUTHENTICATION INTERFACE
   ========================================================= */

function setAuthMode(mode) {
  currentAuthMode = mode;

  const signup = mode === "signup";

  const loginTab = getElement("loginTab");
  const signupTab = getElement("signupTab");

  if (loginTab) {
    loginTab.classList.toggle("active", !signup);
  }

  if (signupTab) {
    signupTab.classList.toggle("active", signup);
  }

  const title = getElement("authTitle");
  if (title) {
    title.textContent = signup
      ? "Create Your Unitary Account"
      : "Welcome Back";
  }

  const submit = getElement("submitBtn");
  if (submit) {
    submit.textContent = signup ? "Create Account" : "Log In";
  }

  const password = getElement("password");
  if (password) {
    password.autocomplete = signup
      ? "new-password"
      : "current-password";
  }

  if (signup) {
    showElement("displayNameGroup");
    showElement("confirmPasswordGroup");
  } else {
    hideElement("displayNameGroup");
    hideElement("confirmPasswordGroup");
  }

  setMessage("message", "");
}

getElement("loginTab")?.addEventListener("click", () => {
  setAuthMode("login");
});

getElement("signupTab")?.addEventListener("click", () => {
  setAuthMode("signup");
});

/* =========================================================
   6. ACCOUNT REGISTRATION AND LOGIN
   ========================================================= */

async function handleAuthentication(event) {
  event.preventDefault();

  const email = getElement("email")?.value.trim();
  const password = getElement("password")?.value;
  const displayName = getElement("authDisplayName")?.value.trim();

  const submitButton = getElement("submitBtn");

  if (!email || !password) {
    setMessage("message", "Enter your email and password.", true);
    return;
  }

  if (submitButton) submitButton.disabled = true;

  try {
    if (currentAuthMode === "signup") {
      const confirmPassword =
        getElement("confirmPassword")?.value;

      if (!displayName) {
        throw new Error("Please enter your display name.");
      }

      if (password !== confirmPassword) {
        throw new Error("Your passwords do not match.");
      }

      if (password.length < 6) {
        throw new Error("Password must contain at least 6 characters.");
      }

      const result = await auth.createUserWithEmailAndPassword(
        email,
        password
      );

      await result.user.updateProfile({
        displayName
      });

      await db.collection("users")
        .doc(result.user.uid)
        .set({
          uid: result.user.uid,
          email,
          displayName,
          username: "",
          bio: "",
          photoURL: "",
          coverURL: "",
          isPrivate: false,
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });

      await result.user.sendEmailVerification();

      setMessage(
        "message",
        "Account created. Please check your email for verification."
      );

    } else {
      await auth.signInWithEmailAndPassword(email, password);

      setMessage("message", "Login successful.");
    }

  } catch (error) {
    setMessage("message", getFriendlyError(error), true);

  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

getElement("authForm")?.addEventListener(
  "submit",
  handleAuthentication
);

/* =========================================================
   7. GOOGLE SIGN-IN
   ========================================================= */

async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();

    const result = await auth.signInWithPopup(provider);

    const userRef = db.collection("users").doc(result.user.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        uid: result.user.uid,
        email: result.user.email || "",
        displayName: result.user.displayName || "",
        username: "",
        bio: "",
        photoURL: result.user.photoURL || "",
        isPrivate: false,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        createdAt: FieldValue.serverTimestamp()
      });
    }

  } catch (error) {
    setMessage("message", getFriendlyError(error), true);
  }
}

getElement("googleBtn")?.addEventListener(
  "click",
  signInWithGoogle
);

/* =========================================================
   8. PASSWORD RESET
   ========================================================= */

async function resetPassword() {
  const email = getElement("email")?.value.trim();

  if (!email) {
    setMessage(
      "message",
      "Enter your email address first.",
      true
    );
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);

    setMessage(
      "message",
      "Password reset instructions have been sent if the account exists."
    );

  } catch (error) {
    setMessage("message", getFriendlyError(error), true);
  }
}

getElement("forgotPasswordBtn")?.addEventListener(
  "click",
  resetPassword
);

/* =========================================================
   9. AUTHENTICATION STATE
   ========================================================= */

async function handleAuthState(user) {
  currentUser = user;

  if (!user) {
    currentProfile = null;

    hideElement("appSection");
    showElement("authSection");
    hideLoadingScreen();

    stopRealtimeListeners();

    return;
  }

  hideElement("authSection");
  showElement("appSection");

  try {
    await loadProfile();
    await loadFeed();
    await loadConversations();
    await loadNotifications();

    showSection("homeSection");

  } catch (error) {
    showGlobalMessage(getFriendlyError(error));
  }

  hideLoadingScreen();
}

unsubscribeAuth = auth.onAuthStateChanged(handleAuthState);

/* =========================================================
   10. REAL-TIME LISTENER CLEANUP
   ========================================================= */

function stopRealtimeListeners() {
  if (unsubscribeFeed) unsubscribeFeed();
  if (unsubscribeMessages) unsubscribeMessages();
  if (unsubscribeNotifications) unsubscribeNotifications();
  if (unsubscribeConversations) unsubscribeConversations();

  unsubscribeFeed = null;
  unsubscribeMessages = null;
  unsubscribeNotifications = null;
  unsubscribeConversations = null;
}

/* =========================================================
   11. LOGOUT
   ========================================================= */

async function logout() {
  try {
    await auth.signOut();
    showGlobalMessage("You have logged out.");

  } catch (error) {
    showGlobalMessage(getFriendlyError(error));
  }
}

getElement("sidebarLogoutBtn")?.addEventListener("click", logout);
getElement("logoutBtn")?.addEventListener("click", logout);

/* =========================================================
   12. NAVIGATION
   ========================================================= */

function showSection(sectionId) {
  const sections = document.querySelectorAll(".page-section");

  sections.forEach(section => {
    const active = section.id === sectionId;

    section.hidden = !active;
    section.classList.toggle("active", active);
  });

  if (sectionId === "profileSection") {
    loadProfile();
  }

  if (sectionId === "notificationsSection") {
    loadNotifications();
  }

  if (sectionId === "messagesSection") {
    loadConversations();
  }

  window.location.hash = sectionId;
}

document.querySelectorAll("[data-section]").forEach(button => {
  button.addEventListener("click", () => {
    showSection(button.dataset.section);
  });
});

/* =========================================================
   13. USER PROFILE
   ========================================================= */

async function loadProfile() {
  if (!requireLogin()) return;

  const userRef = db.collection("users").doc(currentUser.uid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    currentProfile = {
      uid: currentUser.uid,
      email: currentUser.email || "",
      displayName: currentUser.displayName || "",
      username: "",
      bio: "",
      photoURL: "",
      isPrivate: false
    };

    await userRef.set(currentProfile, { merge: true });

  } else {
    currentProfile = snapshot.data();
  }

  setText(
    "profileDisplayName",
    currentProfile.displayName || "Unitary User"
  );

  setText(
    "profileUsername",
    currentProfile.username
      ? "@" + currentProfile.username
      : "@username"
  );

  setText("profileBio", currentProfile.bio || "");

  const avatar = getElement("profileAvatar");

  if (avatar) {
    avatar.src = currentProfile.photoURL || DEFAULT_AVATAR;
  }

  setText(
    "postCount",
    `${currentProfile.postsCount || 0} Posts`
  );

  setText(
    "followerCount",
    `${currentProfile.followersCount || 0} Followers`
  );

  setText(
    "followingCount",
    `${currentProfile.followingCount || 0} Following`
  );

  if (getElement("displayName")) {
    getElement("displayName").value =
      currentProfile.displayName || "";
  }

  if (getElement("username")) {
    getElement("username").value =
      currentProfile.username || "";
  }

  if (getElement("bio")) {
    getElement("bio").value =
      currentProfile.bio || "";
  }

  if (getElement("isPrivate")) {
    getElement("isPrivate").checked =
      Boolean(currentProfile.isPrivate);
  }

  if (getElement("settingsEmail")) {
    getElement("settingsEmail").value =
      currentUser.email || "";
  }
}

/* =========================================================
   14. PROFILE EDITING
   ========================================================= */

getElement("editProfileBtn")?.addEventListener("click", () => {
  showElement("profileEditor");
});

getElement("cancelProfileEditBtn")?.addEventListener("click", () => {
  hideElement("profileEditor");
});

async function uploadFile(file, folder) {
  if (!file) return null;

  if (file.type.startsWith("image/") &&
      file.size > MAX_IMAGE_SIZE) {
    throw new Error("Images must be 5 MB or smaller.");
  }

  if (file.type.startsWith("video/") &&
      file.size > MAX_VIDEO_SIZE) {
    throw new Error("Videos must be 50 MB or smaller.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  const path =
    `${folder}/${currentUser.uid}/${Date.now()}_${safeName}`;

  const reference = storage.ref().child(path);

  await reference.put(file);

  return await reference.getDownloadURL();
}

async function saveProfile(event) {
  event.preventDefault();

  if (!requireLogin()) return;

  try {
    const displayName = getElement("displayName").value.trim();
    const username = getElement("username").value.trim()
      .toLowerCase();
    const bio = getElement("bio").value.trim();

    if (!displayName) {
      throw new Error("Enter your display name.");
    }

    if (username && !/^[a-z0-9_]{3,30}$/.test(username)) {
      throw new Error(
        "Username must be 3–30 characters using letters, numbers or underscores."
      );
    }

    const profileData = {
      displayName,
      username,
      bio,
      isPrivate: getElement("isPrivate").checked,
      updatedAt: FieldValue.serverTimestamp()
    };

    const picture = getElement("profilePicture")?.files[0];
    const cover = getElement("coverPicture")?.files[0];

    if (picture) {
      profileData.photoURL = await uploadFile(
        picture,
        "profilePictures"
      );
    }

    if (cover) {
      profileData.coverURL = await uploadFile(
        cover,
        "coverPictures"
      );
    }

    await db.collection("users")
      .doc(currentUser.uid)
      .set(profileData, { merge: true });

    if (displayName !== currentUser.displayName) {
      await currentUser.updateProfile({ displayName });
    }

    await loadProfile();

    hideElement("profileEditor");

    setMessage("profileMessage", "Profile saved successfully.");

  } catch (error) {
    setMessage(
      "profileMessage",
      getFriendlyError(error),
      true
    );
  }
}

getElement("profileForm")?.addEventListener(
  "submit",
  saveProfile
);

/* =========================================================
   15. PROFILE PICTURE PREVIEW
   ========================================================= */

getElement("profilePicture")?.addEventListener("change", event => {
  const file = event.target.files[0];
  const preview = getElement("avatarPreview");

  if (!file || !preview) return;

  if (!file.type.startsWith("image/")) {
    showGlobalMessage("Choose an image file.");
    event.target.value = "";
    return;
  }

  preview.src = URL.createObjectURL(file);
  showElement("avatarPreview");
});

/* =========================================================
   16. CREATE POSTS
   ========================================================= */

async function createPost(event) {
  event.preventDefault();

  if (!requireLogin()) return;

  const text = getElement("postText")?.value.trim();

  const imageFiles =
    Array.from(getElement("postImage")?.files || []);

  const videoFiles =
    Array.from(getElement("postVideo")?.files || []);

  if (!text && imageFiles.length === 0 && videoFiles.length === 0) {
    showGlobalMessage("Write something or attach media.");
    return;
  }

  try {
    const media = [];

    for (const file of imageFiles) {
      const url = await uploadFile(file, "postImages");

      media.push({
        url,
        type: "image",
        name: file.name
      });
    }

    for (const file of videoFiles) {
      const url = await uploadFile(file, "postVideos");

      media.push({
        url,
        type: "video",
        name: file.name
      });
    }

    await db.collection("posts").add({
      uid: currentUser.uid,
      authorName: currentProfile?.displayName || "Unitary User",
      authorUsername: currentProfile?.username || "",
      authorPhoto: currentProfile?.photoURL || "",
      text,
      media,
      likesCount: 0,
      commentsCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      visibility: currentProfile?.isPrivate
        ? "followers"
        : "public"
    });

    await db.collection("users")
      .doc(currentUser.uid)
      .update({
        postsCount: FieldValue.increment(1)
      });

    getElement("createPostForm").reset();

    setText("postPreview", "");

    showGlobalMessage("Your post has been published.");

    await loadFeed();

    await loadProfile();

  } catch (error) {
    showGlobalMessage(getFriendlyError(error));
  }
}

getElement("createPostForm")?.addEventListener(
  "submit",
  createPost
);

/* =========================================================
   17. DISPLAY FEED
   ========================================================= */

function renderPost(post, postId) {
  const article = createElement("article", undefined, "post-card");

  article.dataset.postId = postId;

  const header = createElement("div", undefined, "post-header");

  header.appendChild(
    createSafeImage(post.authorPhoto, "Author profile")
  );

  const authorInfo = createElement("div");

  authorInfo.appendChild(
    createElement("strong", post.authorName || "Unitary User")
  );

  authorInfo.appendChild(
    createElement(
      "small",
      post.authorUsername ? "@" + post.authorUsername : ""
    )
  );

  authorInfo.appen
