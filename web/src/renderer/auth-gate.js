import {getQuotes} from "../quote-utilities/quote-service.js";
import {
    auth,
    onAuthStateChanged,
    signInWithGoogleTokens,
    signOut,
} from "../quote-utilities/firebase-client.js";

const dialog = document.getElementById("auth-dialog");
const title = document.getElementById("auth-dialog-title");
const message = document.getElementById("auth-dialog-message");
const account = document.getElementById("auth-dialog-account");
const action = document.getElementById("auth-dialog-action");

let activeUser = null;
let actionKind = "";
let isBusy = false;
let accessCheckId = 0;
let accessGranted = false;
let isSwitchingAccount = false;

function ensureOpen() {
    if (!dialog.open) {
        dialog.showModal();
    }
}

function focusPrimary() {
    requestAnimationFrame(() => {
        if (action.hidden) {
            dialog.focus({preventScroll: true});
        } else {
            action.focus({preventScroll: true});
        }
    });
}

function showState(state, user = null) {
    const states = {
        checking: {
            title: "Checking sign-in…",
            message: "Restoring the saved Google session.",
            action: "",
            kind: "",
            busy: true,
        },
        signIn: {
            title: "Sign in required",
            message: "Sign in with the approved Google account to continue.",
            action: "Sign in with Google",
            kind: "sign-in",
            busy: false,
        },
        waiting: {
            title: "Waiting for Google sign-in…",
            message: "Complete sign-in in your system browser, then return here.",
            action: "",
            kind: "",
            busy: true,
        },
        checkingAccess: {
            title: "Checking access…",
            message: "Checking this account against the Quotes database.",
            action: "",
            kind: "",
            busy: true,
        },
        denied: {
            title: "This account is not allowed",
            message: "This Google account cannot access the quote database.",
            action: "Try a different account",
            kind: "switch-account",
            busy: false,
        },
        verifyError: {
            title: "Unable to verify access",
            message: "The account could not be checked. Confirm your connection and try again.",
            action: "Retry",
            kind: "retry",
            busy: false,
        },
        signInError: {
            title: "Sign-in could not be completed",
            message: "Google sign-in did not complete. Try again.",
            action: "Try again",
            kind: "sign-in",
            busy: false,
        },
    }[state];

    title.textContent = states.title;
    message.textContent = states.message;
    actionKind = states.kind;
    isBusy = states.busy;
    action.textContent = states.action;
    action.hidden = !states.action;
    action.disabled = isBusy;

    if (state === "denied" && user?.email) {
        account.textContent = `Signed in as ${user.email}.`;
        account.hidden = false;
    } else {
        account.textContent = "";
        account.hidden = true;
    }

    ensureOpen();
    focusPrimary();
}

function isPermissionDenied(error) {
    return error?.code === "permission-denied";
}

async function verifyAccess(user, onAuthorized) {
    const checkId = ++accessCheckId;
    showState("checkingAccess", user);

    try {
        const quotes = await getQuotes();

        if (checkId !== accessCheckId || activeUser !== user) {
            return;
        }

        isBusy = false;
        accessGranted = true;
        dialog.close();
        onAuthorized(quotes);
    } catch (error) {
        if (checkId !== accessCheckId || activeUser !== user) {
            return;
        }

        if (isPermissionDenied(error)) {
            showState("denied", user);
        } else {
            showState("verifyError", user);
        }
    }
}

async function beginSignIn() {
    if (isBusy) {
        return;
    }

    showState("waiting");

    try {
        const tokens = await window.auth.beginGoogleSignIn();
        await signInWithGoogleTokens(tokens);
    } catch (error) {
        console.error("Google sign-in failed:", error);
        showState("signInError");
    }
}

async function switchAccount() {
    if (isBusy) {
        return;
    }

    isSwitchingAccount = true;
    isBusy = true;
    action.disabled = true;

    try {
        await signOut(auth);
        isBusy = false;
        await beginSignIn();
        isSwitchingAccount = false;
    } catch (error) {
        isSwitchingAccount = false;
        console.error("Google account switch failed:", error);
        showState("signInError");
    }
}

function retryAccess(onAuthorized) {
    if (!activeUser || isBusy) {
        return;
    }

    void verifyAccess(activeUser, onAuthorized);
}

export function startAuthGate({onAuthorized}) {
    dialog.addEventListener("cancel", (event) => event.preventDefault());
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);
    dialog.addEventListener("close", () => {
        if (!accessGranted) {
            ensureOpen();
            focusPrimary();
        }
    });
    action.addEventListener("click", () => {
        if (actionKind === "sign-in") {
            void beginSignIn();
        } else if (actionKind === "switch-account") {
            void switchAccount();
        } else if (actionKind === "retry") {
            retryAccess(onAuthorized);
        }
    });

    showState("checking");

    return onAuthStateChanged(auth, (user) => {
        activeUser = user;
        accessCheckId += 1;

        if (!user) {
            if (isSwitchingAccount) {
                return;
            }

            accessGranted = false;
            isBusy = false;
            showState("signIn");
            return;
        }

        void verifyAccess(user, onAuthorized);
    });
}
