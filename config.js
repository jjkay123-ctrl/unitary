
// ============================================================
// UNITARY — COMPLETE APPLICATION CONFIGURATION
// Version: 1.0.0
// ============================================================


// ============================================================
// 1. FIREBASE CONFIGURATION
// ============================================================

window.UNITARY_FIREBASE_CONFIG = {
  apiKey: "AIzaSyB4CGGN4Ht1o_9Wt_Ws1mFbGAB2zGREy9U",
  authDomain: "unitary-45322.firebaseapp.com",
  projectId: "unitary-45322",
  storageBucket: "unitary-45322.firebasestorage.app",
  messagingSenderId: "131368530770",
  appId: "1:131368530770:web:48b701c47e71dd0cccc08b",
  measurementId: "G-LKFF8VRKE2"
};


// ============================================================
// 2. APPLICATION IDENTITY
// ============================================================

window.UNITARY_APP = {
  name: "Unitary",
  fullName: "Unitary Social Platform",
  version: "1.0.0",
  build: "production",
  description: "A global platform for communication and community.",
  website: "https://jjkay123-ctrl.github.io/unitary/",
  supportEmail: "",
  defaultLanguage: "en",
  defaultCountry: "KE",
  defaultCurrency: "KES",
  timezone: "Africa/Nairobi",
  copyright: "Unitary",
  launchYear: 2026
};


// ============================================================
// 3. GENERAL APPLICATION SETTINGS
// ============================================================

window.UNITARY_SETTINGS = {
  maintenanceMode: false,
  registrationEnabled: true,
  loginEnabled: true,
  guestAccess: false,

  requireEmailVerification: true,
  allowGoogleSignIn: true,
  allowPasswordSignIn: true,
  allowPasswordReset: true,

  defaultTheme: "light",
  availableThemes: ["light", "dark"],
  allowThemeSwitching: true,
  rememberThemePreference: true,

  defaultLanguage: "en",
  allowLanguageSwitching: true,

  mobileNavigation: true,
  desktopNavigation: true,
  responsiveDesign: true,

  maxCallParticipants: 50,
  minimumAge: 13
};


// ============================================================
// 4. THEME CONFIGURATION
// ============================================================

window.UNITARY_THEME = {
  enabled: true,

  default: "light",
  available: ["light", "dark"],

  allowUserSelection: true,
  rememberPreference: true,

  storageKey: "unitary_theme",

  light: {
    name: "Light Mode",

    background: "#FFFFFF",
    surface: "#F7F8FA",
    surfaceSecondary: "#F1F5F9",

    text: "#171717",
    secondaryText: "#666666",
    mutedText: "#888888",

    primary: "#2563EB",
    primaryHover: "#1D4ED8",

    border: "#E5E7EB",
    divider: "#EEEEEE",

    inputBackground: "#FFFFFF",
    inputText: "#171717",

    cardBackground: "#FFFFFF",
    sidebarBackground: "#FFFFFF",

    success: "#16A34A",
    warning: "#D97706",
    danger: "#DC2626",

    overlay: "rgba(0,0,0,0.45)"
  },

  dark: {
    name: "Dark Mode",

    background: "#121212",
    surface: "#1E1E1E",
    surfaceSecondary: "#262626",

    text: "#FFFFFF",
    secondaryText: "#B0B0B0",
    mutedText: "#888888",

    primary: "#60A5FA",
    primaryHover: "#3B82F6",

    border: "#333333",
    divider: "#303030",

    inputBackground: "#262626",
    inputText: "#FFFFFF",

    cardBackground: "#1E1E1E",
    sidebarBackground: "#181818",

    success: "#4ADE80",
    warning: "#FBBF24",
    danger: "#F87171",

    overlay: "rgba(0,0,0,0.7)"
  }
};


// ============================================================
// 5. FIREBASE SERVICES
// ============================================================

window.UNITARY_FIREBASE_SERVICES = {
  authentication: true,
  firestore: true,
  storage: true,

  analytics: false,
  messaging: false,
  performance: false,
  appCheck: false,
  remoteConfig: false,
  cloudFunctions: false
};


