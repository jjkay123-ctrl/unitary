
/* ============================================================
   UNITARY — COMPLETE APPLICATION ENGINE
   File: app.js
   Backend: Firebase Authentication, Firestore and Storage

   IMPORTANT:
   1. Load Firebase SDK scripts before config.js and app.js.
   2. config.js must initialise Firebase and expose:
      window.auth
      window.db
      window.storage
      window.UNITARY_FIREBASE_CONFIG
   3. Configure Firebase Authentication, Firestore and Storage.
   4. Configure secure Firebase rules before public launch.
   ============================================================ */

"use strict";

/* ============================================================
   1. APPLICATION CONFIGURATION
   ============================================================ */

const UNITARY = {
    name: "Unitary",
    version: "1.0.0",

    collections: {
        users: "users",
        posts: "posts",
        comments: "comments",
        messages: "messages",
        conversations: "conversations",
        notifications: "notifications",
        communities: "communities",
        memberships: "memberships",
        reports: "reports",
        saved: "savedPosts",
        calls: "calls"
    },

    limits: {
        displayName: 50,
        username: 25,
        bio: 250,
        postText: 5000,
        message: 3000,
        imageSize: 10 * 1024 * 1024,
        videoSize: 100 * 1024 * 1024
    },

    defaults: {
        avatar: "https://placehold.co/200x200?text=Unitary",
        cover: "https://placehold.co/1200x400?text=Unitary"
    }
};

/* ============================================================
   2. FIREBASE CONNECTION
   ============================================================ */

let auth = window.auth || null;
let db = window.db || null;
let storage = window.storage || null;

let FieldValue = null;
let currentUser = null;
let currentProfile = null;
let currentSection = "home";
let currentConversation = null;
let feedUnsubscribe = null;
let messageUnsubscribe = null;
let notificationUnsubscribe = null;

let isSignupMode = false;
let isSubmitting = false;

if (window.firebase && firebase.firestore) {
    FieldValue = firebase.firestore.FieldValue;
}

function firebaseReady() {
    return Boolean(auth && db && storage);
}

function checkFirebase() {
    if (!firebaseReady()) {
        showGlobalMessage(
            "Firebase is not configured correctly. Please check config.js.",
            "error"
        );
        return false;
    }

    return true;
}

/* ============================================================
   3. GENERAL HELPERS
   ============================================================ */

function getElement(id) {
    return document.getElementById(id);
}

function hideElement(id) {
    const element = getElement(id);
    if (element) element.hidden = true;
}

function showElement(id) {
    const element = getElement(id);
    if (element) element.hidden = false;
}

function setText(id, value) {
    const element = getElement(id);
    if (element) element.textContent = value ?? "";
}

function setMessage(id, message, type = "info") {
    const element = getElement(id);
    if (!element) return;

    element.textContent = message;
    element.className = "message " + type;
    element.hidden = false;
}

function clearMessage(id) {
    const element = getElement(id);
    if (!element) return;

    element.textContent = "";
    element.hidden = true;
}

function showGlobalMessage(message, type = "info") {
    const element = getElement("globalMessage");

    if (element) {
        element.textContent = message;
        element.className = "global-message " + type;
        element.hidden = false;
    } else {
        console.log("[Unitary]", message);
    }
}

function clearGlobalMessage() {
    const element = getElement("globalMessage");
    if (element) element.hidden = true;
}

function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;

    return element;
}

function safeDate(value) {
    if (!value) return new Date();

    if (value.toDate) return value.toDate();

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDate(value) {
    return safeDate(value).toLocaleString();
}

function timeAgo(value) {
    const seconds = Math.floor(
        (Date.now() - safeDate(value).getTime()) / 1000
    );

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
    if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
    if (seconds < 604800) return Math.floor(seconds / 86400) + "d ago";

    return safeDate(value).toLocaleDateString();
}

function getFriendlyError(error) {
    const messages = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Please choose a stronger password.",
        "auth/user-not-found": "No account was found with those details.",
        "auth/wrong-password": "The password is incorrect.",
        "auth/invalid-credential": "The login details are incorrect.",
        "auth/too-many-requests": "Too many attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your internet connection.",
        "auth/popup-closed-by-user": "The sign-in window was closed.",
        "permission-denied": "You do not have permission to perform this action."
    };

    return messages[error?.code] ||
        error?.message ||
        "Something went wrong. Please try again.";
}

