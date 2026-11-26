
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const all = (s) => [...document.querySelectorAll(s)];
  const auth = () => window.auth;
  const db = () => window.db;
  const storage = () => window.storage;

  let currentUser = null;
  let recipientUid = "";

  const show = (message) => {
    const el = $("statusMessage");
    if (el) el.textContent = message;
    else alert(message);
  };

  const value = (id) => ($(id)?.value || "").trim();

  async function uploadFile(file, folder) {
    if (!file || !storage()) return "";
    const path = `${folder}/${currentUser.uid}/${Date.now()}_${file.name}`;
    const ref = firebase.storage().ref(path);
    await ref.put(file);
    return await ref.getDownloadURL();
  }

  function navigate(section) {
    all("[data-section-panel]").forEach(panel => {
      panel.hidden = panel.dataset.sectionPanel !== section;
    });
    all("[data-section]").forEach(button => {
      button.classList.toggle("active", button.dataset.section === section);
    });
  }

  function bindNavigation() {
    all("[data-section]").forEach(button => {
      button.addEventListener("click", () => navigate(button.dataset.section));
    });
  }

  async function register() {
    const email = value("registerEmail");
    const password = value("registerPassword");
    const name = value("registerName");
    if (!email || !password || !name) return show("Complete all registration fields.");
    try {
      const result = await auth().createUserWithEmailAndPassword(email, password);
      await result.user.updateProfile({ displayName: name });
      await db().collection("users").doc(result.user.uid).set({
        uid: result.user.uid,
        displayName: name,
        email,
        username: name.toLowerCase().replace(/\s+/g, ""),
        bio: "",
        photoURL: "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      show("Account created successfully.");
    } catch (e) { show(e.message); }
  }

  async function login() {
    try {
      await auth().signInWithEmailAndPassword(
        value("loginEmail"), value("loginPassword")
      );
      show("Signed in successfully.");
    } catch (e) { show(e.message); }
  }

  async function logout() {
    try {
      await auth().signOut();
      show("Signed out.");
    } catch (e) { show(e.message); }
  }

  async function resetPassword() {
    try {
      await auth().sendPasswordResetEmail(value("loginEmail"));
      show("Password reset email sent.");
    } catch (e) { show(e.message); }
  }

  async function loadProfile() {
    if (!currentUser) return;
    const ref = db().collection("users").doc(currentUser.uid);
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : {};
    if ($("profileName")) $("profileName").value = data.displayName || "";
    if ($("profileBio")) $("profileBio").value = data.bio || "";
    if ($("profileUsername")) $("profileUsername").value = data.username || "";
    if ($("profileImage") && data.photoURL) $("profileImage").src = data.photoURL;
  }

  async function saveProfile() {
    try {
      const file = $("profilePhoto")?.files?.[0];
      const photoURL = file ? await uploadFile(file, "profiles") : undefined;
      const data = {
        displayName: value("profileName"),
        bio: value("profileBio"),
        username: value("profileUsername")
      };
      if (photoURL) data.photoURL = photoURL;
      await db().collection("users").doc(currentUser.uid).set(data, { merge: true });
      await currentUser.updateProfile({ displayName: data.displayName });
      show("Profile saved.");
    } catch (e) { show(e.message); }
  }

  async function createPost() {
    const text = value("postText");
    const file = $("postMedia")?.files?.[0];
    if (!text && !file) return show("Write something or select media.");
    try {
      const mediaURL = file ? await uploadFile(file, "posts") : "";
      await db().collection("posts").add({
        uid: currentUser.uid,
        author: currentUser.displayName || "Unitary user",
        text,
        mediaURL,
        mediaType: file?.type || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likes: []
      });
      if ($("postText")) $("postText").value = "";
      if ($("postMedia")) $("postMedia").value = "";
      show("Post published.");
      loadPosts();
    } catch (e) { show(e.message); }
  }

  async function loadPosts() {
    if (!$("feed")) return;
    try {
      const snap = await db().collection("posts")
        .orderBy("createdAt", "desc").limit(30).get();
      $("feed").innerHTML = "";
      snap.forEach(doc => {
        const p = doc.data();
        const article = document.createElement("article");
        article.className = "post-card";
        const heading = document.createElement("h3");
        heading.textContent = p.author || "Unitary user";
        const body = document.createElement("p");
        body.textContent = p.text || "";
        article.append(heading, body);
        if (p.mediaURL) {
          const media = document.createElement(p.mediaType?.startsWith("video/") ? "video" : "img");
          media.src = p.mediaURL;
          if (media.tagName === "VIDEO") media.controls = true;
          media.style.maxWidth = "100%";
          article.append(media);
        }
        const like = document.createElement("button");
        like.textContent = `Like (${(p.likes || []).length})`;
        like.onclick = () => toggleLike(doc.id, p.likes || []);
        article.append(like);
        $("feed").append(article);
      });
    } catch (e) { show(e.message); }
  }

  async function toggleLike(id, likes) {
    try {
      const ref = db().collection("posts").doc(id);
      const already = likes.includes(currentUser.uid);
      await ref.update({
        likes: already
          ? firebase.firestore.FieldValue.arrayRemove(currentUser.uid)
          : firebase.firestore.FieldValue.arrayUnion(currentUser.uid)
      });
      loadPosts();
    } catch (e) { show(e.message); }
  }

  async function searchUsers() {
    const term = value("userSearch").toLowerCase();
    if (!term || !$("searchResults")) return;
    try {
      const snap = await db().collection("users").get();
      $("searchResults").innerHTML = "";
      snap.forEach(doc => {
        const u = doc.data();
        if (doc.id === currentUser.uid) return;
        if ((u.username || "").toLowerCase().includes(term) ||
            (u.displayName || "").toLowerCase().includes(term)) {
          const item = document.createElement("div");
          const name = document.createElement("span");
          name.textContent = u.displayName || u.username || "User";
          const button = document.createElement("button");
          button.textContent = "Message";
          button.onclick = () => {
            recipientUid = doc.id;
            if ($("recipientUid")) $("recipientUid").value = doc.id;
            navigate("messages");
            loadMessages();
          };
          item.append(name, button);
          $("searchResults").append(item);
        }
      });
    } catch (e) { show(e.message); }
  }

  function chatId(a, b) {
    return [a, b].sort().join("_");
  }

  async function sendMessage() {
    const to = value("recipientUid") || recipientUid;
    const message = value("messageText");
    if (!to || !message) return show("Enter the recipient UID and a message.");
    try {
      await db().collection("chats").doc(chatId(currentUser.uid, to))
        .collection("messages").add({
          from: currentUser.uid,
          to,
          text: message,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      $("messageText").value = "";
      recipientUid = to;
      loadMessages();
    } catch (e) { show(e.message); }
  }

  async function loadMessages() {
    const to = value("recipientUid") || recipientUid;
    if (!to || !$("messageList")) return show("Enter a recipient UID first.");
    recipientUid = to;
    try {
      const snap = await db().collection("chats").doc(chatId(currentUser.uid, to))
        .collection("messages").orderBy("createdAt").limit(100).get();
      $("messageList").innerHTML = "";
      snap.forEach(doc => {
        const p = document.createElement("p");
        const m = doc.data();
        p.textContent = `${m.from === currentUser.uid ? "You" : "Them"}: ${m.text}`;
        $("messageList").append(p);
      });
    } catch (e) { show(e.message); }
  }

  async function createCommunity() {
    const name = value("communityName");
    if (!name) return show("Enter a community name.");
    try {
      await db().collection("communities").add({
        name,
        description: value("communityDescription"),
        owner: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      show("Community created.");
      loadCommunities();
    } catch (e) { show(e.message); }
  }

  async function loadCommunities() {
    if (!$("communityList")) return;
    try {
      const snap = await db().collection("communities").limit(50).get();
      $("communityList").innerHTML = "";
      snap.forEach(doc => {
        const p = document.createElement("p");
        p.textContent = doc.data().name;
        $("communityList").append(p);
      });
    } catch (e) { show(e.message); }
  }

  async function loadNotifications() {
    if (!$("notificationList")) return;
    try {
      const snap = await db().collection("notifications")
        .where("uid", "==", currentUser.uid).limit(50).get();
      $("notificationList").innerHTML = "";
      snap.forEach(doc => {
        const p = document.createElement("p");
        p.textContent = doc.data().text || "New notification";
        $("notificationList").append(p);
      });
    } catch (e) { show(e.message); }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("unitary-theme", theme);
  }

  function bind(id, event, fn) {
    if ($(id)) $(id).addEventListener(event, fn);
  }

  function start() {
    if (!window.UNITARY_FIREBASE_READY || !auth() || !db()) {
      show("Firebase is not ready. Check config.js and Firebase setup.");
      return;
    }

    bindNavigation();
    bind("registerBtn", "click", register);
    bind("loginBtn", "click", login);
    bind("logoutBtn", "click", logout);
    bind("resetPasswordBtn", "click", resetPassword);
    bind("saveProfileBtn", "click", saveProfile);
    bind("createPostBtn", "click", createPost);
    bind("searchUsersBtn", "click", searchUsers);
    bind("sendMessageBtn", "click", sendMessage);
    bind("loadMessagesBtn", "click", loadMessages);
    bind("createCommunityBtn", "click", createCommunity);
    bind("loadNotificationsBtn", "click", loadNotifications);
    bind("lightThemeBtn", "click", () => setTheme("light"));
    bind("darkThemeBtn", "click", () => setTheme("dark"));

    setTheme(localStorage.getItem("unitary-theme") || "light");

    auth().onAuthStateChanged(async user => {
      currentUser = user;
      all("[data-auth-only]").forEach(el => el.hidden = !user);
      all("[data-guest-only]").forEach(el => el.hidden = !!user);
      if (user) {
        try {
          await loadProfile();
          await loadPosts();
          await loadCommunities();
          await loadNotifications();
          navigate("home");
          show("Welcome to Unitary.");
        } catch (e) { show(e.message); }
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
