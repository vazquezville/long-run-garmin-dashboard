import type { Tip } from "../lib/chart.ts";

const tooltip = document.getElementById("tooltip")!;
const offset = 14;
let active: HTMLElement | null = null;

function element(tag: string, className: string, text = "") {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

// Uses textContent because activity names come from the API
function render({ title, rows }: Tip) {
  const lines = rows.map((row) => {
    const line = element("div", "tooltipRow");
    if (row.color) {
      const key = element("i", "tooltipKey");
      key.style.setProperty("--color", row.color);
      line.append(key);
    }
    line.append(element("strong", "", row.value), element("span", "", row.label));
    return line;
  });
  tooltip.replaceChildren(element("div", "tooltipTitle", title), ...lines);
}

function hide() {
  active?.classList.remove("isActive");
  active = null;
  tooltip.hidden = true;
}

function show(target: HTMLElement, x: number, y: number) {
  if (target !== active) {
    hide();
    active = target;
    target.classList.add("isActive");
    render(JSON.parse(target.dataset.tip!));
    tooltip.hidden = false;
  }
  const { width, height } = tooltip.getBoundingClientRect();
  const left = x + offset + width > window.innerWidth ? x - offset - width : x + offset;
  const top = y + offset + height > window.innerHeight ? y - offset - height : y + offset;
  tooltip.style.left = `${Math.max(8, left)}px`;
  tooltip.style.top = `${Math.max(8, top)}px`;
}

function showAtElement(target: HTMLElement) {
  const box = target.getBoundingClientRect();
  show(target, box.left + box.width / 2, box.top + Math.min(box.height / 2, 40));
}

function onPointer(event: PointerEvent) {
  const target = (event.target as Element).closest<HTMLElement>("[data-tip]");
  if (target) show(target, event.clientX, event.clientY);
  else hide();
}

document.addEventListener("pointermove", onPointer);
document.addEventListener("pointerdown", onPointer);
document.documentElement.addEventListener("pointerleave", hide);
document.addEventListener("scroll", hide, { capture: true, passive: true });
document.addEventListener("focusout", hide);

document.addEventListener("focusin", (event) => {
  const target = event.target as HTMLElement;
  if (!target.matches(":focus-visible")) return;
  if (target.matches("[data-tip]")) showAtElement(target);
  const last = target.matches("[data-chart]") ? [...target.querySelectorAll<HTMLElement>("[data-tip]")].at(-1) : undefined;
  if (last) showAtElement(last);
});

// Arrow keys walk through the values of a focused chart
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") return hide();
  const chart = (event.target as Element).closest("[data-chart]");
  if (!chart) return;
  const items = [...chart.querySelectorAll<HTMLElement>("[data-tip]")];
  const current = active ? items.indexOf(active) : items.length - 1;
  const moves: Record<string, number> = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: items.length - 1 };
  const next = moves[event.key];
  if (next === undefined) return;
  event.preventDefault();
  const item = items[Math.min(Math.max(next, 0), items.length - 1)];
  if (item) showAtElement(item);
});
