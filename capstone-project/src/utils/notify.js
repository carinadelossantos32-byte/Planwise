import "./notify.css";

const VISIBLE_MS = 6000;

// In-app replacement for the browser's alert(): a notice that closes by itself
export function notify(message) {
  let stack = document.getElementById("notify-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "notify-stack";
    document.body.appendChild(stack);
  }

  const notice = document.createElement("div");
  notice.className = "notify-notice";
  notice.setAttribute("role", "alert");

  const text = document.createElement("span");
  text.textContent = String(message);

  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss");
  close.textContent = "×";

  const remove = () => notice.remove();
  close.addEventListener("click", remove);
  setTimeout(remove, VISIBLE_MS);

  notice.append(text, close);
  stack.appendChild(notice);
}