// ============================================================
// 6. AUTHENTICATION
// ============================================================

window.UNITARY_AUTH = {
  emailPassword: true,
  googleSignIn: true,
  phoneAuthentication: false,
  anonymousAuthentication: false,

  emailVerification: true,
  passwordReset: true,
  rememberSession: true,

  minimumPasswordLength: 8,
  requireUppercase: false,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialCharacter: false,

  allowMultipleDevices: true,
  sessionTimeoutMinutes: 0,
  accountDeletionEnabled: true
};


// ============================================================
// 7. USER PROFILES
// ============================================================

window.UNITARY_PROFILE = {
  enabled: true,

  profilePictures: true,
  coverPhotos: true,
  displayNames: true,
  usernames: true,
  biographies: true,

  locationField: true,
  websiteField: true,
  dateOfBirthField: true,
  verificationBadges: true,

  allowProfileEditing: true,
  allowProfilePrivacy: true,
  allowAccountBlocking: true,
  allowAccountReporting: true,

  usernameMinLength: 3,
  usernameMaxLength: 30,
  biographyMaxLength: 500
};


// ============================================================
// 8. SOCIAL FEED
// ============================================================

window.UNITARY_FEED = {
  enabled: true,

  textPosts: true,
  imagePosts: true,
  videoPosts: true,
  linkPosts: true,
  polls: true,

  likes: true,
  comments: true,
  shares: true,
  bookmarks: true,
  reposts: true,

  chronologicalFeed: true,
  personalizedFeed: false,
  contentDiscovery: true,

  maxPostLength: 5000,
  maxCommentLength: 2000,
  maxImagesPerPost: 10,
  maxVideosPerPost: 1
};


// ============================================================
// 9. STORIES
// ============================================================

window.UNITARY_STORIES = {
  enabled: true,

  imageStories: true,
  videoStories: true,
  textStories: true,

  storyReactions: true,
  storyReplies: true,
  storyViews: true,

  expirationHours: 24,
  maxStoryDurationSeconds: 60,

  archiveEnabled: true,
  highlightsEnabled: true
};


// ============================================================
// 10. MESSAGING
// ============================================================

window.UNITARY_MESSAGING = {
  enabled: true,

  directMessages: true,
  groupMessages: true,

  textMessages: true,
  imageMessages: true,
  videoMessages: true,
  voiceMessages: true,
  fileSharing: true,

  messageReactions: true,
  messageReplies: true,
  messageForwarding: true,
  messageEditing: true,
  messageDeletion: true,

  typingIndicators: true,
  readReceipts: true,
  onlineStatus: true,

  maxMessageLength: 5000,
  maxGroupMembers: 500,
  messageRetentionDays: 0,

  endToEndEncryption: false
};


// ============================================================
// 11. VOICE AND VIDEO CALLS
// ============================================================

window.UNITARY_CALLS = {
  enabled: false,

  voiceCalls: false,
  videoCalls: false,

  oneToOneVoiceCalls: false,
  oneToOneVideoCalls: false,

  groupVoiceCalls: false,
  groupVideoCalls: false,

  maxGroupParticipants: 50,

  screenSharing: false,
  callRecording: false,
  callHistory: false,

  provider: "",
  requiresWebRTC: true
};


// ============================================================
// 12. COMMUNITIES
// ============================================================

window.UNITARY_COMMUNITIES = {
  enabled: true,

  publicCommunities: true,
  privateCommunities: true,

  communityPosts: true,
  communityMessaging: true,
  communityModerators: true,
  communityInvitations: true,
  communityRules: true,

  maxCommunityMembers: 100000,
  communityVerification: false
};


// ============================================================
// 13. DISCOVERY AND SEARCH
// ============================================================

window.UNITARY_DISCOVERY = {
  enabled: true,

  userSearch: true,
  usernameSearch: true,
  postSearch: true,
  communitySearch: true,
  hashtagSearch: true,

  trendingTopics: true,
  suggestedAccounts: true,
  suggestedCommunities: true
};


