
/* ==========================================================
   UNITARY — MASTER APPLICATION JAVASCRIPT
   File: app.js
   Version: 1.0.0
   Platform: Android, iOS and Web
   Backend: Supabase
   ========================================================== */

"use strict";

/* ==========================================================
   1. APPLICATION CONFIGURATION
   ========================================================== */

const Unitary = {
    name: "Unitary",
    version: "1.0.0",
    environment: "production",

    settings: {
        maxGroupCallParticipants: 50,
        maxUsernameLength: 30,
        minUsernameLength: 3,
        maxPostLength: 5000,
        maxCommentLength: 2000,
        maxMessageLength: 10000,
        notificationsEnabled: true,
        encryptionEnabled: true,
        darkMode: false,
        autoSave: true
    },

    state: {
        user: null,
        profile: null,
        session: null,
        currentPage: "home",
        currentChat: null,
        selectedPost: null,
        notifications: [],
        conversations: [],
        posts: [],
        friends: [],
        isLoading: false,
        isOnline: navigator.onLine,
        isAuthenticated: false
    },

    services: {
        supabase: null,
        realtime: null,
        storage: null,
        auth: null
    }
};


/* ==========================================================
   2. APPLICATION INITIALIZATION
   ========================================================== */

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Unitary is initializing...");

    initializeApplication();
    initializeNavigation();
    initializeEventListeners();
    initializeTheme();
    initializeConnectivity();

    await initializeBackend();
    await restoreSession();

    console.log("Unitary initialization completed.");

});


async function initializeApplication() {

    document.documentElement.setAttribute(
        "data-app",
        "unitary"
    );

    document.documentElement.setAttribute(
        "data-version",
        Unitary.version
    );

    updateOnlineStatus();

}


/* ==========================================================
   3. BACKEND CONNECTION
   ========================================================== */

async function initializeBackend() {

    try {

        if (
            typeof window.supabase === "undefined" ||
            typeof window.UNITARY_CONFIG === "undefined"
        ) {
            console.warn(
                "Supabase or configuration is not available."
            );

            return false;
        }

        const config = window.UNITARY_CONFIG;

        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            console.warn("Missing Supabase configuration.");
            return false;
        }

        Unitary.services.supabase =
            window.supabase.createClient(
                config.supabaseUrl,
                config.supabaseAnonKey
            );

        Unitary.services.auth =
            Unitary.services.supabase.auth;

        Unitary.services.storage =
            Unitary.services.supabase.storage;

        Unitary.services.realtime =
            Unitary.services.supabase.channel;

        console.log("Supabase connected.");

        return true;

    } catch (error) {

        handleError("Backend initialization", error);

        return false;
    }
}


function getDatabase() {

    if (!Unitary.services.supabase) {
        throw new Error("Database is not connected.");
    }

    return Unitary.services.supabase;
}


/* ==========================================================
   4. AUTHENTICATION
   ========================================================== */

const Authentication = {

    async register(email, password, username) {

        try {

            validateEmail(email);
            validatePassword(password);
            validateUsername(username);

            const db = getDatabase();

            const { data, error } =
                await db.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: username.trim()
                        }
                    }
                });

            if (error) throw error;

            return {
                success: true,
                data,
                message:
                    "Registration submitted. Check your email if confirmation is required."
            };

        } catch (error) {

            return this.failure(error);
        }
    },


    async login(email, password) {

        try {

            validateEmail(email);

            const { data, error } =
                await getDatabase().auth.signInWithPassword({
                    email,
                    password
                });

            if (error) throw error;

            Unitary.state.session = data.session;
            Unitary.state.user = data.user;
            Unitary.state.isAuthenticated = true;

            await Profiles.load();

            return {
                success: true,
                data
            };

        } catch (error) {

            return this.failure(error);
        }
    },


    async logout() {

        try {

            const { error } =
                await getDatabase().auth.signOut();

            if (error) throw error;

            Unitary.state.user = null;
            Unitary.state.profile = null;
            Unitary.state.session = null;
            Unitary.state.isAuthenticated = false;

            window.location.reload();

        } catch (error) {

            handleError("Logout", error);
        }
    },


    async resetPassword(email) {

        try {

            validateEmail(email);

            const { error } =
                await getDatabase().auth.resetPasswordForEmail(
                    email
                );

            if (error) throw error;

            return {
                success: true,
                message: "Password reset email requested."
            };

        } catch (error) {

            return this.failure(error);
        }
    },


    async updatePassword(newPassword) {

        try {

            validatePassword(newPassword);

            const { error } =
                await getDatabase().auth.updateUser({
                    password: newPassword
                });

            if (error) throw error;

            return { success: true };

        } catch (error) {

            return this.failure(error);
        }
    },


    failure(error) {

        handleError("Authentication", error);

        return {
            success: false,
            message: error.message
        };
    }

};