function requireLogin() {
    if (!currentUser) {
        showGlobalMessage("Please log in to use this feature.", "warning");
        return false;
    }

    return true;
}

function makeUsername(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "")
        .slice(0, UNITARY.limits.username);
}

function cleanText(value, maxLength) {
    return String(value || "")
        .trim()
        .slice(0, maxLength);
}

function createSafeImage(url, alt = "Image") {
    const image = document.createElement("img");

    image.alt = alt;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";

    if (typeof url === "string" &&
        (url.startsWith("https://") || url.startsWith("http://"))) {
        image.src = url;
    } else {
        image.src = UNITARY.defaults.avatar;
    }

    image.onerror = () => {
        image.src = UNITARY.defaults.avatar;
    };

    return image;
}

function hideLoadingScreen() {
    hideElement("loadingScreen");
}

function setButtonLoading(button, loading, normalText = "Continue") {
    if (!button) return;

    button.disabled = loading;
    button.textContent = loading ? "Please wait..." : normalText;
}

function serverTimestamp() {
    return FieldValue
        ? FieldValue.serverTimestamp()
        : new Date();
}

/* ============================================================
   4. AUTHENTICATION
   ============================================================ */

function switchAuthMode(signup) {
    isSignupMode = signup;

    const displayName = getElement("authDisplayName");
    const confirmPassword = getElement("confirmPassword");
    const submitButton = getElement("submitBtn");

    if (displayName) displayName.hidden = !signup;
    if (confirmPassword) confirmPassword.hidden = !signup;

    if (submitButton) {
        submitButton.textContent = signup ? "Create account" : "Log in";
    }

    const loginTab = getElement("loginTab");
    const signupTab = getElement("signupTab");

    if (loginTab) loginTab.classList.toggle("active", !signup);
    if (signupTab) signupTab.classList.toggle("active", signup);

    clearMessage("message");
}

async function handleAuthentication(event) {
    event.preventDefault();

    if (!checkFirebase() || isSubmitting) return;

    const email = cleanText(getElement("email")?.value, 254).toLowerCase();
    const password = getElement("password")?.value || "";
    const displayName = cleanText(
        getElement("authDisplayName")?.value,
        UNITARY.limits.displayName
    );

    const confirmPassword =
        getElement("confirmPassword")?.value || "";

    if (!email || !password) {
        setMessage("message", "Enter your email and password.", "error");
        return;
    }

    if (isSignupMode) {
        if (!displayName) {
            setMessage("message", "Enter your display name.", "error");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("message", "Your passwords do not match.", "error");
            return;
        }

        if (password.length < 8) {
            setMessage(
                "message",
                "Your password must contain at least 8 characters.",
                "error"
            );
            return;
        }
    }

    const button = getElement("submitBtn");

    isSubmitting = true;
    setButtonLoading(button, true);

    try {
        if (isSignupMode) {
            const result = await auth.createUserWithEmailAndPassword(
                email,
                password
            );

            currentUser = result.user;

            await createUserProfile(currentUser, {
                displayName,
                username: makeUsername(
                    displayName.replace(/\s+/g, "")
                )
            });

            try {
                await currentUser.sendEmailVerification();

                setMessage(
                    "message",
                    "Account created. Check your email for verification.",
                    "success"
                );
            } catch (emailError) {
                console.warn("Verification email issue:", emailError);

                setMessage(
                    "message",
                    "Your account was created, but the verification email could not be sent. You can request another email later.",
                    "warning"
                );
            }

        } else {
            const result = await auth.signInWithEmailAndPassword(
                email,
                password
            );

            currentUser = result.user;

            showGlobalMessage("Welcome back to Unitary!", "success");
        }

    } catch (error) {
        setMessage("message", getFriendlyError(error), "error");
    } finally {
        isSubmitting = false;
        setButtonLoading(
            button,
            false,
            isSignupMode ? "Create account" : "Log in"
        );
    }
}

