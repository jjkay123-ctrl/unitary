
/* =====================================================
   UNITARY - FIREBASE MVP
   Compatible with the current index.html and config.js
   ===================================================== */

(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const all = selector => [...document.querySelectorAll(selector)];

  let currentUser = null;
  let authMode = "login";
  let recipientUid = "";
  let currentSection = "home";

  const db = () => window.db;
  const auth = () => window.auth;
  const storage = () => window.storage;

  function message(text, error = false) {
    const global = $("globalMessage");
    const authMessage = $("message");

    if (global) {
      global.textContent = text;
      global.hidden = false;
      global.dataset.type = error ? "error" : "success";
    }

    if (authMessage && $("authSection")?.hidden === false) {
      authMessage.textContent = text;
      authMessage.hidden = false;
    }

    console.log("Unitary:", text);
  }

  function hideMessage() {
    if ($("globalMessage")) $("globalMessage").hidden = true;
    if ($("message")) $("message").hidden = true;
  }

  function setLoading(show) {
    if ($("loadingScreen")) $("loadingScreen").hidden = !show;
  }

  function showAuth() {
    if ($("authSection")) $("authSection").hidden = false;
    if ($("appSection")) $("appSection").hidden = true;
    setLoading(false);
  }

  function showApp() {
    if ($("authSection")) $("authSection").hidden = true;
    if ($("appSection")) $("appSection").hidden = false;
    setLoading(false);
  }

  function val(id) {
    return $(id)?.value?.trim() || "";
  }

  function bind(id, event, callback) {
    const element = $(id);
    if (element) element.addEventListener(event, callback);
  }

  function setTheme(theme) {
    const selected = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = selected;

    try {
      localStorage.setItem("unitary_theme", selected);
    } catch (_) {}

    if ($("themeSelect")) $("themeSelect").value = selected;
  }

  function toggleTheme() {
    const current =
      document.documentElement.dataset.theme || "light";
    setTheme(current === "light" ? "dark" : "light");
  }

  function navigate(section) {
    currentSection = section;

    all("[data-section-panel]").forEach(panel => {
      panel.hidden = panel.dataset.sectionPanel !== section;
    });

    all("[data-section]").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.section === section
      );
    });

    if (section === "home") loadPosts();
    if (section === "communities") loadCommunities();
    if (section === "notifications") loadNotifications();
    if (section === "profile") loadProfile();
    if (section === "saved") loadSavedPosts();
  }

  function bindNavigation() {
    all("[data-section]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        if (!currentUser) return showAuth();
        navigate(button.dataset.section);
      });
    });
  }

  function setAuthMode(mode) {
    authMode = mode;

    const signup = mode === "signup";

    if ($("displayNameGroup")) {
      $("displayNameGroup").hidden = !signup;
    }

    if ($("confirmPasswordGroup")) {
      $("confirmPasswordGroup").hidden = !signup;
    }

    if ($("authDisplayName")) {
      $("authDisplayName").required = signup;
    }

    if ($("confirmPassword")) {
      $("confirmPassword").required = signup;
    }

    if ($("submitBtn")) {
      $("submitBtn").textContent =
        signup ? "Create account" : "Log in";
    }

    if ($("loginTab")) {
      $("loginTab").classList.toggle("active", !signup);
    }

    if ($("signupTab")) {
      $("signupTab").classList.toggle("active", signup);
    }

    if ($("password")) {
      $("password").autocomplete =
        signup ? "new-password" : "current-password";
    }

    hideMessage();
  }

  async function register() {
    const name = val("authDisplayName");
    const email = val("email");
    const password = val("password");
    const confirmation = val("confirmPassword");

    if (!name || !email || !password || !confirmation) {
      return message("Please complete all registration fields.", true);
    }

    if (password.length < 8) {
      return message("Password must have at least 8 characters.", true);
    }

    if (password !== confirmation) {
      return message("Passwords do not match.", true);
    }

    try {
      const result = await auth().createUserWithEmailAndPassword(
        email,
        password
      );

      await result.user.updateProfile({ displayName: name });

      await db().collection("users").doc(result.user.uid).set({
        uid: result.user.uid,
        displayName: name,
        username: name.toLowerCase().replace(/[^a-z0-9]/g, ""),
        bio: "",
        photoURL: "",
        isPrivate: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      message("Account created successfully.");
    } catch (error) {
      message(error.message, true);
    }
  }

  async function login() {
    const email = val("email");
    const password = val("password");

    if (!email || !password) {
      return message("Enter your email and password.", true);
    }

    try {
      await auth().signInWithEmailAndPassword(email, password);
      message("Login successful.");
    } catch (error) {
      message(error.message, true);
    }
  }

  async function logout() {
    try {
      await auth().signOut();
      message("You have logged out.");
    } catch (error) {
      message(error.message, true);
    }
  }

  async function resetPassword() {
    const email = val("email");

    if (!email) {
      return message("Enter your email address first.", true);
    }

    try {
      await auth().sendPasswordResetEmail(email);
      message("Password reset email sent.");
    } catch (error) {
      message(error.message, true);
    }
  }

  async function googleLogin() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth().signInWithPopup(provider);
    } catch (error) {
      message(error.message, true);
    }
  }

  async function loadProfile() {
    if (!currentUser) return;

    try {
      const snap = await db()
        .collection("users")
        .doc(currentUser.uid)
        .get();

      const data = snap.exists ? snap.data() : {};

      if ($("profileDisplayName")) {
        $("profileDisplayName").textContent =
          data.displayName || currentUser.displayName || "Unitary user";
      }

      if ($("profileUsername")) {
        $("profileUsername").textContent =
          "@" + (data.username || "user");
      }

      if ($("profileBio")) {
        $("profileBio").textContent =
          data.bio || "Welcome to my profile.";
      }

      if ($("profileAvatar") && data.photoURL) {
        $("profileAvatar").src = data.photoURL;
      }

      if ($("displayName")) {
        $("displayName").value = data.displayName || "";
      }

      if ($("username")) {
        $("username").value = data.username || "";
      }

      if ($("bio")) {
        $("bio").value = data.bio || "";
      }

      if ($("isPrivate")) {
        $("isPrivate").checked = !!data.isPrivate;
      }

      if ($("settingsEmail")) {
        $("settingsEmail").textContent = currentUser.email || "";
      }

      loadProfilePosts();
    } catch (error) {
      message("Profile loading: " + error.message, true);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();

    if (!currentUser) return;

    try {
      const data = {
        displayName: val("displayName"),
        username: val("username").toLowerCase(),
        bio: val("bio"),
        isPrivate: !!$("isPrivate")?.checked
      };

      const file = $("profilePicture")?.files?.[0];

      if (file) {
        if (!storage()) throw new Error("Firebase Storage unavailable.");

        const ref = storage().ref(
          "profiles/" + currentUser.uid + "/" + Date.now()
        );

        await ref.put(file);
        data.photoURL = await ref.getDownloadURL();
      }

      await db().collection("users")
        .doc(currentUser.uid)
        .set(data, { merge: true });

      if (data.displayName) {
        await currentUser.updateProfile({
          displayName: data.displayName
        });
      }

      if ($("profileMessage")) {
        $("profileMessage").textContent = "Profile saved.";
        $("profileMessage").hidden = false;
      }

      await loadProfile();
    } catch (error) {
      message("Profile error: " + error.message, true);
    }
  }

  async function loadProfilePosts() {
    if (!currentUser || !$("profilePosts")) return;

    try {
      const snap = await db().collection("posts")
        .where("uid", "==", currentUser.uid)
        .limit(30).get();

      $("profilePosts").innerHTML = "";

      snap.forEach(doc => {
        const p = document.createElement("p");
        p.textContent = doc.data().text || "Media post";
        $("profilePosts").appendChild(p);
      });
    } catch (error) {
      console.warn("Profile posts:", error.message);
    }
  }

  async function uploadMedia(file, folder) {
    if (!file) return "";

    if (!storage()) {
      throw new Error("Firebase Storage is unavailable.");
    }

    const ref = storage().ref(
      folder + "/" + currentUser.uid + "/" + Date.now()
    );

    await ref.put(file);
    return await ref.getDownloadURL();
  }

  async function createPost(event) {
    event.preventDefault();

    if (!currentUser) return showAuth();

    const text = val("postText");
    const image = $("postImage")?.files?.[0];
    const video = $("postVideo")?.files?.[0];
    const file = image || video;

    if (!text && !file) {
      return message("Write something or select media.", true);
    }

    try {
      const mediaURL = file
        ? await uploadMedia(file, "posts")
        : "";

      await db().collection("posts").add({
        uid: currentUser.uid,
        author: currentUser.displayName || "Unitary user",
        text,
        mediaURL,
        mediaType: file?.type || "",
        likes: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      $("postText").value = "";
      if ($("postImage")) $("postImage").value = "";
      if ($("postVideo")) $("postVideo").value = "";

      message("Post published.");
      loadPosts();
    } catch (error) {
      message("Post error: " + error.message, true);
    }
  }

  async function loadPosts() {
    if (!currentUser || !$("feedContainer")) return;

    try {
      const snap = await db().collection("posts")
        .orderBy("createdAt", "desc")
        .limit(30).get();

      $("feedContainer").innerHTML = "";

      if (snap.empty) {
        $("feedContainer").textContent =
          "No posts yet. Be the first to share something!";
        return;
      }

      snap.forEach(doc => {
        const data = doc.data();

        const card = document.createElement("article");
        card.className = "post-card";

        const author = document.createElement("h3");
        author.textContent = data.author || "Unitary user";

        const body = document.createElement("p");
        body.textContent = data.text || "";

        card.append(author, body);

        if (data.mediaURL) {
          const media = document.createElement(
            data.mediaType?.startsWith("video/") ? "video" : "img"
          );

          media.src = data.mediaURL;
          media.style.maxWidth = "100%";

          if (media.tagName === "VIDEO") media.controls = true;
          card.appendChild(media);
        }

        const like = document.createElement("button");
        like.textContent =
          "Like (" + (data.likes || []).length + ")";

        like.addEventListener("click", () =>
          toggleLike(doc.id, data.likes || [])
        );

        const save = document.createElement("button");
        save.textContent = "Save";

        save.addEventListener("click", () =>
          savePost(doc.id)
        );

        card.append(like, save);
        $("feedContainer").appendChild(card);
      });
    } catch (error) {
      message("Feed error: " + error.message, true);
    }
  }

  async function toggleLike(id, likes) {
    if (!currentUser) return;

    try {
      const ref = db().collection("posts").doc(id);
      const alreadyLiked = likes.includes(currentUser.uid);

      await ref.update({
        likes: alreadyLiked
          ? firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
          : firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
      });

      loadPosts();
    } catch (error) {
      message("Like error: " + error.message, true);
    }
  }

  function savePost(id) {
    try {
      const saved = JSON.parse(
        localStorage.getItem("unitary_saved_posts") || "[]"
      );

      if (!saved.includes(id)) saved.push(id);

      localStorage.setItem(
        "unitary_saved_posts",
        JSON.stringify(saved)
      );

      message("Post saved on this device.");
    } catch (error) {
      message(error.message, true);
    }
  }

  async function loadSavedPosts() {
    if (!$("savedPostsContainer")) return;

    const saved = JSON.parse(
      localStorage.getItem("unitary_saved_posts") || "[]"
    );

    $("savedPostsContainer").innerHTML = "";

    if (!saved.length) {
      $("savedPostsContainer").textContent = "No saved posts yet.";
      return;
    }

    for (const id of saved) {
      try {
        const doc = await db().collection("posts").doc(id).get();

        if (doc.exists) {
          const p = document.createElement("p");
          p.textContent = doc.data().text || "Saved media post";
          $("savedPostsContainer").appendChild(p);
        }
      } catch (error) {
        console.warn(error.message);
      }
    }
  }

  async function searchContent() {
    const term = val("searchInput").toLowerCase();

    if (!term) return message("Enter something to search.");

    try {
      const snap = await db().collection("posts").limit(50).get();

      $("searchResults").innerHTML = "";
      $("discoverContainer").innerHTML = "";

      snap.forEach(doc => {
        const data = doc.data();

        if ((data.text || "").toLowerCase().includes(term)) {
          const item = document.createElement("p");
          item.textContent =
            (data.author || "User") + ": " + data.text;

          $("searchResults").appendChild(item);
        }
      });

      navigate("discover");
    } catch (error) {
      message("Search error: " + error.message, true);
    }
  }

  function chatId(a, b) {
    return [a, b].sort().join("_");
  }

  async function sendMessage(event) {
    event.preventDefault();

    const to = val("recipientUid") || recipientUid;
    const text = val("messageInput");

    if (!to || !text) {
      return message("Enter a recipient ID and message.", true);
    }

    if (to === currentUser.uid) {
      return message("You cannot message yourself.", true);
    }

    try {
      await db().collection("chats")
        .doc(chatId(currentUser.uid, to))
        .collection("messages")
        .add({
          from: currentUser.uid,
          to,
          text,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

      $("messageInput").value = "";
      recipientUid = to;
      loadMessages();
    } catch (error) {
      message("Message error: " + error.message, true);
    }
  }

  async function loadMessages() {
    const to = val("recipientUid") || recipientUid;

    if (!to) {
      return message("Enter the recipient's user ID.", true);
    }

    recipientUid = to;

    try {
      const snap = await db().collection("chats")
        .doc(chatId(currentUser.uid, to))
        .collection("messages")
        .orderBy("createdAt")
        .limit(100).get();

      $("messagesContainer").innerHTML = "";

      snap.forEach(doc => {
        const data = doc.data();
        const p = document.createElement("p");

        p.textContent =
          (data.from === currentUser.uid ? "You: " : "Them: ") +
          data.text;

        $("messagesContainer").appendChild(p);
      });
    } catch (error) {
      message("Messages error: " + error.message, true);
    }
  }

  async function createCommunity(event) {
    event.preventDefault();

    const name = val("communityName");

    if (!name) return message("Enter a community name.", true);

    try {
      await db().collection("communities").add({
        name,
        description: val("communityDescription"),
        owner: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      $("communityForm").reset();
      message("Community created.");
      loadCommunities();
    } catch (error) {
      message("Community error: " + error.message, true);
    }
  }

  async function loadCommunities() {
    if (!currentUser || !$("communitiesContainer")) return;

    try {
      const snap = await db().collection("communities")
        .limit(50).get();

      $("communitiesContainer").innerHTML = "";

      if (snap.empty) {
        $("communitiesContainer").textContent =
          "No communities yet.";
        return;
      }

      snap.forEach(doc => {
        const item = document.createElement("article");
        const title = document.createElement("h3");
        const description = document.createElement("p");

        title.textContent = doc.data().name || "Community";
        description.textContent = doc.data().description || "";

        item.append(title, description);
        $("communitiesContainer").appendChild(item);
      });
    } catch (error) {
      message("Communities error: " + error.message, true);
    }
  }

  async function loadNotifications() {
    if (!currentUser || !$("notificationsContainer")) return;

    try {
      const snap = await db().collection("notifications")
        .where("uid", "==", currentUser.uid)
        .limit(50).get();

      $("notificationsContainer").innerHTML = "";

      if (snap.empty) {
        $("notificationsContainer").textContent =
          "You have no notifications yet.";
        return;
      }

      snap.forEach(doc => {
        const item = document.createElement("p");
        item.textContent = doc.data().text || "New notification";
        $("notificationsContainer").appendChild(item);
      });

      if ($("notificationBadge")) {
        $("notificationBadge").textContent = snap.size;
        $("notificationBadge").hidden = snap.empty;
      }
    } catch (error) {
      message("Notifications error: " + error.message, true);
    }
  }

  function bindEvents() {
    bind("loginTab", "click", () => setAuthMode("login"));
    bind("signupTab", "click", () => setAuthMode("signup"));

    bind("authForm", "submit", event => {
      event.preventDefault();
      authMode === "signup" ? register() : login();
    });

    bind("forgotPasswordBtn", "click", resetPassword);
    bind("googleBtn", "click", googleLogin);
    bind("logoutBtn", "click", logout);

    bind("createPostForm", "submit", createPost);
    bind("profileForm", "submit", saveProfile);
    bind("messageForm", "submit", sendMessage);
    bind("communityForm", "submit", createCommunity);

    bind("loadMessagesBtn", "click", loadMessages);
    bind("searchButton", "click", searchContent);
    bind("themeToggle", "click", toggleTheme);

    bind("themeSelect", "change", event =>
      setTheme(event.target.value)
    );

    bind("editProfileBtn", "click", () => {
      $("profileForm").hidden = false;
    });

    bind("cancelProfileEditBtn", "click", () => {
      $("profileForm").hidden = true;
    });

    bind("changePasswordBtn", "click", async () => {
      if (!currentUser?.email) return;

      try {
        await auth().sendPasswordResetEmail(currentUser.email);
        
        message("Password reset email sent.");
      } catch (error) {
        message("Password reset error: " + error.message, true);
      }
    });
  }

  // Start Unitary
  function startApp() {
    setLoading(true);

    try {
      setTheme(localStorage.getItem("unitary_theme") || "light");
    } catch (_) {
      setTheme("light");
    }

    setAuthMode("login");
    bindEvents();
    bindNavigation();

    if (!window.UNITARY_FIREBASE_READY || !window.auth || !window.db) {
      showAuth();
      message("Firebase is not ready. Check config.js.", true);
      return;
    }

    auth().onAuthStateChanged(async user => {
      currentUser = user || null;

      if (!currentUser) {
        showAuth();
        return;
      }

      showApp();
      await loadProfile();
      await loadPosts();
      await loadCommunities();
      await loadNotifications();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp);
  } else {
    startApp();
  }

})();
                