// ============================================================
// 14. NOTIFICATIONS
// ============================================================

window.UNITARY_NOTIFICATIONS = {
  enabled: true,

  inAppNotifications: true,
  pushNotifications: false,
  emailNotifications: false,

  likes: true,
  comments: true,
  replies: true,
  follows: true,
  messages: true,
  mentions: true,
  communityUpdates: true,
  callNotifications: true,

  soundEnabled: true,
  vibrationEnabled: true
};


// ============================================================
// 15. MEDIA UPLOADS
// ============================================================

window.UNITARY_UPLOADS = {
  enabled: true,

  images: true,
  videos: true,
  audio: true,
  documents: true,

  maxImageSizeMB: 10,
  maxVideoSizeMB: 100,
  maxAudioSizeMB: 25,
  maxDocumentSizeMB: 20,

  maxImagesPerPost: 10,
  maxVideoDurationSeconds: 600,

  allowedImageTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif"
  ],

  allowedVideoTypes: [
    "video/mp4",
    "video/webm",
    "video/quicktime"
  ],

  allowedAudioTypes: [
    "audio/mpeg",
    "audio/mp4",
    "audio/wav",
    "audio/ogg",
    "audio/webm"
  ],

  allowedDocumentTypes: [
    "application/pdf",
    "text/plain"
  ]
};


// ============================================================
// 16. PRIVACY
// ============================================================

window.UNITARY_PRIVACY = {
  enabled: true,

  privateAccounts: true,
  publicAccounts: true,

  hideOnlineStatus: true,
  hideLastSeen: true,

  controlMessageRequests: true,
  controlProfileVisibility: true,

  blockUsers: true,
  muteUsers: true,
  restrictUsers: true,

  dataExport: true,
  accountDeletion: true,
  privacyControls: true,

  collectPreciseLocation: false,
  sellPersonalData: false
};


// ============================================================
// 17. SECURITY
// ============================================================

window.UNITARY_SECURITY = {
  enabled: true,

  secureAuthentication: true,
  firebaseAuthentication: true,

  firestoreSecurityRulesRequired: true,
  storageSecurityRulesRequired: true,

  appCheck: false,
  rateLimiting: true,
  abuseProtection: true,
  suspiciousLoginMonitoring: true,

  twoFactorAuthentication: false,
  deviceManagement: false,

  endToEndEncryption: false,
  encryptedBackups: false,

  neverStoreAdminSecretsInClient: true,
  validateUploadsOnServer: true
};


// ============================================================
// 18. CONTENT MODERATION
// ============================================================

window.UNITARY_MODERATION = {
  enabled: true,

  reportPosts: true,
  reportComments: true,
  reportMessages: true,
  reportAccounts: true,

  blockAccounts: true,
  muteAccounts: true,

  contentFiltering: false,
  automatedModeration: false,
  humanModeration: false,

  communityModeration: true,
  appealSystem: false,

  spamDetection: false,
  harmfulContentDetection: false
};


// ============================================================
// 19. LIVE STREAMING
// ============================================================

window.UNITARY_LIVE = {
  enabled: false,

  liveVideo: false,
  liveAudio: false,
  liveChat: false,
  liveReactions: false,
  liveModeration: false,
  liveDonations: false,

  provider: "",
  requiresStreamingInfrastructure: true
};


// ============================================================
// 20. CREATOR TOOLS
// ============================================================

window.UNITARY_CREATOR = {
  enabled: true,

  creatorProfiles: true,
  creatorDashboard: false,
  contentAnalytics: false,
  audienceInsights: false,

  scheduledPosts: false,
  creatorSubscriptions: false,
  creatorDonations: false,
  creatorVerification: false
};


// ============================================================
// 21. MONETISATION
// ============================================================

window.UNITARY_MONETISATION = {
  enabled: false,

  advertisements: false,
  promotedPosts: false,
  subscriptions: false,
  donations: false,
  creatorPayments: false,
  marketplace: false,

  paymentProvider: "",

  mpesaPayments: false,
  internationalPayments: false,

  currency: "KES",

  requiresPaymentIntegration: true,
  requiresLegalAndComplianceReview: true
};


