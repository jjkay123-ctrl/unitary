
(() => {
  "use strict";

  const auth = window.auth;
  const db = window.db;
  const storage = window.storage;

  const $ = id => document.getElementById(id);
  const serverTime = () =>
    firebase.firestore.FieldValue.serverTimestamp();

  let currentUser = null;
  let currentProfile = null;

  function showMessage(text) {
    const el = $("globalMessage");
    if (el) {
      el.textContent = text;
      el.hidden = false;
    } else {
      alert(text);
    }
  }

  function errorMessage(error) {
    console.error(error);
    showMessage(error.message || "Something went wrong.");
  }

  async function register(event) {
    event?.preventDefault();

    const name = $("authDisplayName")?.value.trim();
    const email = $("email")?.value.trim();
    const password = $("password")?.value;
    const confirm = $("confirmPassword")?.value;

    if (!name || !email || !password) {
      return showMessage("Complete all required fields.");
    }

    if (password.length < 6 || password !== confirm) {
      return showMessage("Check your password and confirmation.");
    }

    try {
      const result = await auth.createUserWithEmailAndPassword(
        email, password
      );

      await result.user.updateProfile({ displayName: name });

      await db.collection("users").doc(result.user.uid).set({
        uid: result.user.uid,
        displayName: name,
        username: "user" + result.user.uid.slice(0, 7),
        email,
        bio: "",
        photoURL: "",
        followers: [],
        following: [],
        createdAt: serverTime()
      });

      await result.user.sendEmailVerification();
      showMessage("Account created. Check your email.");
    } catch (error) {
      errorMessage(error);
    }
  }

  async function login(event) {
    event?.preventDefault();

    const email = $("email")?.value.trim();
    const password = $("password")?.value;

    if (!email || !password) {
      return showMessage("Enter your email and password.");
    }

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      errorMessage(error);
    }
  }

  async function googleLogin() {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (error) {
      errorMessage(error);
    }
  }

  async function resetPassword() {
    const email = $("email")?.value.trim();
    if (!email) return showMessage("Enter your email first.");

    try {
      await auth.sendPasswordResetEmail(email);
      showMessage("Password reset email sent.");
    } catch (error) {
      errorMessage(error);
    }
  }

  async function logout() {
    await auth.signOut();
  }

  async function loadProfile() {
    if (!currentUser) return;

    try {
      const snap = await db.collection("users")
        .doc(currentUser.uid).get();

      currentProfile = snap.data() || {};

      if ($("profileDisplayName"))
        $("profileDisplayName").textContent =
          currentProfile.displayName || "";

      if ($("profileUsername"))
        $("profileUsername").textContent =
          "@" + (currentProfile.username || "");

      if ($("profileBio"))
        $("profileBio").textContent = currentProfile.bio || "";
    } catch (error) {
      errorMessage(error);
    }
  }

  async function saveProfile(event) {
    event?.preventDefault();
    if (!currentUser) return;

    try {
      const data = {
        displayName: $("displayName")?.value.trim() || "",
        username: $("username")?.value.trim() || "",
        bio: $("bio")?.value.trim() || ""
      };

      const file = $("profilePicture")?.files?.[0];

      if (file) {
        const ref = storage.ref().child(
          "profiles/" + currentUser.uid + "/" + Date.now()
        );
        await ref.put(file);
        data.photoURL = await ref.getDownloadURL();
      }

      await db.collection("users")
        .doc(currentUser.uid).update(data);

      await currentUser.updateProfile({
        displayName: data.displayName
      });

      await loadProfile();
      showMessage("Profile updated.");
    } catch (error) {
      errorMessage(error);
    }
  }

  async function createPost(event) {
    event?.preventDefault();
    if (!currentUser) return;

    const text = $("postText")?.value.trim() || "";
    const image = $("postImage")?.files?.[0];
    const video = $("postVideo")?.files?.[0];

    if (!text && !image && !video) {
      return showMessage("Write something or select media.");
    }

    try {
      const post = {
        uid: currentUser.uid,
        displayName: currentProfile?.displayName || "User",
        text,
        mediaURL: "",
        mediaType: "",
        likes: [],
        createdAt: serverTime()
      };

      const file = image || video;

      if (file) {
        const ref = storage.ref().child(
          "posts/" + currentUser.uid + "/" + Date.now()
        );
        await ref.put(file);
        post.mediaURL = await ref.getDownloadURL();
        post.mediaType = image ? "image" : "video";
      }

      await db.collection("posts").add(post);

      $("createPostForm")?.reset();
      await loadFeed();
      showMessage("Post published.");
    } catch (error) {
      errorMessage(error);
    }
  }

  async function loadFeed() {
    if (!currentUser) return;

    try {
      const snap = await db.collection("posts")
        .orderBy("createdAt", "desc").limit(30).get();

      const target = $("feedContainer");
      if (!target) return;

      target.replaceChildren();

      snap.forEach(doc => {
        const p = doc.data();
        const article = document.createElement("article");
        article.className = "post-card";

        const title = document.createElement("strong");
        title.textContent = p.displayName || "User";

        const body = document.createElement("p");
        body.textContent = p.text || "";

        article.append(title, body);

        if (p.mediaURL) {
          const media = p.mediaType === "video"
            ? document.createElement("video")
            : document.createElement("img");

          media.src = p.mediaURL;
          if (media.tagName === "VIDEO") {
            media.controls = true;
          } else {
            media.alt = "Post image";
          }
          article.appendChild(media);
        }

        const like = document.createElement("button");
        like.textContent = "Like (" + (p.likes || []).length + ")";
        like.onclick = () => likePost(doc.id);

        article.appendChild(like);
        target.appendChild(article);
      });
    } catch (error) {
      errorMessage(error);
    }
  }

  async function likePost(id) {
    try {
      const ref = db.collection("posts").doc(id);

      await db.runTransaction(async transaction => {
        const snap = await transaction.get(ref);
        if (!snap.exists) return;

        const likes = snap.data().likes || [];
        const next = likes.includes(currentUser.uid)
          ? likes.filter(uid => uid !== currentUser.uid)
          : [...likes, currentUser.uid];

        transaction.update(ref, { likes: next });
      });

      await loadFeed();
    } catch (error) {
      errorMessage(error);
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();

    const recipient = $("recipientUid")?.value.trim();
    const text = $("messageInput")?.value.trim();

    if (!recipient || !text || !currentUser) {
      return showMessage("Enter a recipient and message.");
    }

    try {
      const members = [currentUser.uid, recipient].sort();
      const chatId = members.join("_");

      const chat = db.collection("chats").doc(chatId);

      await chat.set({
        members,
        updatedAt: serverTime()
      }, { merge: true });

      await chat.collection("messages").add({
        uid: currentUser.uid,
        text,
        createdAt: serverTime()
      });

      $("messageInput").value = "";
      showMessage("Message sent.");
    } catch (error) {
      errorMessage(error);
    }
  }

  async function createCommunity(event) {
    event?.preventDefault();
    if (!currentUser) return;

    const name = $("communityName")?.value.trim();
    const description =
      $("communityDescription")?.value.trim() || "";

    if (!name) return showMessage("Enter a community name.");

    try {
      await db.collection("communities").add({
        name,
        description,
        owner: currentUser.uid,
        members: [currentUser.uid],
        createdAt: serverTime()
      });

      showMessage("Community created.");
    } catch (error) {
      errorMessage(error);
    }
  }

  async function loadNotifications() {
    if (!currentUser) return;

    try {
      const snap = await db.collection("notifications")
        .where("uid", "==", currentUser.uid).limit(30).get();

      const target = $("notificationsContainer");
      if (!target) return;

      target.replaceChildren();

      snap.forEach(doc => {
        const item = document.createElement("p");
        item.textContent = doc.data().text || "Notification";
        target.appendChild(item);
      });
    } catch (error) {
      errorMessage(error);
    }
  }

  function applyTheme(theme) {
    const value = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = value;
    document.body.dataset.theme = value;
    localStorage.setItem("unitary-theme", value);
  }

  function navigate(section) {
    document.querySelectorAll("[data-section]").forEach(button => {
      button.classList.toggle(
        "active", button.dataset.section === section
      );
    });

    document.querySelectorAll("[data-page]").forEach(page => {
      page.hidden = page.dataset.page !== section;
    });

    if (section === "home") loadFeed();
    if (section === "profile") loadProfile();
    if (section === "notifications") loadNotifications();
  }

  function setupEvents() {
    $("authForm")?.addEventListener("submit", event => {
      const signup = $("signupTab")?.classList.contains("active");
      signup ? register(event) : login(event);
    });

    $("googleBtn")?.addEventListener("click", googleLogin);
    $("forgotPasswordBtn")?.addEventListener("click", resetPassword);
    $("logoutBtn")?.addEventListener("click", logout);
    $("createPostForm")?.addEventListener("submit", createPost);
    $("profileForm")?.addEventListener("submit", saveProfile);
    $("messageForm")?.addEventListener("submit", sendMessage);
    $("communityForm")?.addEventListener("submit", createCommunity);

    $("themeToggle")?.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme;
      applyTheme(current === "dark" ? "light" : "dark");
    });

    document.querySelectorAll("[data-section]").forEach(button => {
      button.addEventListener("click", () => {
        navigate(button.dataset.section);
      });
    });
  }

  function startApplication(user) {
    currentUser = user;

    db.collection("users").doc(user.uid).get()
      .then(snap => {
        currentProfile = snap.data() || {};

        if (!snap.exists) {
          return db.collection("users").doc(user.uid).set({
            uid: user.uid,
            displayName: user.displayName || "Unitary user",
            username: "user" + user.uid.slice(0, 7),
            email: user.email || "",
            bio: "",
            followers: [],
            following: [],
            createdAt: serverTime()
          });
        }
      })
      .then(() => {
        $("authSection") && ($("authSection").hidden = true);
        $("appSection") && ($("appSection").hidden = false);

        applyTheme(localStorage.getItem("unitary-theme") || "light");
        loadProfile();
        loadFeed();
      })
      .catch(errorMessage);
  }

  function init() {
    if (!auth || !db || !storage) {
      showMessage("Firebase is not initialized. Check config.js.");
      return;
    }

    setupEvents();

    auth.onAuthStateChanged(user => {
      currentUser = user || null;

      if (user) {
        startApplication(user);
      } else {
        $("authSection") && ($("authSection").hidden = false);
        $("appSection") && ($("appSection").hidden = true);
      }
    });
  }

  window.UNITARY_APP = {
    register,
    login,
    logout,
    googleLogin,
    resetPassword,
    createPost,
    loadFeed,
    likePost,
    loadProfile,
    saveProfile,
    sendMessage,
    createCommunity,
    loadNotifications,
    navigate,
    applyTheme
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
    
