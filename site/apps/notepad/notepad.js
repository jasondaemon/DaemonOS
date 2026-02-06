export function createApp() {
  const content = document.createElement("div");
  content.style.height = "100%";

  const textarea = document.createElement("textarea");
  textarea.className = "notepad-textarea";
  textarea.placeholder = "Start typing...";
  textarea.value = localStorage.getItem("daemonos.notepad") || "";
  textarea.addEventListener("input", () => {
    localStorage.setItem("daemonos.notepad", textarea.value);
  });

  content.appendChild(textarea);

  return {
    title: "Notepad",
    width: 520,
    height: 380,
    content,
  };
}