/* ==========================================================
   5. SESSION MANAGEMENT
   ========================================================== */

async function restoreSession() {

    if (!Unitary.services.supabase) return;

    try {

        const { data, error } =
            await getDatabase().auth.getSession();

        if (error) throw error;

        Unitary.state.session = data.session;
        Unitary.state.user = data.session?.user || null;

        Unitary.state.isAuthenticated =
            Boolean(data.session);

        if (data.session) {

            await Profiles.load();
            await Notifications.load();

        }

        getDatabase().auth.onAuthStateChange(
            async (event, session) => {

                Unitary.state.session = session;
                Unitary.state.user = session?.user || null;

                Unitary.state.isAuthenticated =
                    Boolean(session);

                if (session) {
                    await Profiles.load();
                }

                document.dispatchEvent(
                    new CustomEvent("unitary:auth-change", {
                        detail: { event, session }
                    })
                );

            }
        );

    } catch (error) {

        handleError("Session restoration", error);
    }
}


/* ==========================================================
   6. USER PROFILES
   ========================================================== */

const Profiles = {

    async load() {

        if (!Unitary.state.user) return null;

        try {

            const { data, error } =
                await getDatabase()
                    .from("profiles")
                    .select("*")
                    .eq("id", Unitary.state.user.id)
                    .maybeSingle();

            if (error) throw error;

            Unitary.state.profile = data;

            return data;

        } catch (error) {

            handleError("Profile loading", error);
            return null;
        }
    },


    async update(updates) {

        if (!Unitary.state.user) {
            throw new Error("Login required.");
        }

        const allowedFields = [
            "username",
            "display_name",
            "bio",
            "avatar_url",
            "website",
            "location",
            "is_private"
        ];

        const safeUpdates = {};

        for (const key of allowedFields) {

            if (key in updates) {
                safeUpdates[key] = updates[key];
            }
        }

        safeUpdates.updated_at =
            new Date().toISOString();

        const { data, error } =
            await getDatabase()
                .from("profiles")
                .update(safeUpdates)
                .eq("id", Unitary.state.user.id)
                .select()
                .single();

        if (error) throw error;

        Unitary.state.profile = data;

        return data;
    },


    async uploadAvatar(file) {

        validateFile(file, ["image/jpeg", "image/png", "image/webp"], 5);

        const userId = Unitary.state.user?.id;

        if (!userId) {
            throw new Error("Login required.");
        }

        const path =
            `${userId}/avatar-${Date.now()}`;

        const { error } =
            await getDatabase()
                .storage
                .from("avatars")
                .upload(path, file, {
                    upsert: true
                });

        if (error) throw error;

        const { data } =
            getDatabase()
                .storage
                .from("avatars")
                .getPublicUrl(path);

        return this.update({
            avatar_url: data.publicUrl
        });
    }

};


/* ==========================================================
   7. POSTS
   ========================================================== */

const Posts = {

    async create(content) {

        if (!Unitary.state.user) {
            throw new Error("Login required.");
        }

        if (!content.trim()) {
            throw new Error("Post cannot be empty.");
        }

        if (
            content.length >
            Unitary.settings.maxPostLength
        ) {
            throw new Error("Post is too long.");
        }

        const { data, error } =
            await getDatabase()
                .from("posts")
                .insert({
                    user_id: Unitary.state.user.id,
                    content: content.trim()
                })
                .select()
                .single();

        if (error) throw error;

        return data;
    },


    async load(limit = 20) {

        const { data, error } =
            await getDatabase()
                .from("posts")
                .select(`
                    *,
                    profiles (
                        username,
                        display_name,
                        avatar_url
                    )
                `)
                .order("created_at", {
                    ascending: false
                })
                .limit(limit);

        if (error) throw error;

        Unitary.state.posts = data;

        return data;
    },


    async delete(postId) {

        const { error } =
            await getDatabase()
                .from("posts")
                .delete()
                .eq("id", postId)
                .eq("user_id", Unitary.state.user.id);

        if (error) throw error;

        return true;
    },


    async update(postId, content) {

        if (!content.trim()) {
            throw new Error("Post cannot be empty.");
        }

        const { data, error } =
            await getDatabase()
                .from("posts")
                .update({
                    content: content.trim(),
                    updated_at: new Date().toISOString()
                })
                .eq("id", postId)
                .eq("user_id", Unitary.state.user.id)
                .select()
                .single();

        if (error) throw error;

        return data;
    }

};


/* ==========================================================
   8. SHORT VIDEO UPLOADS
   ========================================================== */

