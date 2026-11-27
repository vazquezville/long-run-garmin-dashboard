const root = document.documentElement;

// Storage can be unavailable in private windows
function remember(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

function markPressed(attribute: string, selected: string) {
  for (const button of document.querySelectorAll(`[${attribute}]`)) {
    button.setAttribute("aria-pressed", String(button.getAttribute(attribute) === selected));
  }
}

function sync() {
  markPressed("data-theme-option", root.dataset.theme ?? "system");
  markPressed("data-range-option", root.dataset.range ?? "");
}

document.addEventListener("click", (event) => {
  const button = (event.target as Element).closest<HTMLElement>("[data-theme-option], [data-range-option]");
  if (!button) return;
  const { themeOption, rangeOption } = button.dataset;

  if (themeOption === "system") {
    delete root.dataset.theme;
    remember("theme", null);
  } else if (themeOption) {
    root.dataset.theme = themeOption;
    remember("theme", themeOption);
  }
  if (rangeOption) {
    root.dataset.range = rangeOption;
    remember("range", rangeOption);
  }
  sync();
});

sync();
