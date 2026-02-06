export function createApp() {
  const content = document.createElement("div");
  content.style.height = "100%";
  content.style.display = "grid";
  content.style.placeItems = "center";
  content.style.color = "var(--text)";

  const card = document.createElement("div");
  card.style.padding = "18px 20px";
  card.style.border = "1px solid rgba(255,255,255,0.15)";
  card.style.borderRadius = "12px";
  card.style.background = "rgba(10,16,22,0.6)";
  card.style.textAlign = "center";

  const title = document.createElement("div");
  title.textContent = "Pineball";
  title.style.fontSize = "1.1rem";
  title.style.fontWeight = "600";

  const subtitle = document.createElement("div");
  subtitle.textContent = "Under reconstruction";
  subtitle.style.color = "var(--muted)";
  subtitle.style.marginTop = "6px";

  card.appendChild(title);
  card.appendChild(subtitle);
  content.appendChild(card);

  return {
    title: "Pineball",
    width: 600,
    height: 420,
    content,
  };
}
