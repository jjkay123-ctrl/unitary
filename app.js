
/* ============================================================
   UNITARY — COMPLETE APPLICATION ENGINE
   Version 1.1.0
   Firebase Compat SDK
   ============================================================ */

"use strict";

/* ===================== 1. CONFIGURATION ===================== */

const UNITARY = {
    collections: {
        users: "users",
        posts: "posts",
        conversations: "conversations",
        notifications: "notifications",
        communities: "communities",
        reports: "reports",
        saved: "savedPosts"
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
        avatar: "https://placehold.co/200x200?text=Unitary"
    }
};

let auth = window.auth || null;
let db = window.db || null;
let storage = window.storage || null;

let currentUser = null;
let currentProfile = null;
let currentSection = "home";
let currentConversation = null;

let feedUnsubscribe = null;
let messageUnsubscribe = null;
let notificationUnsubscribe = null;

let isSignupMode = false;
let isSubmitting = false;

const FieldValue =
    window.firebase?.firestore?.FieldValue || null;


/* ===================== 2. HELPERS ===================== */

function el(id) {
    return document.getElementById(id);
}

function show(id) {
    if (el(id)) el(id).hidden = false;
}

function hide(id) {
    if (el(id)) el(id).hidden = true;
}

function text(id, value) {
    if (el(id)) el(id).textContent = value ?? "";
}

