import { expect, type Page } from "@playwright/test";

export async function waitForHydrated(page: Page) {
  await expect(page.locator("#subscription-form")).toHaveAttribute("data-hydrated", "true");
}

export async function open(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: 1024 });
  await page.goto("/");
  await waitForHydrated(page);
  await page.evaluate(() => document.fonts.ready);
}

export async function box(page: Page, selector: string) {
  const bounds = await page.locator(selector).first().boundingBox();
  if (!bounds) throw new Error(`Missing visible element: ${selector}`);
  return bounds;
}

export async function fillInfo(page: Page, values = { name: "Stephen King", email: "stephenking@lorem.com", phone: "+1 234 567 890" }) {
  await page.getByRole("textbox", { name: "Name", exact: true }).fill(values.name);
  await page.getByRole("textbox", { name: "Email Address", exact: true }).fill(values.email);
  await page.getByRole("textbox", { name: "Phone Number", exact: true }).fill(values.phone);
}

export async function next(page: Page, title: string) {
  await page.getByRole("button", { name: "Next Step", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
}

export async function reachPlan(page: Page) {
  await fillInfo(page);
  await next(page, "Select your plan");
}

export async function reachSummary(page: Page, billing: "monthly" | "yearly" = "monthly") {
  await reachPlan(page);
  await page.getByRole("radio", { name: "Arcade", exact: true }).check();
  if (billing === "yearly") await page.getByRole("switch", { name: "Monthly Yearly", exact: true }).click();
  await next(page, "Pick add-ons");
  await page.getByRole("checkbox", { name: "Online service", exact: true }).setChecked(true);
  await page.getByRole("checkbox", { name: "Larger storage", exact: true }).setChecked(true);
  await page.getByRole("checkbox", { name: "Customizable Profile", exact: true }).setChecked(false);
  await next(page, "Finishing up");
}

export async function smallText(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim() || parent.closest("script,style,noscript,.sr-only,[hidden]")) continue;
      if (!parent.getClientRects().length) continue;
      const sidebarLabel = parent.closest(".step-label");
      if (sidebarLabel && sidebarLabel.getBoundingClientRect().width <= 1) continue;
      if (parseFloat(getComputedStyle(parent).fontSize) < 16) out.push(node.textContent.trim());
    }
    for (const input of document.querySelectorAll<HTMLInputElement>('input:not([type="radio"]):not([type="checkbox"])')) {
      if (input.getClientRects().length && parseFloat(getComputedStyle(input).fontSize) < 16) out.push(input.value || input.placeholder);
    }
    return out;
  });
}

export async function textContrast(page: Page) {
  return page.evaluate(() => {
    const parse = (colour: string) => {
      const values = colour.match(/\d+(\.\d+)?/g);
      if (!values) throw new Error(`Unrecognised colour: ${colour}`);
      return values.slice(0, 3).map(Number);
    };
    const lum = (rgb: number[]) => {
      const [r, g, b] = rgb.map((value) => {
        const s = value / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bg = (element: Element | null): string => {
      while (element) {
        const colour = getComputedStyle(element).backgroundColor;
        if (colour !== "rgba(0, 0, 0, 0)" && colour !== "transparent") return colour;
        element = element.parentElement;
      }
      return "rgb(255, 255, 255)";
    };
    const ratio = (foreground: string, background: string) => {
      const [a, b] = [lum(parse(foreground)), lum(parse(background))].sort((x, y) => y - x);
      return (a + 0.05) / (b + 0.05);
    };
    const pairs: { text: string; ratio: number }[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || !node.textContent?.trim() || parent.closest("script,style,noscript,.sr-only,[hidden]") || !parent.getClientRects().length) continue;
      const sidebarLabel = parent.closest(".step-label");
      if (sidebarLabel && sidebarLabel.getBoundingClientRect().width <= 1) continue;
      pairs.push({ text: node.textContent.trim(), ratio: ratio(getComputedStyle(parent).color, bg(parent)) });
    }
    for (const input of document.querySelectorAll<HTMLInputElement>('input:not([type="radio"]):not([type="checkbox"])')) {
      if (!input.getClientRects().length) continue;
      const colour = input.value ? getComputedStyle(input).color : getComputedStyle(input, "::placeholder").color;
      pairs.push({ text: input.value || input.placeholder, ratio: ratio(colour, bg(input)) });
    }
    return pairs;
  });
}

export async function controlContrast(page: Page) {
  return page.evaluate(() => {
    const lum = (colour: string) => {
      const [r, g, b] = (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map((value) => {
        const s = Number(value) / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [light, dark] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (light + 0.05) / (dark + 0.05);
    };
    return [...document.querySelectorAll<HTMLElement>(".info-field input,.plan-card,.add-on-card input,.billing-switch")]
      .filter((element) => element.getClientRects().length > 0)
      .map((element) => {
        const style = getComputedStyle(element);
        if (element.matches(".billing-switch")) return { label: "billing switch", ratio: ratio(style.backgroundColor, "rgb(255, 255, 255)") };
        const card = element.closest(".add-on-card");
        const background = card ? getComputedStyle(card).backgroundColor : style.backgroundColor;
        return { label: element.getAttribute("name") || element.className, ratio: ratio(style.borderTopColor, background) };
      });
  });
}

export async function layoutProblems(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => !!element.getClientRects().length && !element.closest("[hidden]");
    const wrapped: string[] = [];
    for (const element of document.querySelectorAll<HTMLButtonElement>("button")) {
      if (!visible(element)) continue;
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (!node.textContent?.trim() || node.parentElement?.closest(".sr-only")) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        if (new Set([...range.getClientRects()].map((rect) => Math.round(rect.top))).size > 1) wrapped.push(element.textContent ?? "");
      }
    }
    const overflow = [...document.querySelectorAll<HTMLElement>(".step-panel,.step-body,.info-field,.plan-card,.add-on-card,.summary-box,.summary-total,.form-actions,button")]
      .filter((element) => visible(element) && element.scrollWidth > element.clientWidth + 1)
      .map((element) => element.className || element.tagName);
    return { scroll: document.documentElement.scrollWidth - innerWidth, wrapped, overflow };
  });
}
