
(() => {
  "use strict";

  const auth = window.auth;
  const db = window.db;
  const storage = window.storage;
  const $ = id => document.getElementById(id);
  const serverTime = () => firebase.firestore.FieldValue.serverTimestamp();

  let currentUser = null;
  let currentProfile = {};
  let activeRecipient = "";

  function message(text) {
    const box = $("globalMessage");
    if (box) {
      box.textContent = text;
      box.hidden = false;
      clearTimeout(message.timer);
      message.timer = setTimeout(() => box.hidden = true, 6000);
    } else {
      alert(text);
    }
  }

  function report(error) {
    console.error(error);
    message(error?.message || "Something went wrong. Please try again.");
  }

  function setAuthMode(mode) {
    const signup = mode === "signup";
    $("loginTab")?.classList.toggle("active", !signup);
    $("signupTab")?.classList.toggle("active", signup);
    if ($("displayNameGroup")) $("displayNameGroup").hidden = !signup;
    if ($("confirmPasswordGroup")) $("confirmPasswordGroup").hidden = !signup;
    if ($("authDisplayName")) $("authDisplayName").required = signup;
    if ($("confirmPassword")) $("confirmPassword").required = signup;
    if ($("password")) $("password").autocomplete = signup ? "new-password" : "current-password";
    if ($("submitBtn")) $("submitBtn").textContent = signup ? "Create account" : "Log in";
    if ($("forgotPasswordBtn")) $("forgotPasswordBtn").hidden = signup;
  }

  async function register(event) {
    event?.preventDefault();
    const name = $("authDisplayName")?.value.trim();
    const email = $("email")?.value.trim();
    const password = $("password")?.value || "";
    const confirm = $("confirmPassword")?.value || "";

    if (!name || !email || password.length < 8 || password !== confirm) {
      return message("Enter your name, a valid email, a password of at least 8 characters, and matching confirmation.");
    }

    try {
      const result = await auth.createUserWithEmailAndPassword(email, password);
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
        isPrivate: false,
        createdAt: serverTime()
      });
      try {
        await result.user.sendEmailVerification();
        message("Your account has been created. You can use Unitary now. Please check your email for verification.");
      } catch (emailError) {
        console.warn("Verification email could not be sent:", emailError);
        message("Your account was created, but the verification email could not be sent. You can request it later.");
      }
    } catch (error) {
      report(error);
    }
  }

  async function login(event) {
    event?.preventDefault();
    const email = $("email")?.value.trim();
    const password = $("password")?.value || "";
    if (!email || !password) return message("Enter your email and password.");

    try {
      await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
      report(error);
    }
  }

  async function googleLogin() {
    try {
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
    } catch (error) {
      report(error);
    }
  }

  async function resetPassword() {
    const email = $("email")?.value.trim();
    if (!email) return message("Enter your email address first.");
    try {
      await auth.sendPasswordResetEmail(email);
      message("Password reset email sent. Check your inbox.");
    } catch (error) {
      report(error);
    }
  }

  async function logout() {
    try {
      await auth.signOut();
    } catch (error) {
      report(error);
    }
  }

  async function ensureProfile(user) {
    const ref = db.collection("users").doc(user.uid);
    const snap = await ref.get();

    if (!snap.exists) {
      await ref.set({
        uid: user.uid,
        displayName: user.displayName || "Unitary user",
        username: "user" + user.uid.slice(0, 7),
        email: user.email || "",
        bio: "",
        photoURL: user.photoURL || "",
        followers: [],
        following: [],
        isPrivate: false,
        createdAt: serverTime()
      });
    }

    const updated = await ref.get();
    currentProfile = updated.data() || {};
  }

  async function loadProfile() {
    if (!currentUser) return;
    try {
      const snap = await db.collection("users").doc(currentUser.uid).get();
      currentProfile = snap.data() || {};

      if ($("profileDisplayName")) $("profileDisplayName").textContent = currentProfile.displayName || "Unitary user";
      if ($("profileUsername")) $("profileUsername").textContent = "@" + (currentProfile.username || "");
      if ($("profileBio")) $("profileBio").textContent = currentProfile.bio || "";
      if ($("profileAvatar") && currentProfile.photoURL) $("profileAvatar").src = currentProfile.photoURL;
      if ($("followerCount")) $("followerCount").textContent = (currentProfile.followers || []).length;
      if ($("followingCount")) $("followingCount").textContent = (currentProfile.following || []).length;

      if ($("displayName")) $("displayName").value = currentProfile.displayName || "";
      if ($("username")) $("username").value = currentProfile.username || "";
      if ($("bio")) $("bio").value = currentProfile.bio || "";
      if ($("isPrivate")) $("isPrivate").checked = !!currentProfile.isPrivate;
      if ($("settingsEmail")) $("settingsEmail").textContent = currentUser.email || "";
    } catch (error) {
      report(error);
    }
  }

  async function saveProfile(event) {
    event?.preventDefault();
    if (!currentUser) return;

    try {
      const data = {
        displayName: $("displayName")?.value.trim() || "",
        username: ($("username")?.value.trim() || "").replace(/^@/, ""),
        bio: $("bio")?.value.trim() || "",
        isPrivate: !!$("isPrivate")?.checked
      };

      if (!data.displayName || !data.username) {
        return message("Display name and username are required.");
      }

      const file = $("profilePicture")?.files?.[0];
      if (file) {
        if (!file.type.startsWith("image/")) return message("Please select an image file.");
        if (file.size > 5 * 1024 * 1024) return message("Profile images must be 5 MB or smaller.");
        const ref = storage.ref().child("profiles/" + currentUser.uid + "/" + Date.now());
        await ref.put(file);
        data.photoURL = await ref.getDownloadURL();
      }

      await db.collection("users").doc(currentUser.uid).update(data);
      await currentUser.updateProfile({ displayName: data.displayName });
      await loadProfile();
      if ($("profileForm")) $("profileForm").hidden = true;
      message("Profile updated.");
    } catch (error) {
      report(error);
    }
  }

  async function createPost(event) {
    event?.preventDefault();
    if (!currentUser) return;

    const text = $("postText")?.value.trim() || "";
    const image = $("postImage")?.files?.[0];
    const video = $("postVideo")?.files?.[0];
    if (!text && !image && !video) return message("Write something or select an image or video.");
    if (image && video) return message("Please choose either an image or a video for each post.");

    try {
      const post = {
        uid: currentUser.uid,
        displayName: currentProfile.displayName || currentUser.displayName || "User",
        username: currentProfile.username || "",
        text,
        mediaURL: "",
        mediaType: "",
        likes: [],
        createdAt: serverTime()
      };

      const file = image || video;
      if (file) {
        const allowed = image ? file.type.startsWith("image/") : file.type.startsWith("video/");
        if (!allowed) return message("The selected file type is not supported.");
        const maxSize = image ? 10 : 100;
        if (file.size > maxSize * 1024 * 1024) return message("The selected file is too large. Maximum size: " + maxSize + " MB.");
        const ref = storage.ref().child("posts/" + currentUser.uid + "/" + Date.now() + "_" + file.name);
        await ref.put(file);
        post.mediaURL = await ref.getDownloadURL();
        post.mediaType = image ? "image" : "video";
      }

      await db.collection("posts").add(post);
      $("createPostForm")?.reset();
      await loadFeed();
      message("Post published.");
    } catch (error) {
      report(error);
    }
  }

  async function loadFeed() {
    if (!currentUser) return;
    const target = $("feedContainer");
    if (!target) return;

    try {
      const snap = await db.collection("posts").orderBy("createdAt", "desc").limit(40).get();
      target.replaceChildren();

      if (snap.empty) {
        target.textContent = "No posts yet. Be the first to share something.";
        return;
      }

      snap.forEach(doc => {
        const post = doc.data();
        const article = document.createElement("article");
        article.className = "post-card";

        const heading = document.createElement("strong");
        heading.textContent = post.displayName || "Unitary user";

        const body = document.createElement("p");
        body.textContent = post.text || "";
        article.append(heading, body);

        if (post.mediaURL) {
          const media = document.createElement(post.mediaType === "video" ? "video" : "img");
          media.src = post.mediaURL;
          if (media.tagName === "VIDEO") media.controls = true;
          else media.alt = "Post image";
          media.loading = "lazy";
          article.appendChild(media);
        }

        const like = document.createElement("button");
        const likes = post.likes || [];
        like.textContent = (likes.includes(currentUser.uid) ? "Unlike" : "Like") + " (" + likes.length + ")";
        like.type = "button";
        like.addEventListener("click", () => likePost(doc.id));
        article.appendChild(like);

        target.appendChild(article);
      });
    } catch (error) {
      report(error);
    }
  }

  async function likePost(id) {
    if (!currentUser) return;
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
      report(error);
    }
  }

  async function searchUsers() {
    const term = $("searchInput")?.value.trim().replace(/^@/, "");
    const target = $("searchResults");
    if (!term || !target) return message("Enter a name or username to search.");

    try {
      target.textContent = "Searching...";
      const [byUsername, byName] = await Promise.all([
        db.collection("users").where("username", "==", term).limit(10).get(),
        db.collection("users").where("displayName", "==", term).limit(10).get()
      ]);

      const results = new Map();
      byUsername.forEach(doc => results.set(doc.id, doc));
      byName.forEach(doc => results.set(doc.id, doc));
      target.replaceChildren();

      if (!results.size) {
        target.textContent = "No matching users found. Search exact usernames or display names.";
        return;
      }

      results.forEach(doc => {
        if (doc.id === currentUser.uid) return;
        const data = doc.data();
        const item = document.createElement("div");
        item.className = "content-card";
        const name = document.createElement("strong");
        name.textContent = data.displayName || "Unitary user";
        const username = document.createElement("p");
        username.textContent = "@" + (data.username || "");
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = "Message";
        button.addEventListener("click", () => {
          $("recipientUid").value = doc.id;
          activeRecipient = doc.id;
          navigate("messages");
          loadMessages();
        });
        item.append(name, username, button);
        target.appendChild(item);
      });
    } catch (error) {
      report(error);
    }
  }

  async function sendMessage(event) {
    event?.preventDefault();
    if (!currentUser) return;

    const recipient = $("recipientUid")?.value.trim();
    const text = $("messageInput")?.value.trim();
    if (!recipient || !text) return message("Enter the recipient's user ID and a message.");
    if (recipient === currentUser.uid) return message("You cannot send a message to yourself.");

    try {
      const members = [currentUser.uid, recipient].sort();
      const chatId = members.join("_");
      const chat = db.collection("chats").doc(chatId);

      await chat.set({ members, updatedAt: serverTime() }, { merge: true });
      await chat.collection("messages").add({
        uid: currentUser.uid,
        text,
        createdAt: serverTime()
      });

      $("messageInput").value = "";
      activeRecipient = recipient;
      await loadMessages();
      message("Message sent.");
    } catch (error) {
      report(error);
    }
  }

  async function loadMessages() {
    if (!currentUser) return;
    const recipient = $("recipientUid")?.value.trim() || activeRecipient;
    const target = $("messagesContainer");
    if (!recipient || !target) return;

    activeRecipient = recipient;
    try {
      const chatId = [currentUser.uid, recipient].sort().join("_");
      const snap = await db.collection("chats").doc(chatId)
        .collection("messages").orderBy("createdAt", "asc").limit(100).get();

      target.replaceChildren();
      if (snap.empty) {
        target.textContent = "No messages in this conversation yet.";
        return;
      }

      snap.forEach(doc => {
        const data = doc.data();
        const line = document.createElement("p");
        line.className = data.uid === currentUser.uid ? "my-message" : "their-message";
        line.textContent = (data.uid === currentUser.uid ? "You: " : "Them: ") + data.text;
        target.appendChild(line);
      });
    } catch (error) {
      report(error);
    }
  }

  async function createCommunity(event) {
    event?.preventDefault();
    if (!currentUser) return;
    const name = $("communityName")?.value.trim();
    const description = $("communityDescription")?.value.trim() || "";
    if (!name) return message("Enter a community name.");

    try {
      await db.collection("communities").add({
        name,
        description,
        owner: currentUser.uid,
        members: [currentUser.uid],
        createdAt: serverTime()
      });
      $("communityForm")?.reset();
      message("Community created.");
      await loadCommunities();
    } catch (error) {
      report(error);
    }
  }

  async function loadCommunities() {
    const target = $("communitiesContainer");
    if (!target || !currentUser) return;
    try {
      const snap = await db.collection("communities").orderBy("createdAt", "desc").limit(30).get();
      target.replaceChildren();
      if (snap.empty) {
        target.textContent = "No communities yet.";
        return;
      }
      snap.forEach(doc => {
        const data = doc.data();
        const card = document.createElement("div");
        card.className = "content-card";
        const title = document.createElement("h3");
        title.textContent = data.name || "Community";
        const desc = document.createElement("p");
        desc.textContent = data.description || "";
        card.append(title, desc);
        target.appendChild(card);
      });
    } catch (error) {
      report(error);
    }
  }

  async function loadNotifications() {
    if (!currentUser) return;
    const target = $("notificationsContainer");
    if (!target) return;
    try {
      const snap = await db.collection("notifications")
        .where("uid", "==", currentUser.uid).limit(30).get();
      target.replaceChildren();
      if (snap.empty) {
        target.textContent = "You're all caught up.";
        return;
      }
      snap.forEach(doc => {
        const item = document.createElement("p");
        item.textContent = doc.data().text || "Notification";
        target.appendChild(item);
      });
    } catch (error) {
      report(error);
    }
  }

  function applyTheme(theme) {
    const value = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = value;
    document.body.dataset.theme = value;
    try {
      localStorage.setItem("unitary_theme", value);
    } catch (error) {
      console.warn("Theme preference could not be saved.", error);
    }
    if ($("themeSelect")) $("themeSelect").value = value;
  }

  function navigate(section) {
    document.querySelectorAll("[data-section]").forEach(button => {
      button.classList.toggle("active", button.dataset.section === section);
    });
    document.querySelectorAll("[data-section-panel]").forEach(panel => {
      panel.hidden = panel.dataset.sectionPanel !== section;
    });

    if (section === "home") loadFeed();
    if (section === "profile") loadProfile();
    if (section === "notifications") loadNotifications();
    if (section === "communities") loadCommunities();
    if (section === "messages") loadMessages();
  }

  function setupEvents() {
    $("authForm")?.addEventListener("submit", event => {
      if ($("signupTab")?.classList.contains("active")) register(event);
      else login(event);
    });

    $("loginTab")?.addEventListener("click", () => setAuthMode("login"));
    $("signupTab")?.addEventListener("click", () => setAuthMode("signup"));
    $("googleBtn")?.addEventListener("click", googleLogin);
    $("forgotPasswordBtn")?.addEventListener("click", resetPassword);
    $("logoutBtn")?.addEventListener("click", logout);
    $("createPostForm")?.addEventListener("submit", createPost);
    $("profileForm")?.addEventListener("submit", saveProfile);
    $("messageForm")?.addEventListener("submit", sendMessage);
    $("communityForm")?.addEventListener("submit", createCommunity);
    $("searchButton")?.addEventListener("click", searchUsers);

    $("searchInput")?.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        searchUsers();
        navigate("discover");
      }
    });

    $("editProfileBtn")?.addEventListener("click", () => {
      if ($("profileForm")) $("profileForm").hidden = false;
    });

    $("cancelProfileEditBtn")?.addEventListener("click", () => {
      if ($("profileForm")) $("profileForm").hidden = true;
    });

    $("themeToggle")?.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme;
      applyTheme(current === "dark" ? "light" : "dark");
    });

    $("themeSelect")?.addEventListener("change", event => applyTheme(event.target.value));

    $("profilePicture")?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (file && $("avatarPreview")) $("avatarPreview").src = URL.createObjectURL(file);
    });

    $("recipientUid")?.addEventListener("change", loadMessages);

    document.querySelectorAll("[data-section]").forEach(button => {
      button.addEventListener("click", () => navigate(button.dataset.section));
    });
  }

  async function startApplication(user) {
    currentUser = user;
    try {
      await ensureProfile(user);
      $("authSection").hidden = true;
      $("appSection").hidden = false;
      $("loadingScreen") && ($("loadingScreen").hidden = true);
      applyTheme(localStorage.getItem("unitary_theme") || "light");
      await loadProfile();
      await loadFeed();
      navigate("home
