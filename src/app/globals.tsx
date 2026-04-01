@import "tailwindcss";

:root {
  --arc-bg: #0b1020;
  --arc-bg-2: #111a33;
  --arc-panel: rgba(17, 26, 51, 0.72);
  --arc-panel-strong: rgba(11, 16, 32, 0.9);
  --arc-border: rgba(255, 255, 255, 0.08);
  --arc-border-strong: rgba(106, 228, 255, 0.2);
  --arc-text: #e8ecf5;
  --arc-muted: #8d9ab5;
  --arc-cyan: #6ae4ff;
  --arc-cyan-soft: rgba(106, 228, 255, 0.12);
  --arc-blue: #4da3ff;
  --arc-shadow: 0 20px 60px rgba(0, 0, 0, 0.32);
  --arc-radius: 24px;
}

* {
  box-sizing: border-box;
}

html,
body {
  min-height: 100%;
}

body {
  margin: 0;
  color: var(--arc-text);
  background:
    radial-gradient(circle at top left, rgba(106, 228, 255, 0.1), transparent 22%),
    radial-gradient(circle at top right, rgba(77, 163, 255, 0.08), transparent 18%),
    linear-gradient(180deg, #08101f 0%, #0b1020 42%, #060b16 100%);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

::selection {
  background: rgba(106, 228, 255, 0.22);
  color: white;
}

.scrollbar-thin-dark {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.16) transparent;
}

.scrollbar-thin-dark::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.scrollbar-thin-dark::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin-dark::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.16);
  border-radius: 999px;
}

.arc-panel {
  border: 1px solid var(--arc-border);
  background: var(--arc-panel);
  backdrop-filter: blur(18px);
  box-shadow: var(--arc-shadow);
}

.arc-panel-strong {
  border: 1px solid var(--arc-border);
  background: var(--arc-panel-strong);
  backdrop-filter: blur(18px);
  box-shadow: var(--arc-shadow);
}

.arc-code {
  background:
    linear-gradient(180deg, rgba(106, 228, 255, 0.03), rgba(77, 163, 255, 0.02)),
    rgba(5, 10, 22, 0.94);
  border: 1px solid var(--arc-border);
}

.json-key {
  color: #6ae4ff;
}

.json-string {
  color: #8fe8bf;
}

.json-number {
  color: #ffd86a;
}

.json-boolean {
  color: #ff9fe0;
}

.json-null {
  color: #ff9b9b;
}

.prose-reset {
  all: unset;
}

details > summary {
  list-style: none;
}

details > summary::-webkit-details-marker {
  display: none;
}