// ============================================================
// 22. ADMINISTRATION
// ============================================================

window.UNITARY_ADMIN = {
  enabled: false,

  adminDashboard: false,
  userManagement: false,
  contentManagement: false,
  reportsManagement: false,
  communityManagement: false,

  platformAnalytics: false,
  platformSettings: false,

  auditLogs: false,
  roleBasedAccess: true,
  requireServerSideAuthorization: true
};


// ============================================================
// 23. ANALYTICS
// ============================================================

window.UNITARY_ANALYTICS = {
  enabled: false,

  pageViews: false,
  userActivity: false,
  postEngagement: false,
  communityActivity: false,
  performanceMonitoring: false,

  analyticsProvider: "",
  respectPrivacySettings: true
};


// ============================================================
// 24. LANGUAGES AND INTERNATIONALIZATION
// ============================================================

window.UNITARY_LANGUAGE = {
  default: "en",

  supported: [
    "en",
    "sw",
    "fr",
    "es",
    "de",
    "pt",
    "ar",
    "zh",
    "hi"
  ],

  automaticTranslation: false,
  rightToLeftSupport: true,
  currencyLocalization: true,
  dateLocalization: true
};


// ============================================================
// 25. ACCESSIBILITY
// ============================================================

window.UNITARY_ACCESSIBILITY = {
  enabled: true,

  keyboardNavigation: true,
  screenReaderSupport: true,
  highContrastMode: true,
  textScaling: true,
  reducedMotion: true,
  captionsSupport: true
};


// ============================================================
// 26. PERFORMANCE
// ============================================================

window.UNITARY_PERFORMANCE = {
  lazyLoading: true,
  imageOptimization: true,
  videoOptimization: true,
  pagination: true,

  caching: true,
  offlineMode: false,
  backgroundSync: false,

  maxFeedItemsPerLoad: 20,
  maxMessagesPerLoad: 30
};


// ============================================================
// 27. FUTURE FEATURES
// ============================================================

window.UNITARY_FUTURE = {
  artificialIntelligence: false,
  aiAssistant: false,
  aiContentRecommendations: false,
  aiTranslation: false,

  events: false,
  groups: true,
  audioRooms: false,
  videoRooms: false,

  marketplace: false,
  jobsPlatform: false,
  educationHub: false,
  gamingCommunities: false,

  cloudBackups: false,
  crossPlatformSync: false,

  desktopApplication: false,
  nativeAndroidApplication: false,
  nativeIOSApplication: false
};


// ============================================================
// 28. LEGAL AND POLICY SETTINGS
// ============================================================

window.UNITARY_LEGAL = {
  termsRequired: true,
  privacyPolicyRequired: true,
  communityGuidelinesRequired: true,

  cookieNotice: true,
  dataProtectionNotice: true,
  ageConfirmation: true,

  termsVersion: "1.0",
  privacyVersion: "1.0",
  guidelinesVersion: "1.0"
};


// ============================================================
// 29. FEATURE REGISTRY
// ============================================================

window.UNITARY_FEATURES = {
  authentication: true,
  profiles: true,
  feed: true,
  stories: true,

  posts: true,
  comments: true,
  likes: true,
  shares: true,
  bookmarks: true,

  messaging: true,
  groupChats: true,

  voiceCalls: false,
  videoCalls: false,
  groupCalls: false,

  communities: true,
  discovery: true,
  search: true,
  notifications: true,

  liveStreaming: false,
  endToEndEncryption: false,

  payments: false,
  advertisements: false,
  creatorMonetisation: false,
  administration: false,

  lightTheme: true,
  darkTheme: true,
  themeSwitching: true
};


// ============================================================
// 30. CONFIGURATION VALIDATION
// ============================================================

