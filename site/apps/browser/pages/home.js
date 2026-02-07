const form = document.getElementById("search-form");
const input = document.getElementById("search-input");

const openExternal = (url) => {
  try {
    window.parent?.postMessage({ type: "openExternal", url }, "*");
  } catch {
    // ignore
  }
  window.open(url, "_blank", "noopener,noreferrer");
};

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) return;
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  openExternal(url);
});

document.querySelectorAll("a[target='_blank']").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const url = link.getAttribute("href");
    if (url) openExternal(url);
  });
});