const Videos = {

    async upload(file) {

        validateFile(
            file,
            ["video/mp4", "video/webm", "video/quicktime"],
            100
        );

        const userId = Unitary.state.user?.id;

        if (!userId) {
            throw new Error("Login required.");
        }

        const path =
            `${userId}/${Date.now()}-${safeFilename(file.name)}`;

        const { error } =
            await getDatabase()
                .storage
                .from("videos")
                .upload(path, file);

        if (error) throw error;

        const { data } =
            getDatabase()
                .storage
                .from("videos")
                .getPublicUrl(path);

        return data.publicUrl;
    }

};


/* ==========================================================
   9. LIKES
   ========================================================== */

const Likes = {

    async toggle(postId) {

        const userId = Unitary.state.user?.id;

        if (!userId) {
            throw new Error("Login required.");
        }

        const { data: existing, error: findError } =
            await getDatabase()
                .from("likes")
                .select("id")
                .eq("post_id", postId)
                .eq("user_id", userId)
                .maybeSingle();

        if (findError) throw findError;

        if (existing) {

            const { error } =
                await getDatabase()
                    .from("likes")
                    .delete()
                    .eq("id", existing.id);

            if (error) throw error;

            return false;
        }

        const { error } =
            await getDatabase()
                .from("likes")
                .insert({
                    post_id: postId,
                    user_id: userId
                });

        if (error) throw error;

        return true;
    }

};


/* ==========================================================
   10. COMMENTS
   ========================================================== */

const Comments = {

    async add(postId, content) {

        if (!content.trim()) {
            throw new Error("Comment cannot be empty.");
        }

        if (
            content.length >
            Unitary.settings.maxCommentLength
        ) {
            throw new Error("Comment is too long.");
        }

        const { data, error } =
            await getDatabase()
                .from("comments")
                .insert({
                    post_id: postId,
                    user_id: Unitary.state.user.id,
                    content: content.trim()
                })
                .select()
                .single();

        if (error) throw error;

        return data;
    },


    async load(postId) {

        const { data, error } =
            await getDatabase()
                .from("comments")
                .select(`
                    *,
                    profiles(username, avatar_url)
                `)
                .eq("post_id", postId)
                .order("created_at");

        if (error) throw error;

        return data;
    }

};


/* ==========================================================
   11. SHARING
   ========================================================== */

const Sharing = {

    async share(url, title = "Unitary") {

        if (navigator.share) {

            await navigator.share({
                title,
                url
            });

        } else {

            await navigator.clipboard.writeText(url);

            showMessage("Link copied.");
        }
    }

};


/* ==========================================================
   12. FOLLOW SYSTEM
   ========================================================== */

const Following = {

    async follow(targetUserId) {

        if (!Unitary.state.user) {
            throw new Error("Login required.");
        }

        if (targetUserId === Unitary.state.user.id) {
            throw new Error("You cannot follow yourself.");
        }

        const { error } =
            await getDatabase()
                .from("follows")
                .insert({
                    follower_id: Unitary.state.user.id,
                    following_id: targetUserId
                });

        if (error) throw error;

        return true;
    },


    async unfollow(targetUserId) {

        const { error } =
            await getDatabase()
                .from("follows")
                .delete()
                .eq("follower_id", Unitary.state.user.id)
                .eq("following_id", targetUserId);

        if (error) throw error;

        return true;
    }

};


/* ==========================================================
   13. PRIVATE MESSAGING
   ========================================================== */

const Messaging = {

    async send(receiverId, content) {

        if (!Unitary.state.user) {
            throw new Error("Login required.");
        }

        if (!content.trim()) {
            throw new Error("Message cannot be empty.");
        }

        if (
            content.length >
            Unitary.settings.maxMessageLength
        ) {
            throw new Error("Message is too long.");
        }

        const { data, error } =
            await getDatabase()
                .from("messages")
                .insert({
                    sender_id: Unitary.state.user.id,
                    receiver_id: receiverId,
                    content: content.trim()
                })
                .select()
                .single();

        if (error) throw error;

        return data;
    },


    async load(conversationUserId) {

        const currentUserId = Unitary.state.user.id;

        const { data, error } =
            await getDatabase()
                .from("messages")
                .select("*")
                .or(
                    `and(sender_id.eq.${currentUserId},receiver_id.eq.${conversationUserId}),and(sender_id.eq.${conversationUserId},receiver_id.eq.${currentUserId})`
                )
                .order("created_at");

        if (error) throw error;

        return data;
    },


    subscribe(callback) {

        return getDatabase()
            .channel("unitary-messages")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                payload => callback(payload.new)
            )
            .subscribe();
    }

};


/* ==========================================================
   14. ENCRYPTION FRAMEWORK
   ========================================================== */

const Encryption = {

    supported: Boolean(
        window.crypto &&
        window.crypto.subtle
    ),

    async generateKeyPair() {

        if (!this.supported) {
            throw new Error
