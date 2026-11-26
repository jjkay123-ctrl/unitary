
/* =========================================================
   UNITARY — APPLICATION ENGINE
   Firebase Compat SDK
   Version 2.0
   ========================================================= */

"use strict";

(function () {
  const $ = id => document.getElementById(id);

  const state = {
    user: null,
    profile: {},
    signup: false,
    recipient: null,
    chatId: null,
    theme: "light"
  };

  const auth = () => window.auth;
  const db = () => window.db;
  const storage = () => window.storage;

  const serverTime = () =>
    firebase.firestore.FieldValue.serverTimestamp();

  function notify(message, type = "info") {
    const el = $("globalMessage");
    if (!el) {
      console.log(message);
      return;
    }

    el.textContent = message;
    el.dataset.kind = type;
    el.hidden = false;

    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => {
      el.hidden = true;
    }, 4500);
  }

  function show(id, visible) {
    if ($(id)) $(id).hidden = !visible;
  }

  function clear(id) {
    if ($(id)) $(id).replaceChildren();
  }

  function element(tag, value, className = "") {
    const el = document.createElement(tag);
    el.textContent = value || "";
    el.className = className;
    return el;
  }

  function addButton(parent, label, action) {
    const btn = element("button", label);
    btn.type = "button";
    btn.addEventListener("click", action);
    parent.append(btn);
    return btn;
  }

  function reportError(error) {
    console.error("Unitary error:", error);
    notify(error.message || "An unexpected error occurred.", "error");
  }

  function checkFirebase() {
    if (!auth() || !db() || !storage()) {
      throw new Error(
        "Firebase is not ready. Check config.js and Firebase setup."
      );
    }
  }

  function userRef(uid = state.user.uid) {
    return db().collection("users").doc(uid);
  }

  function dateText(value) {
    if (!value) return "";
    const date = value.toDate
      ? value.toDate()
      : new Date(value);

    return isNaN(date.getTime())
      ? ""
      : date.toLocaleString();
  }

  /* =========================================================
     AUTHENTICATION
     ========================================================= */

  function setAuthMode(signup) {
    state.signup = signup;

    show("displayNameGroup", signup);
    show("confirmPasswordGroup", signup);
    show("forgotPasswordBtn", !signup);

    if ($("loginTab")) {
      $("loginTab").classList.toggle("active", !signup);
    }

    if ($("signupTab")) {
      $("signupTab").classList.toggle("active", signup);
    }

    if ($("submitBtn")) {
      $("submitBtn").textContent =
        signup ? "Create account" : "Log in";
    }
  }

  async function handleAuthentication(event) {
    event.preventDefault();

    try {
      checkFirebase();

      const email = $("email").value.trim();
      const password = $("password").value;

      if (state.signup) {
        if (password !== $("confirmPassword").value) {
          throw new Error("Passwords do not match.");
        }

        const credential =
          await auth().createUserWithEmailAndPassword(
            email,
            password
          );

        const name =
          $("authDisplayName").value.trim() ||
          email.split("@")[0];

        await credential.user.updateProfile({
          displayName: name
        });

        await userRef(credential.user.uid).set({
          displayName: name,
          username:
            "user" + credential.user.uid.slice(0, 8),
          bio: "",
          photoURL: "",
          private: false,
          createdAt: serverTime()
        });

      } else {
        await auth().signInWithEmailAndPassword(
          email,
          password
        );
      }

    } catch (error) {
      if ($("message")) {
        $("message").hidden = false;
        $("message").textContent = error.message;
      } else {
        reportError(error);
      }
    }
  }

  async function googleLogin() {
    try {
      checkFirebase();

      const provider =
        new firebase.auth.GoogleAuthProvider();

      await auth().signInWithPopup(provider);

    } catch (error) {
      reportError(error);
    }
  }

  async function resetPassword() {
    const email = $("email").value.trim();

    if (!email) {
      return notify("Enter your email address first.", "warning");
    }

    try {
      await auth().sendPasswordResetEmail(email);
      notify("Password reset email sent.", "success");
    } catch (error) {
      reportError(error);
    }
  }

  /* =========================================================
     PROFILE
     ========================================================= */

  async function loadProfile() {
    const ref = userRef();
    const snap = await ref.get();

    if (!snap.exists) {
      state.profile = {
        displayName:
          state.user.displayName ||
          state.user.email.split("@")[0],
        username: "user" + state.user.uid.slice(0, 8),
        bio: "",
        photoURL: "",
        private: false
      };

      await ref.set(state.profile);
    } else {
      state.profile = snap.data();
    }

    renderProfile();
  }

  function renderProfile() {
    const p = state.profile;

    if ($("profileDisplayName")) {
      $("profileDisplayName").textContent =
        p.displayName || "Unitary member";
    }

    if ($("profileUsername")) {
      $("profileUsername").textContent =
        "@" + (p.username || "member");
    }

    if ($("profileBio")) {
      $("profileBio").textContent =
        p.bio || "No biography yet.";
    }

    if ($("profileAvatar")) {
      $("profileAvatar").src =
        p.photoURL ||
        "https://placehold.co/160x160?text=Profile";
    }

    if ($("displayName")) {
      $("displayName").value = p.displayName || "";
    }

    if ($("username")) {
      $("username").value = p.username || "";
    }

    if ($("bio")) {
      $("bio").value = p.bio || "";
    }

    if ($("isPrivate")) {
      $("isPrivate").checked = !!p.private;
    }

    if ($("settingsEmail")) {
      $("settingsEmail").textContent =
        state.user.email || "";
    }
  }

  async function uploadFile(file, folder) {
    if (!file) return "";

    const isVideo = folder === "postVideos";
    const maximum = isVideo
      ? 50 * 1024 * 1024
      : 8 * 1024 * 1024;

    if (file.size > maximum) {
      throw new Error("The selected file is too large.");
    }

    const safeName = file.name.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );

    const path =
      folder + "/" +
      state.user.uid + "/" +
      Date.now() + "_" + safeName;

    const reference = storage().ref().child(path);

    await reference.put(file);

    return await reference.getDownloadURL();
  }

  async function saveProfile(event) {
    event.preventDefault();

    try {
      const file = $("profilePicture").files[0];

      const photoURL = file
        ? await uploadFile(file, "profilePictures")
        : state.profile.photoURL || "";

      const displayName =
        $("displayName").value.trim();

      const username =
        $("username").value.trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 25);

      if (!displayName || !username) {
        throw new Error(
          "Display name and username are required."
        );
      }

      const updated = {
        displayName: displayName.slice(0, 50),
        username,
        bio: $("bio").value.trim().slice(0, 250),
        photoURL,
        private: $("isPrivate").checked,
        updatedAt: serverTime()
      };

      await userRef().set(updated, { merge: true });

      state.profile = {
        ...state.profile,
        ...updated
      };

      renderProfile();
      show("profileForm", false);

      notify("Profile saved successfully.", "success");

    } catch (error) {
      reportError(error);
    }
  }

  /* =========================================================
     NAVIGATION AND THEMES
     ========================================================= */

  function navigate(section) {
    const allowed = [
      "home", "discover", "messages",
      "communities", "notifications",
      "saved", "profile", "settings",
      "support", "calls"
    ];

    state.section = allowed.includes(section)
      ? section
      : "home";

    document.querySelectorAll(
      "[data-section-panel]"
    ).forEach(panel => {
      panel.hidden =
        panel.dataset.sectionPanel !== state.section;
    });

    document.querySelectorAll(
      "[data-section]"
    ).forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.section === state.section
      );
    });

    if (state.section === "messages") loadConversations();
    if (state.section === "profile") loadProfilePosts();
    if (state.section === "saved") loadSavedPosts();
    if (state.section === "notifications") loadNotifications();
    if (state.section === "communities") loadCommunities();
  }

  function setTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";

    document.documentElement.dataset.theme =
      state.theme;

    try {
      localStorage.setItem(
        "unitary_theme",
        state.theme
      );
    } catch (_) {}

    if ($("themeSelect")) {
      $("themeSelect").value = state.theme;
    }
  }

  /* =========================================================
     POSTS AND COMMUNITY FEED
     ========================================================= */

  function createPostCard(id, post, saved = false) {
    const card = element("article", "", "content-card");

    const heading = element(
      "strong",
      post.authorName || "Unitary member"
    );

    card.append(heading);

    card.append(
      element("small", " · " + dateText(post.createdAt))
    );

    if (post.text) {
      card.append(element("p", post.text));
    }

    if (post.mediaURL) {
      const media =
        post.mediaType === "video"
          ? document.createElement("video")
          : document.createElement("img");

      media.src = post.mediaURL;
      media.style.maxWidth = "100%";
      media.style.maxHeight = "480px";

      if (post.mediaType === "video") {
        media.controls = true;
      } else {
        media.alt = "Post image";
      }

      card.append(media);
    }

    const actions = element("div", "", "post-actions");

    const likes = Array.isArray(post.likes)
      ? post.likes
      : [];

    const liked = likes.includes(state.user.uid);

    addButton(
      actions,
      (liked ? "Unlike" : "Like") +
        " (" + likes.length + ")",
      () => toggleLike(id, post)
    );

    addButton(
      actions,
      saved ? "Remove saved" : "Save",
      () => toggleSave(id, post)
    );

    if (post.uid === state.user.uid) {
      addButton(
        actions,
        "Delete",
        () => deletePost(id)
      );
    }

    addButton(
      actions,
      "Report",
      () => reportPost(id)
    );

    card.append(actions);

    return card;
  }

  async function loadFeed() {
    if (!$("feedContainer")) return;

    clear("feedContainer");

    try {
      const snap = await db()
        .collection("posts")
        .orderBy("createdAt", "desc")
        .limit(40)
        .get();

      if (snap.empty) {
        $("feedContainer").append(
          element("p", "No posts yet. Share something!")
        );
      }

      snap.forEach(doc => {
        $("feedContainer").append(
          createPostCard(doc.id, doc.data())
        );
      });

    } catch (error) {
      console.error(error);

      $("feedContainer").append(
        element("p", "Feed could not load.")
      );
    }
  }

  async function publishPost(event) {
    event.preventDefault();

    const content = $("postText").value.trim();
    const image = $("postImage").files[0];
    const video = $("postVideo").files[0];

    if (!content && !image && !video) {
      return notify("Write something or attach a file.");
    }

    if (image && video) {
      return notify(
        "Attach an image or a video, not both.",
        "warning"
      );
    }

    try {
      const file = image || video;

      const mediaURL = file
        ? await uploadFile(
            file,
            image ? "postImages" : "postVideos"
          )
        : "";

      await db().collection("posts").add({
        uid: state.user.uid,
        authorName:
          state.profile.displayName || "Unitary member",
        text: content,
        mediaURL,
        mediaType:
          image ? "image" : video ? "video" : "",
        likes: [],
        createdAt: serverTime()
      });

      $("createPostForm").reset();

      notify("Post published successfully.", "success");

      await loadFeed();

    } catch (error) {
      reportError(error);
    }
  }

  async function toggleLike(id, post) {
    try {
      const likes = Array.isArray(post.likes)
        ? post.likes.slice()
        : [];

      const index = likes.indexOf(state.user.uid);

      if (index === -1) {
        likes.push(state.user.uid);
      } else {
        likes.splice(index, 1);
      }

      await db().collection("posts")
        .doc(id)
        .update({ likes });

      await loadFeed();

    } catch (error) {
      reportError(error);
    }
  }

  async function toggleSave(id, post) {
    try {
      const ref = userRef()
        .collection("saved")
        .doc(id);

      const snap = await ref.get();

      if (snap.exists) {
        await ref.delete();
      } else {
        await ref.set({
          ...post,
          postId: id,
          savedAt: serverTime()
        });
      }

      notify(
        snap.exists ? "Post removed." : "Post saved.",
        "success"
      );

      if (state.section === "saved") {
        loadSavedPosts();
      }

    } catch (error) {
      reportError(error);
    }
  }

  async function deletePost(id) {
    if (!confirm("Delete this post?")) return;

    try {
      await db().collection("posts").doc(id).delete();
      notify("Post deleted.", "success");
      await loadFeed();

    } catch (error) {
      reportError(error);
    }
  }

  async function reportPost(id) {
    const reason = prompt(
      "Why are you reporting this post?"
    );

    if (!reason || !reason.trim()) return;

    try {
      await db().collection("reports").add({
        postId: id,
        reporterUid: state.user.uid,
        reason: reason.trim().slice(0, 500),
        status: "pending",
        createdAt: serverTime()
      });

      notify("Report submitted.", "success");

    } catch (error) {
      reportError(error);
    }
  }

  async function loadSavedPosts() {
    if (!$("savedPostsContainer")) return;

    clear("savedPostsContainer");

    try {
      const snap = await userRef()
        .collection("saved")
        .limit(50)
        .get();

      if (snap.empty) {
        $("savedPostsContainer").append(
          element("p", "No saved posts yet.")
        );
      }

      snap.forEach(doc => {
        $("savedPostsContainer").append(
          createPostCard(doc.id, doc.data(), true)
        );
      });

    } catch (error) {
      reportError(error);
    }
  }

  async function loadProfilePosts() {
    if (!$("profilePosts")) return;

    clear("profilePosts");

    try {
      const snap = await db()
        .collection("posts")
        .where("uid", "==", state.user.uid)
        .limit(30)
        .get();

      snap.forEach(doc => {
        $("profilePosts").append(
          createPostCard(doc.id, doc.data())
        );
      });

    } catch (error) {
      console.warn(error);
    }
  }

  /* =========================================================
     DISCOVER AND SEARCH
     ========================================================= */

  async function searchUsers() {
    const query = $("searchInput").value
      .trim()
      .toLowerCase();

    navigate("discover");
    clear("searchResults");

    if (!query) return;

    try {
      const snap = await db()
        .collection("users")
        .limit(100)
        .get();

      let found = 0;

      snap.forEach(doc => {
        const p = doc.data();

        if (
          doc.id !== state.user.uid &&
          (
            (p.displayName || "").toLowerCase().includes(query) ||
            (p.username || "").toLowerCase().includes(query)
          )
        ) {
          found++;

          const card = element("div", "", "content-card");

          card.append(
            element("strong", p.displayName || "Member")
          );

          card.append(
            element("p", "@" + (p.username || "member"))
          );

          $("searchResults").append(card);
        }
      });

      if (!found) {
        $("searchResults").append(
          element("p", "No matching users found.")
        );
      }

    } catch (error) {
      reportError(error);
    }
  }

  /* =========================================================
     COMMUNITIES
     ========================================================= */

  async function loadCommunities() {
    if (!$("communitiesContainer")) return;

    clear("communitiesContainer");

    try {
      const snap = await db()
        .collection("communities")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      if (snap.empty) {
        $("communitiesContainer").append(
          element("p", "No communities available yet.")
        );
      }

      snap.forEach(doc => {
        const community = doc.data();
        const card = element("div", "", "content-card");

        card.append(element("h3", community.name));
        card.append(element("p", community.description || ""));

        addButton(card, "Join community", async () => {
          try {
            await doc.ref
              .collection("members")
              .doc(state.user.uid)
              .set({
                joinedAt: serverTime()
              });

            notify("You joined the community.", "success");

          } catch (error) {
            reportError(error);
          }
        });

        $("communitiesContainer").append(card);
      });

    } catch (error) {
      reportError(error);
    }
  }

  async function createCommunity(event) {
    event.preventDefault();

    const name = $("communityName").value.trim();

    if (!name) return;

    try {
      await db().collection("communities").add({
        name: name.slice(0, 60),
        description:
          $("communityDescription").value.trim().slice(0, 500),
        ownerUid: state.user.uid,
        createdAt: serverTime()
      });

      $("communityForm").reset();

      notify("Community created.", "success");

      await loadCommunities();

    } catch (error) {
      reportError(error);
    }
  }

  /* =========================================================
     NOTIFICATIONS
     ========================================================= */

  async function loadNotifications() {
    if (!$("notificationsContainer")) return;

    clear("notificationsContainer");

    try {
      const snap = await userRef()
        .collection("notifications")
        .orderBy("createdAt", "desc")
        .limit(30)
        .get();

      if (snap.empty) {
        $("notificationsContainer").append(
          element("p", "You have no notifications.")
        );
      }

      let count = 0;

      snap.forEach(doc => {
        count++;
        const n = doc.data();

        $("notificationsContainer").append(
          element("p", n.text || "New notification")
        );
      });

      if ($("notificationBadge")) {
        $("notificationBadge").textContent = count;
        $("notificationBadge").hidden = count === 0;
      }

    } catch (error) {
      reportError(error);
    }
  }

  /* =========================================================
     BASIC MESSAGING
     ========================================================= */

  async function loadConversations() 