async function signInWithGoogle() {
    if (!checkFirebase()) return;

    try {
        const provider = new firebase.auth.GoogleAuthProvider();

        const result = await auth.signInWithPopup(provider);

        currentUser = result.user;

        await createUserProfile(currentUser, {
            displayName: currentUser.displayName || "Unitary User"
        });

    } catch (error) {
        showGlobalMessage(getFriendlyError(error), "error");
    }
}

async function resetPassword() {
    if (!checkFirebase()) return;

    const email = cleanText(getElement("email")?.value, 254)
        .toLowerCase();

    if (!email) {
        setMessage("message", "Enter your email first.", "warning");
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);

        setMessage(
            "message",
            "If the address is registered, a password reset email will be sent.",
            "success"
        );
    } catch (error) {
        setMessage("message", getFriendlyError(error), "error");
    }
}

async function logout() {
    if (!auth) return;

    try {
        await auth.signOut();

        currentUser = null;
        currentProfile = null;

        showGlobalMessage("You have logged out.", "success");
    } catch (error) {
        showGlobalMessage(getFriendlyError(error), "error");
    }
}

/* ============================================================
   5. USER PROFILES
   ============================================================ */

async function createUserProfile(user, extra = {}) {
    if (!db || !user) return;

    const userRef = db.collection(UNITARY.collections.users).doc(user.uid);
    const existing = await userRef.get();

    if (existing.exists) {
        currentProfile = existing.data();
        return currentProfile;
    }

    const displayName = cleanText(
        extra.displayName || user.displayName || "Unitary User",
        UNITARY.limits.displayName
    );

    const username = makeUsername(
        extra.username || displayName.replace(/\s+/g, "")
    ) || "user" + user.uid.slice(0, 6);

    const profile = {
        uid: user.uid,
        email: user.email || "",
        displayName,
        username,
        bio: "",
        avatar: user.photoURL || UNITARY.defaults.avatar,
        cover: UNITARY.defaults.cover,
        privateAccount: false,
        followers: [],
        following: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await userRef.set(profile);

    currentProfile = profile;

    return profile;
}

async function loadUserProfile() {
    if (!currentUser || !db) return;

    try {
        const snapshot = await db
            .collection(UNITARY.collections.users)
            .doc(currentUser.uid)
            .get();

        if (snapshot.exists) {
            currentProfile = snapshot.data();
        } else {
            currentProfile = await createUserProfile(currentUser);
        }

        renderUserProfile();
    } catch (error) {
        console.error("Profile loading error:", error);
    }
}

function renderUserProfile() {
    if (!currentProfile) return;

    setText("profileDisplayName", currentProfile.displayName);
    setText("profileUsername", "@" + (currentProfile.username || ""));
    setText("profileBio", currentProfile.bio || "");

    setText(
        "followerCount",
        (currentProfile.followers || []).length
    );

    setText(
        "followingCount",
        (currentProfile.following || []).length
    );

    setText("settingsEmail", currentUser?.email || "");

    const avatar = getElement("profileAvatar");

    if (avatar) {
        avatar.src = currentProfile.avatar || UNITARY.defaults.avatar;
    }

    const displayNameInput = getElement("displayName");
    const usernameInput = getElement("username");
    const bioInput = getElement("bio");
    const privacyInput = getElement("isPrivate");

    if (displayNameInput) {
        displayNameInput.value = currentProfile.displayName || "";
    }

    if (usernameInput) {
        usernameInput.value = currentProfile.username || "";
    }

    if (bioInput) {
        bioInput.value = currentProfile.bio || "";
    }

    if (privacyInput) {
        privacyInput.checked = Boolean(currentProfile.privateAccount);
    }
}

async function saveProfile(event) {
    event.preventDefault();

    if (!requireLogin()) return;

    const displayName = cleanText(
        getElement("displayName")?.value,
        UNITARY.limits.displayName
    );

    const username = makeUsername(
        getElement("username")?.value
    );

    const bio = cleanText(
        getElement("bio")?.value,
        UNITARY.limits.bio
    );

    const privateAccount =
        Boolean(getElement("isPrivate")?.checked);

    if (!displayName || !username) {
        setMessage(
            "profileMessage",
            "Display name and username are required.",
            "error"
        );
        return;
    }

    try {
        await db.collection(UNITARY.collections.users)
            .doc(currentUser.uid)
            .update({
                displayName,
                username,
                bio,
                privateAccount,
                updatedAt: serverTimestamp()
            });

        await loadUserProfile();

        setMessage(
            "profileMessage",
            "Profile saved successfully.",
            "success"
        );

    } catch (error) {
        setMessage(
            "profileMessage",
            getFriendlyError(error),
            "error"
        );
    }
}

/* ============================================================
   6. FILE UPLOADS
   ============================================================ */

async function uploadFile(file, folder) {
    if (!requireLogin()) return null;

    if (!file || !storage) {
        throw new Error("Storage is not available.");
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) {
        throw new Error("Please select an image or video file.");
    }

    if (isImage && file.size > UNITARY.limits.imageSize) {
        throw new Error("The image is too large. Maximum size is 10 MB.");
    }

    if (isVideo && file.size > UNITARY.limits.videoSize) {
        throw new Error("The video is too large. Maximum size is 100 MB.");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const path = `${folder}/${currentUser.uid}/${Date.now()}_${safeName}`;

    const reference = storage.ref().child(path);

    const snapshot = await reference.put(file);

    return await snapshot.ref.getDownloadURL();
}

async function uploadProfilePicture(event) {
    if (!requireLogin()) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const url = await uploadFile(file, "profilePictures");

        await db.collection(UNITARY.collections.users)
            .doc(currentUser.uid)
            .update({
                avatar: url,
                updatedAt: serverTimestamp()
            });

        await loadUserProfile();

        const preview = getElement("avatarPreview");
        if (preview) preview.src = url;

        showGlobalMessage("Profile picture updated.", "success");

    } catch (error) {
        showGlobalMessage(getFriendlyError(error), "error");
    }
}

/* ============================================================
   7. POSTS AND FEED
   ============================================================ */

async function createPost(event) {
    event.preventDefault();

    if (!requireLogin()) return;

    const text = cleanText(
        getElement("postText")?.value,
        UNITARY.limits.postText
    );

    const imageFile = getElement("postImage")?.files?.[0];
    const videoFile = getElement("postVideo")?.files?.[0];

    if (!text && !imageFile && !videoFile) {
        showGlobalMessage("Write something or attach media first.", "warning");
        return;
    }

    try {
        let mediaURL = "";
        let mediaType = "";

        if (imageFile) {
            mediaURL = await uploadFile(imageFile, "postImages");
            mediaType = "image";
        }

        if (videoFile) {
            mediaURL = await uploadFile(videoFile, "postVideos");
            mediaType = "video";
        }

        await db.collection(UNITARY.collections.posts).add({
            authorId: currentUser.uid,
            authorName: currentProfile?.displayName || "Unitary User",
            authorUsername: currentProfile?.username || "",
            authorAvatar: currentProfile?.avatar || UNITARY.defaults.avatar,
            text,
            mediaURL,
            mediaType,
            likes: [],
            visibility: "public",
            createdAt: serverTimestamp()
        });

        getElement("postText").value = "";

        if (getElement("postImage")) getElement("postImage").value = "";
        if (getElement("postVideo")) getElement("postVideo").value = "";

        showGlobalMessage("Your post has been published.", "success");

        loadFeed();

    } catch (error) {
        showGlobalMessage(getFriendlyError(error), "error");
    }
}

async function loadFeed() {
    if (!db) return;

    cons
