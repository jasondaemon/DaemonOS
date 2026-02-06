const form = document.getElementById("search-form");
const input = document.getElementById("search-input");

form?.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) return;
  const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
  window.open(url, "_blank", "noopener,noreferrer");
});
