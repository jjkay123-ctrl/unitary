const supabaseClient = window.supabase.createClient(
  window.UNITARY_CONFIG.supabaseUrl,
  window.UNITARY_CONFIG.supabaseAnonKey
);

const form = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const message = document.getElementById("message");
const submitBtn = document.getElementById("submitBtn");
const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");

let mode = "login";

function showMessage(text) {
  message.textContent = text;
}

loginTab.addEventListener("click", () => {
  mode = "login";
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
  submitBtn.textContent = "Log in";
  showMessage("");
});

signupTab.addEventListener("click", () => {
  mode = "signup";
  signupTab.classList.add("active");
  loginTab.classList.remove("active");
  submitBtn.textContent = "Create account";
  showMessage("");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  submitBtn.disabled = true;
  showMessage("Please wait...");

  try {
    if (mode === "signup") {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      showMessage(
        data.session
          ? "Account created successfully!"
          : "Check your email to confirm your account."
      );
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      showMessage("Welcome back to Unitary!");
    }
  } catch (error) {
    showMessage(error.message);
  } finally {
    submitBtn.disabled = false;
  }
});

supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session) {
    showMessage("You are signed in to Unitary!");
  }
});
