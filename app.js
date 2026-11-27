
/* UNITARY - FIREBASE APP.JS */
(() => {
"use strict";

const $ = id => document.getElementById(id);
const db = () => window.db;
const auth = () => window.auth;
const storage = () => window.storage;
let user = null;
let authMode = "login";
let recipientUid = "";
let selectedContacts = [];

const timestamp = () => firebase.firestore.FieldValue.serverTimestamp();
const say = (text, error=false) => {
  const box = $("authStatus");
  if (box && !$("authSection").hidden) box.textContent = text;
  else console.log("Unitary:", text);
  if (error) console.error(text);
};
const value = id => $(id)?.value?.trim() || "";
const bind = (id,event,fn) => $(id)?.addEventListener(event,fn);

function showPublic(){
  $("publicHome").hidden=false;
  $("authSection").hidden=true;
  $("appSection").hidden=true;
}
function showAuth(){
  $("publicHome").hidden=true;
  $("authSection").hidden=false;
  $("appSection").hidden=true;
}
function showApp(){
  $("publicHome").hidden=true;
  $("authSection").hidden=true;
  $("appSection").hidden=false;
  navigate("home");
}
function setMode(mode){
  authMode=mode;
  const signup=mode==="signup";
  $("authHeading").textContent=signup?"Create Your Account":"Welcome Back";
  $("authDisplayName").hidden=!signup;
  $("confirmPassword").hidden=!signup;
  $("authDisplayName").required=signup;
  $("confirmPassword").required=signup;
  $("submitBtn").textContent=signup?"Create Account":"Login";
  $("loginTab").classList.toggle("soft",signup);
  $("signupTab").classList.toggle("soft",!signup);
}
function theme(mode){
  document.body.classList.toggle("dark",mode==="dark");
  document.documentElement.dataset.theme=mode;
  try{localStorage.setItem("unitary_theme",mode)}catch(e){}
}
function toggleTheme(){
  theme(document.body.classList.contains("dark")?"light":"dark");
}
function navigate(section){
  document.querySelectorAll("[data-section-panel]").forEach(el=>{
    el.hidden=el.dataset.sectionPanel!==section;
  });
  document.getElementById("profileMenu").hidden=true;
  if(section==="home")loadPosts();
  if(section==="profile")loadProfile();
  if(section==="communities")loadCommunities();
  if(section==="notifications")loadNotifications();
  if(section==="saved")loadSaved();
}
function safeText(tag,text){
  const el=document.createElement(tag);
  el.textContent=text||"";
  return el;
}
function button(text,fn,soft=false){
  const b=safeText("button",text);
  b.type="button";
  if(soft)b.className="soft";
  b.addEventListener("click",fn);
  return b;
}
function showError(error){
  say(error?.message||"Something went wrong.",true);
}

/* AUTHENTICATION */
async function register(){
  const name=value("authDisplayName");
  const email=value("email");
  const pass=value("password");
  if(!name||!email||pass.length<8||pass!==value("confirmPassword")){
    say("Enter your name and email, use at least 8 password characters, and make sure both passwords match.",true);
    return;
  }
  try{
    const result=await auth().createUserWithEmailAndPassword(email,pass);
    await result.user.updateProfile({displayName:name});
    await db().collection("users").doc(result.user.uid).set({
      uid:result.user.uid,
      displayName:name,
      username:name.toLowerCase().replace(/[^a-z0-9]/g,""),
      bio:"",
      photoURL:"",
      isPrivate:false,
      createdAt:timestamp()
    });
    try{await result.user.sendEmailVerification()}catch(e){console.warn(e)}
    say("Account created. Check your email for verification.");
  }catch(e){showError(e)}
}
async function login(){
  try{
    await auth().signInWithEmailAndPassword(value("email"),value("password"));
  }catch(e){showError(e)}
}
async function resetPassword(){
  if(!value("email"))return say("Enter your email address first.",true);
  try{
    await auth().sendPasswordResetEmail(value("email"));
    say("Password reset email sent.");
  }catch(e){showError(e)}
}
async function logout(){
  try{await auth().signOut();showPublic()}
  catch(e){showError(e)}
}

/* USER PROFILE */
async function loadProfile(){
  if(!user)return;
  try{
    const snap=await db().collection("users").doc(user.uid).get();
    const d=snap.exists?snap.data():{};
    $("displayName").value=d.displayName||user.displayName||"";
    $("username").value=d.username||"";
    $("bio").value=d.bio||"";
    if(d.photoURL)$("profileAvatar").src=d.photoURL;
    $("followerCount").textContent=d.followersCount||0;
    $("followingCount").textContent=d.followingCount||0;
  }catch(e){showError(e)}
}
async function saveProfile(e){
  e.preventDefault();
  if(!user)return;
  try{
    const data={
      displayName:value("displayName"),
      username:value("username").toLowerCase(),
      bio:value("bio")
    };
    if(data.username.length<3)throw Error("Username must have at least 3 characters.");
    const file=$("profilePicture").files[0];
    if(file){
      if(!file.type.startsWith("image/"))throw Error("Choose an image.");
      if(file.size>10*1024*1024)throw Error("Profile image must be under 10 MB.");
      const ref=storage().ref(`profiles/${user.uid}/${Date.now()}_${file.name}`);
      await ref.put(file);
      data.photoURL=await ref.getDownloadURL();
      $("profileAvatar").src=data.photoURL;
    }
    await db().collection("users").doc(user.uid).set(data,{merge:true});
    if(data.displayName)await user.updateProfile({displayName:data.displayName});
    say("Profile saved successfully.");
  }catch(e){showError(e)}
}

/* MEDIA AND POSTS */
async function upload(file,folder){
  if(!storage())throw Error("Firebase Storage is not configured.");
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
  const ref=storage().ref(`${folder}/${user.uid}/${Date.now()}_${safeName}`);
  await ref.put(file);
  return ref.getDownloadURL();
}
async function createPost(e){
  e.preventDefault();
  if(!user)return showAuth();
  const text=value("postText");
  const files=[
    ...($("postImage").files||[]),
    ...($("postVideo").files||[]),
    ...($("mediaDocumentInput").files||[]),
    ...($("cameraCaptureInput").files||[])
  ];
  if(!text&&!files.length)return say("Write a post or select a file.",true);
  if(files.length>10)return say("Please select no more than 10 files.",true);
  try{
    const media=[];
    for(const file of files){
      if(file.size>100*1024*1024)throw Error(file.name+" is larger than 100 MB.");
      const url=await upload(file,"posts");
      media.push({url,name:file.name,type:file.type});
    }
    await db().collection("posts").add({
      uid:user.uid,
      author:user.displayName||"Unitary user",
      text,
      media,
      mediaURL:media[0]?.url||"",
      mediaType:media[0]?.type||"",
      likes:[],
      createdAt:timestamp()
    });
    $("createPostForm").reset();
    say("Your post has been published.");
    loadPosts();
  }catch(e){showError(e)}
}
function renderPost(id,d,parent){
  const card=document.createElement("article");
  card.className="post";
  card.append(safeText("h3",d.author||"Unitary user"));
  card.append(safeText("p",d.text||""));
  const media=d.media?.length?d.media:(d.mediaURL?[{url:d.mediaURL,type:d.mediaType}]:[]);
  media.forEach(m=>{
    if(!m.url)return;
    const el=document.createElement(m.type?.startsWith("video/")?"video":"img");
    el.src=m.url;
    el.style.maxWidth="100%";
    el.style.borderRadius="12px";
    if(el.tagName==="VIDEO")el.controls=true;
    el.alt="Post media";
    card.append(el);
  });
  card.append(
    button("Like ("+(d.likes||[]).length+")",()=>likePost(id,d.likes||[])),
    button("Save",()=>savePost(id),true)
  );
  parent.append(card);
}
async function loadPosts(){
  if(!user)return;
  try{
    const snap=await db().collection("posts").orderBy("createdAt","desc").limit(30).get();
    const box=$("feedContainer");
    box.innerHTML="";
    if(snap.empty){box.textContent="No posts yet. Be the first to share!";return}
    snap.forEach(doc=>renderPost(doc.id,doc.data(),box));
  }catch(e){showError(e)}
}
async function likePost(id,likes){
  try{
    const ref=db().collection("posts").doc(id);
    const method=likes.includes(user.uid)?"arrayRemove":"arrayUnion";
    await ref.update({likes:firebase.firestore.FieldValue[method](user.uid)});
    loadPosts();
  }catch(e){showError(e)}
}
function savedKey(){return "unitary_saved_"+user.uid}
function savePost(id){
  const list=JSON.parse(localStorage.getItem(savedKey())||"[]");
  if(!list.includes(id))list.push(id);
  localStorage.setItem(savedKey(),JSON.stringify(list));
  say("Post saved on this device.");
}
async function loadSaved(){
  const box=$("savedContainer");
  box.innerHTML="";
  const list=JSON.parse(localStorage.getItem(savedKey())||"[]");
  if(!list.length){box.textContent="No saved posts yet.";return}
  for(const id of list){
    try{
      const doc=await db().collection("posts").doc(id).get();
      if(doc.exists)renderPost(doc.id,doc.data(),box);
    }catch(e){console.warn(e)}
  }
}

/* DISCOVERY */
async function searchContent(){
  const term=value("searchInput").toLowerCase();
  if(!term)return say("Enter a search term.");
  const box=$("searchResults");
  box.innerHTML="";
  try{
    const snap=await db().collection("posts").limit(60).get();
    snap.forEach(doc=>{
      const d=doc.data();
      if((d.text||"").toLowerCase().includes(term)||
         (d.author||"").toLowerCase().includes(term)){
        renderPost(doc.id,d,box);
      }
    });
    if(!box.children.length)box.textContent="No matching posts found.";
  }catch(e){showError(e)}
}

/* MESSAGES */
function chatId(a,b){return[a,b].sort().join("_")}
function setupRecipient(){
  const box=$("messagesContainer");
  const input=document.createElement("input");
  input.id="recipientUid";
  input.placeholder="Enter the recipient's Unitary user ID";
  input.setAttribute("aria-label","Recipient user ID");
  box.before(input);
  const load=button("Load conversation",loadMessages,true);
  box.before(load);
}
async function sendMessage(e){
  e.preventDefault();
  const to=value("recipientUid")||recipientUid;
  const text=value("messageInput");
  if(!to||!text)return say("Enter a recipient ID and message.",true);
  if(to===user.uid)return say("You cannot message yourself.",true);
  try{
    await db().collection("chats").doc(chatId(user.uid,to))
      .collection("messages").add({
        from:user.uid,to,text,createdAt:timestamp()
      });
    $("messageInput").value="";
    recipientUid=to;
    loadMessages();
  }catch(e){showError(e)}
}
async function loadMessages(){
  const to=value("recipientUid")||recipientUid;
  if(!to)return say("Enter the recipient's user ID.",true);
  recipientUid=to;
  try{
    const snap=await db().collection("chats").doc(chatId(user.uid,to))
      .collection("messages").orderBy("createdAt").limit(100).get();
    const box=$("messagesContainer");
    box.innerHTML="";
    snap.forEach(doc=>{
      const d=doc.data();
      box.append(safeText("p",(d.from===user.uid?"You: ":"Them: ")+d.text));
    });
  }catch(e){showError(e)}
}

/* COMMUNITIES */
async function createCommunity(e){
  e.preventDefault();
  const name=value("communityName");
  if(!name)return say("Enter a community name.",true);
  try{
    await db().collection("communities").add({
      name,owner:user.uid,createdAt:timestamp()
    });
    $("communityForm").reset();
    say("Community created.");
    loadCommunities();
  }catch(e){showError(e)}
}
async function loadCommunities(){
  if(!user)return;
  try{
    const snap=await db().collection("communities").limit(50).get();
    const box=$("communitiesContainer");
    box.innerHTML="";
    if(snap.empty){box.textContent="No communities yet.";return}
    snap.forEach(doc=>{
      const d=doc.data();
      const item=document.createElement("article");
      item.className="post";
      item.append(safeText("h3",d.name||"Community"));
      item.append(safeText("p",d.description||""));
      box.append(item);
    });
  }catch(e){showError(e)}
}

/* NOTIFICATIONS */
async function loadNotifications(){
  if(!user)return;
  try{
    const snap=await db().collection("notifications")
      .where("uid","==",user.uid).limit(50).get();
    const box=$("notificationsContainer");
    box.innerHTML="";
    if(snap.empty){box.textContent="No notifications yet.";return}
    snap.forEach(doc=>box.append(safeText("p",doc.data().text||"Notification")));
  }catch(e){showError(e)}
}

/* FIND FRIENDS - OPTIONAL CONTACT PICKER */
async function accessContacts(){
  const status=$("contactsPermissionStatus");
  if(!navigator.contacts?.select){
    status.textContent="Your browser does not support contact selection. You can invite friends using their email or phone number below.";
    return;
  }
  try{
    selectedContacts=await navigator.contacts.select(["name","email","tel"],{multiple:true});
    $("contactsContainer").textContent=selectedContacts.map(c=>
      [...(c.name||[]),...(c.email||[]),...(c.tel||[])].join(" · ")
    ).join("\n")||"No contacts selected.";
    status.textContent=selectedContacts.length+" contacts selected on this device. Nothing has been uploaded.";
  }catch(e){status.textContent="Contact selection cancelled or unavailable."}
}
async function inviteFriend(){
  const destination=value("inviteContactInput");
  if(!destination)return say("Enter an email or phone number.");
  const text="Join me on Unitary!";
  try{
    if(navigator.share)await navigator.share({title:"Join Unitary",text});
    else if(navigator.clipboard){
      await navigator.clipboard.writeText(text);
      $("inviteMessage").textContent="Invitation message copied. Send it to your friend.";
    }else $("inviteMessage").textContent="Please copy this invitation: "+text;
  }catch(e){console.warn(e)}
}
function disconnectContacts(){
  selectedContacts=[];
  $("contactsContainer").textContent="";
  $("contactsPermissionStatus").textContent="No selected contacts are retained by this page.";
}

/* CALLS - PROVIDER NOT CONNECTED */
function callNotice(){
  say("Calling is not connected yet. A secure calling service and call interface are required.");
}

/* STARTUP AND EVENTS */
function bindEvents(){
  bind("authForm","submit",e=>{
    e.preventDefault();
    authMode==="signup"?register():login();
  });
  bind("loginTab","click",()=>setMode("login"));
  bind("signupTab","click",()=>setMode("signup"));
  bind("createPostForm","submit",createPost);
  bind("profileForm","submit",saveProfile);
  bind("messageForm","submit",sendMessage);
  bind("communityForm","submit",createCommunity);
  bind("accessContactsBtn","click",accessContacts);
  bind("syncContactsBtn","click",()=>say("Choose contacts first. Contact syncing is not enabled."));
  bind("disconnectContactsBtn","click",disconnectContacts);
  bind("inviteContactBtn","click",inviteFriend);
  bind("voiceCallBtn","click",callNotice);
  bind("videoCallBtn","click",callNotice);
  bind("searchInput","change",searchContent);
  bind("clearSelectedMediaBtn","click",()=>say("Select files again when you are ready to post."));
  bind("uploadMediaBtn","click",()=>say("Use Publish Post to upload selected post media."));
  document.querySelectorAll("[data-section]").forEach(b=>{
    b.addEventListener("click",()=>navigate(b.dataset.section));
  });
}
function start(){
  try{theme(localStorage.getItem("unitary_theme")||"light")}catch(e){theme("light")}
  bindEvents();
  setMode("login");
  if(!$("messagesContainer").dataset.recipientReady){
    $("messagesContainer").dataset.recipientReady="yes";
    setupRecipient();
  }
  if(!window.UNITARY_FIREBASE_READY||!window.auth||!window.db){
    showPublic();
    say("Firebase is not ready. Check config.js.",true);
    return;
  }
  auth().onAuthStateChanged(async current=>{
    user=current||null;
    if(!user){showPublic();return}
    showApp();
    await loadProfile();
    await loadPosts();
    await loadCommunities();
    await loadNotifications();
  });
}
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",start);
}else start();

})();