function clean(value, maximum = 5000) {
    return String(value || "").trim().slice(0, maximum);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function serverTimestamp() {
    return FieldValue
        ? FieldValue.serverTimestamp()
        : new Date();
}

function arrayUnion(value) {
    return FieldValue
        ? FieldValue.arrayUnion(value)
        : [value];
}

function arrayRemove(value) {
    return FieldValue
        ? FieldValue.arrayRemove(value)
        : [];
}

function safeDate(value) {
    if (!value) return new Date();

    if (typeof value.toDate === "function") {
        return value.toDate();
    }

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? new Date()
        : date;
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

function friendlyError(error) {
    const errors = {
        "auth/email-already-in-use": "This email is already registered.",
        "auth/invalid-email": "Enter a valid email address.",
        "auth/weak-password": "Choose a stronger password.",
        "auth/user-not-found": "No account was found.",
        "auth/wrong-password": "The password is incorrect.",
        "auth/invalid-credential": "The login details are incorrect.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "auth/network-request-failed": "Check your internet connection.",
        "auth/popup-closed-by-user": "The sign-in window was closed.",
        "permission-denied": "Firebase security rules denied this action.",
        "storage/unauthorized": "You are not allowed to upload this file."
    };

    return errors[error?.code] ||
        error?.message ||
        "Something went wrong. Please try again.";
}

function globalMessage(message, type = "info") {
    const element = el("globalMessage");

    if (!element) {
        console.log("[Unitary]", message);
        return;
    }

    element.textContent = message;
    element.className = "global-message " + type;
    element.hidden = false;

    clearTimeout(globalMessage.timeout);

    globalMessage.timeout = setTimeout(() => {
        element.hidden = true;
    }, 5000);
}

function localMessage(id, message, type = "info") {
    const element = el(id);
    if (!element) return;

    element.textContent = message;
    element.className = "message " + type;
    element.hidden = false;
}

function requireLogin() {
    if (!currentUser) {
        globalMessage("Please log in first.", "warning");
        return false;
    }

    return true;
}

function firebaseReady() {
    return Boolean(auth && db && storage);
}

function checkFirebase() {
    if (!firebaseReady()) {
        globalMessage(
            "Firebase is not ready. Check config.js and the Firebase SDK.",
            "error"
        );
        return false;
    }

    return true;
}

function makeElement(tag, className, content) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (content !== undefined) element.textContent = content;

    return element;
}

function bind(id, event, callback) {
    const element = el(id);

    if (element) {
        element.addEventListener(event, callback);
    }
}


/* ===================== 3. THEMES ===================== */

function applyTheme(theme) {
    const selected = theme === "dark" ? "dark" : "light";

    document.documentElement.dataset.theme = selected;

    try {
        localStorage.setItem("unitary_theme", selected);
    } catch (error) {
        console.warn("Theme preference unavailable.");
    }

    if (el("themeSelect")) {
        el("themeSelect").value = selected;
    }
}

function toggleTheme() {
    const current =
        document.documentElement.dataset.theme || "light";

    applyTheme(current === "light" ? "dark" : "light");
}

function loadTheme() {
    let saved = "light";

    try {
        saved = localStorage.getItem("unitary_theme") || "light";
    } catch (error) {}

    applyTheme(saved);
}


/* ===================== 4. AUTHENTICATION ===================== */

function setAuthMode(signup) {
    isSignupMode = Boolean(signup);

    if (el("displayNameGroup")) {
        el("displayNameGroup").hidden = !signup;
    }

    if (el("confirmPasswordGroup")) {
        el("confirmPasswordGroup").hidden = !signup;
    }

    if (el("loginTab")) {
        el("loginTab").classList.toggle("active", !signup);
    }

    if (el("signupTab")) {
        el("signupTab").classList.toggle("active", signup);
    }

    if (el("submitBtn")) {
        el("submitBtn").textContent =
            signup ? "Create account" : "Log in";
    }

    if (el("forgotPasswordBtn")) {
        el("forgotPasswordBtn").hidden = signup;
    }

    if (el("confirmPassword")) {
        el("confirmPassword").required = signup;
    }

    if (el("authDisplayName")) {
        el("authDisplayName").required = signup;
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();

    if (isSubmitting || !checkFirebase()) return;

    const email = clean(el("email")?.value, 254).toLowerCase();
    const password = el("password")?.value || "";

    if (!email || !password) {
        localMessage("message", "Enter your email and password.", "error");
        return;
    }

    const button = el("submitBtn");

    try {
        isSubmitting = true;

        if (button) {
            button.disabled = true;
            button.textContent = "Please wait...";
        }

        if (isSignupMode) {
            const displayName = clean(
                el("authDisplayName")?.value,
                UNITARY.limits.displayName
            );

            const confirmation =
                el("confirmPassword")?.value || "";

            if (!displayName) {
                throw new Error("Enter your display name.");
            }

            if (password.length < 8) {
                throw new Error("Password must have at least 8 characters.");
            }

            if (password !== confirmation) {
                throw new Error("Your passwords do not match.");
            }

            const result =
                await auth.createUserWithEmailAndPassword(email, password);

            const usernameBase = email
                .split("@")[0]
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, "")
                .slice(0, 20) || "user";

            await db.collection("users")
                .doc(result.user.uid)
                .set({
                    uid: result.user.uid,
                    email,
                    displayName,
                    username: usernameBase + result.user.uid.slice(0, 4),
                    bio: "",
                    avatar: UNITARY.defaults.avatar,
                    followers: [],
                    following: [],
                    isPrivate: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

            try {
                await result.user.sendEmailVerification();

                globalMessage(
                    "Account created. Check your email for verification.",
                    "success"
                );
            } catch (verificationError) {
                globalMessage(
                    "Account created. Email verification could not be sent.",
                    "warning"
                );
            }

        } else {
            await auth.signInWithEmailAndPassword(email, password);

            globalMessage("Login successful.", "success");
        }

    } catch (error) {
        localMessage("message", friendlyError(error), "error");

    } finally {
        isSubmitting = false;

        if (button) {
            button.disabled = false;
            button.textContent =
                isSignupMode ? "Create account" : "Log in";
        }
    }
}

async function resetPassword() {
    if (!checkFirebase()) return;

    const email = clean(el("email")?.value, 254).toLowerCase();

    if (!email) {
        localMessage("message", "Enter your email address first.", "warning");
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);

        localMessage(
            "message",
            "If the account exists, a password reset email has been sent.",
            "success"
        );

    } catch (error) {
        localMessage("message", friendlyError(error), "error");
    }
}

async function googleSignIn() {
    if (!checkFirebase()) return;

    try {
        const provider = new firebase.auth.GoogleAuthProvider();

        provider.setCustomParameters({
            prompt: "select_account"
        });

        const result = await auth.signInWithPopup(provider);

        const userRef = db.collection("users").doc(result.user.uid);
        const existing = await userRef.get();

        if (!existing.exists) {
            await userRef.set({
                uid: result.user.uid,
                email: result.user.email || "",
                displayName: result.user.displayName || "Unitary User",
                username: "user" + result.user.uid.slice(0, 8),
                bio: "",
                avatar: result.user.photoURL || UNITARY.defaults.avatar,
                followers: [],
                following: [],
                isPrivate: false,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
        }

    } catch (error) {
        globalMessage(friendlyError(error), "error");
    }
}

async function logout() {
    try {
        if (feedUnsubscribe) feedUnsubscribe();
        if (messageUnsubscribe) messageUnsubscribe();
        if (notificationUnsubscribe) notificationUnsubscribe();

        await auth.signOut();

        currentUser = null;
        currentProfile = null;
        currentConversation = null;

        globalMessage("You have logged out.", "success");

    } catch (error) {
        globalMessage(friendlyError(error), "error");
    }
}


/* ===================== 5. AUTH STATE ===================== */

function showApplication() {
    hide("loadingScreen");
    hide("authSection");
    show("appSection");

    showSection("home");

    loadUserProfile();
    listenToFeed();
    listenToNotifications();
    loadDiscover();
    loadCommunities();
}

function showAuthentication() {
    hide("loadingScreen");
    hide("appSection");
    show("authSection");

    setAuthMode(false);
}

function listenForAuthentication() {
    if (!auth) {
        showAuthentication();
        return;
    }

    auth.onAuthStateChanged(async user => {
        currentUser = user || null;

        if (!user) {
            currentProfile = null;
            showAuthentication();
            return;
        }

        try {
            const reference = db.collection("users").doc(user.uid);
            const profile = await reference.get();

            if (!profile.exists) {
                await reference.set({
                    uid: user.uid,
                    email: user.email || "",
                    displayName: user.displayName || "Unitary User",
                    username: "user" + user.uid.slice(0, 8),
                    bio: "",
                    avatar: user.photoURL || UNITARY.defaults.avatar,
                    followers: [],
                    following: [],
                    isPrivate: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }

            showApplication();

        } catch (error) {
            showAuthentication();
            globalMessage(friendlyError(error), "error");
        }
    });
}


/* ===================== 6. PROFILES ===================== */

async function loadUserProfile() {
    if (!requireLogin()) return;

    try {
        const snapshot = await db.collection("users")
            .doc(currentUser.uid)
            .get();

        if (!snapshot.exists) {
            throw new Error("Your profile could not be found.");
        }

        currentProfile = snapshot.data();

        text("profileDisplayName", currentProfile.displayName || "Unitary User");
        text("profileUsername", "@" + (currentProfile.username || "user"));
        text("profileBio", currentProfile.bio || "No biography added.");

        text("followerCount", (currentProfile.followers || []).length);
        text("followingCount", (currentProfile.following || []).length);

        text("settingsEmail", currentUser.email || "");

        const avatar = currentProfile.avatar || UNITARY.defaults.avatar;

        if (el("profileAvatar")) el("profileAvatar").src = avatar;
        if (el("avatarPreview")) el("avatarPreview").src = avatar;

        if (el("displayName")) {
            el("displayName").value = currentProfile.displayName || "";
        }

        if (el("username")) {
            el("username").value = currentProfile.username || "";
        }

        if (el("bio")) {
            el("bio").value = currentProfile.bio || "";
        }

        if (el("isPrivate")) {
            el("isPrivate").checked = Boolean(currentProfile.isPrivate);
        }

        loadProfilePosts(currentUser.uid);

    } catch (error) {
        globalMessage(friendlyError(error), "error");
    }
}

function editProfile() {
    if (!requireLogin()) return;
    show("profileForm");
}

function cancelProfileEdit() {
    hide("profileForm");
    loadUserProfile();
}

async function saveProfile(event) {
    event.preventDefault();

    if (!requireLogin()) return;

    const displayName = clean(
        el("displayName")?.value,
        UNITARY.limits.displayName
    );

    const username = clean(
        el("username")?.value,
        UNITARY.limits.username
    ).toLowerCase().replace(/[^a-z0-9_]/g, "");

    const bio = clean(el("bio")?.value, UNITARY.limits.bio);

    if (!displayName) {
        localMessage("profileMessage", "Display name is required.", "error");
        return;
    }

    if (username.length < 3) {
        localMessage("profileMessage", "Username needs at least 3 characters.", "error");
        return;
    }

    try {
        const users = db.collection("users");

        const duplicate = await users
            .where("username", "==", username)
            .limit(2)
            .get();

        const taken = duplicate.docs.some(
            document => document.id !== currentUser.uid
        );

        if (taken) {
            throw new Error("That username is already taken.");
        }

        let avatar = currentProfile?.avatar || UNITARY.defaults.avatar;

        const picture = el("profilePicture")?.files?.[0];

        if (picture) {
            avatar = await uploadFile(picture, "profilePictures");
        }

        await users.doc(currentUser.uid).update({
            displayName,
            username,
            bio,
            avatar,
            isPrivate: Boolean(el("isPrivate")?.checked),
            updatedAt: serverTimestamp()
        });

        await loadUserProfile();
        hide("profileForm");

        localMessage(
            "profileMessage",
            "Your profile has been saved.",
            "success"
        );

        globalMessage("Profile updated successfully.", "success");

    } catch (error) {
        localMessage("profileMessage", friendlyError(error), "error");
    }
}


/* ===================== 7. FILE UPLOADS ===================== */

async function uploadFile(file, folder) {
    if (!requireLogin()) {
        throw new Error("Please log in first.");
    }

    if (!file || !storage) {
        throw new Error("Firebase Storage is unavailable.");
    }

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
        throw new Error("Choose an image or video file.");
    }

    if (isImage && file.size > UNITARY.limits.imageSize) {
        throw new Error("Images must be 10 MB or smaller.");
    }

    if (isVideo && file.size > UNITARY.limits.videoSize) {
        throw new Error("Videos must be 100 MB or smaller.");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const path = folder + "/" + currentUser.uid + "/" +
        Date.now() + "_" + safeName;

    const reference = storage.ref().child(path);

    const snapshot = await reference.put(file);

    return snapshot.ref.getDownloadURL();
}

async function uploadProfilePicture(event) {
    if (!requireLogin()) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
        const url = await uploadFile(file, "profilePictures");

        await db.collection("users").doc(currentUser.uid).update({
            avatar: url,
            updatedAt: serverTimestamp()
        });

        await loadUserProfile();

        globalMessage("Profile picture updated.", "success");

    } catch (error) {
        globalMessage(friendlyError(error), "error");
    }
}


/* ===================== 8. POSTS ===================== */

async function createPost(event) {
    event.preventDefault();

    if (!requireLogin()) return;

    const content = clean(
        el("postText")?.value,
        UNITARY.limits.postText
    );

    const imageFile = el("postImage")?.files?.[0];
    const videoFile = el("postVideo")?.files?.[0];

    if (!content && !imageFile && !videoFile) {
        globalMessage("Write something or attach media first.", "warning");
        return;
    }

    if (imageFile && videoFile) {
        globalMessage("Attach an image or video, not both.", "warning");
        return;
    }

    try {
        let mediaURL = "";
        let mediaType = "";

        if (imageFile) {
            mediaURL = await uploadFile(imageFile, "postImages");
            mediaType = "image";
        }

        if (vid