(function () {
  const config = window.UNITARY_FIREBASE_CONFIG;

  const requiredFields = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId"
  ];

  const missingFields = requiredFields.filter(function (field) {
    return (
      !config[field] ||
      typeof config[field] !== "string" ||
      config[field].trim() === ""
    );
  });

  window.UNITARY_CONFIG_READY = missingFields.length === 0;

  window.UNITARY_CONFIG_ERRORS = missingFields;

  if (window.UNITARY_CONFIG_READY) {
    console.info("Unitary Firebase configuration loaded.");
  } else {
    console.error(
      "Unitary configuration incomplete:",
      missingFields
    );
  }

  if (
    !window.UNITARY_THEME ||
    !window.UNITARY_THEME.available.includes("light") ||
    !window.UNITARY_THEME.available.includes("dark")
  ) {
    console.error("Unitary theme configuration is incomplete.");
  }
})();


// ============================================================
// 31. GLOBAL CONFIGURATION ACCESS
// ============================================================

window.UNITARY = {
  app: window.UNITARY_APP,
  settings: window.UNITARY_SETTINGS,
  firebase: window.UNITARY_FIREBASE_CONFIG,
  firebaseServices: window.UNITARY_FIREBASE_SERVICES,

  theme: window.UNITARY_THEME,

  auth: window.UNITARY_AUTH,
  profile: window.UNITARY_PROFILE,
  feed: window.UNITARY_FEED,
  stories: window.UNITARY_STORIES,
  messaging: window.UNITARY_MESSAGING,
  calls: window.UNITARY_CALLS,
  communities: window.UNITARY_COMMUNITIES,
  discovery: window.UNITARY_DISCOVERY,
  notifications: window.UNITARY_NOTIFICATIONS,
  uploads: window.UNITARY_UPLOADS,
  privacy: window.UNITARY_PRIVACY,
  security: window.UNITARY_SECURITY,
  moderation: window.UNITARY_MODERATION,
  live: window.UNITARY_LIVE,
  creator: window.UNITARY_CREATOR,
  monetisation: window.UNITARY_MONETISATION,
  admin: window.UNITARY_ADMIN,
  analytics: window.UNITARY_ANALYTICS,
  language: window.UNITARY_LANGUAGE,
  accessibility: window.UNITARY_ACCESSIBILITY,
  performance: window.UNITARY_PERFORMANCE,
  future: window.UNITARY_FUTURE,
  legal: window.UNITARY_LEGAL,
  features: window.UNITARY_FEATURES
};


// ============================================================
// 32. CONFIGURATION READY
// ============================================================

console.info(
  "UNITARY CONFIGURATION LOADED",
  window.UNITARY_CONFIG_READY
    ? "READY"
    : "CHECK FIREBASE SETTINGS"
);

// ============================================================
// 33. FIREBASE INITIALISATION
// ============================================================

(function initialiseUnitaryFirebase() {
  const config = window.UNITARY_FIREBASE_CONFIG;

  window.UNITARY_FIREBASE_READY = false;
  window.UNITARY_FIREBASE_ERROR = null;
  window.auth = null;
  window.db = null;
  window.storage = null;

  try {
    if (!window.firebase) {
      throw new Error("Firebase SDK did not load.");
    }

    if (!window.UNITARY_CONFIG_READY || !config) {
      throw new Error("Firebase configuration is incomplete.");
    }

    const app = window.firebase.apps.length
      ? window.firebase.app()
      : window.firebase.initializeApp(config);

    window.UNITARY_FIREBASE_APP = app;

    window.auth = app.auth();
    window.db = app.firestore();
    window.storage = app.storage();

    window.UNITARY_AUTH_PERSISTENCE = window.auth
      .setPersistence(
        window.firebase.auth.Auth.Persistence.LOCAL
      )
      .catch(function (error) {
        console.warn("Authentication persistence warning:", error);
      });

    window.UNITARY_FIREBASE_READY = true;

    console.info("Unitary Firebase initialised successfully.");

  } catch (error) {
    window.UNITARY_FIREBASE_ERROR = error;
    window.UNITARY_FIREBASE_READY = false;

    console.error("Unitary Firebase initialisation failed:", error);
  }
})();
        

