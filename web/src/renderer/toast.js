let toastElement;
let dismissTimer;
let exitTimer;

const TOAST_DURATION = 4000;
const EXIT_DURATION = 180;

function getToastElement() {
    if (toastElement) {
        return toastElement;
    }

    toastElement = document.createElement("div");
    toastElement.id = "operation-toast";
    toastElement.setAttribute("popover", "manual");
    toastElement.setAttribute("aria-atomic", "true");
    document.body.appendChild(toastElement);
    return toastElement;
}

export function showToast(type, message) {
    const toast = getToastElement();
    const isError = type === "error";
    const icon = document.createElement("span");
    const text = document.createElement("span");

    clearTimeout(dismissTimer);
    clearTimeout(exitTimer);
    toast.classList.remove("is-dismissing");
    toast.className = `operation-toast ${isError ? "is-error" : "is-success"}`;
    toast.setAttribute("role", isError ? "alert" : "status");
    toast.setAttribute("aria-live", isError ? "assertive" : "polite");

    icon.className = "operation-toast-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = isError ? "!" : "✓";
    text.className = "operation-toast-message";
    text.textContent = message;
    toast.replaceChildren(icon, text);

    if (toast.matches(":popover-open")) {
        toast.hidePopover();
    }

    toast.showPopover();
    dismissTimer = window.setTimeout(() => {
        if (!toast.matches(":popover-open")) {
            return;
        }

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            toast.hidePopover();
            return;
        }

        toast.classList.add("is-dismissing");
        exitTimer = window.setTimeout(() => {
            toast.classList.remove("is-dismissing");
            if (toast.matches(":popover-open")) {
                toast.hidePopover();
            }
        }, EXIT_DURATION);
    }, TOAST_DURATION);
}
