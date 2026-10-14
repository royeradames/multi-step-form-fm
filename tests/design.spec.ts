import { expect, test, type Page } from "@playwright/test";
import { box, controlContrast, fillInfo, layoutProblems, next, open, reachPlan, reachSummary, smallText, textContrast } from "./helpers";

const siteName = "Multi-step Form";
const siteUrl = "https://multi-step-form-fm.royeradames.com/";
// Next writes og:url and canonical without the trailing slash; either form names the same page.
const siteUrlPattern = /^https:\/\/multi-step-form-fm\.royeradames\.com\/?$/;

test("identity, canonical, sharing image, icon references and two-line attribution match the sibling sites", async ({ page }) => {
  await open(page);
  await expect(page).toHaveTitle("Multi-step form | Multi-step Form");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /Frontend Mentor.*local practice subscription/);
  await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute("content", siteName);
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute("content", siteUrlPattern);
  const jsonLd: unknown = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  expect(jsonLd).toEqual({ "@context": "https://schema.org", "@type": "WebSite", name: siteName, url: siteUrl });
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", siteUrlPattern);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /opengraph-image/);
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /Multi-step Form/);
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
  await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute("href", "/icon.svg");
  await expect(page.locator('link[rel="icon"][sizes="96x96"]')).toHaveAttribute("href", "/icon-96.png");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/apple-touch-icon.png");
  for (const path of ["/icon.svg", "/icon-96.png", "/apple-touch-icon.png", "/opengraph-image"]) expect((await page.request.get(path)).status(), path).toBe(200);
  await expect(page.locator(".site-footer p")).toHaveCount(2);
  await expect(page.locator(".site-footer p").nth(0)).toHaveText("Practice demo. Your details stay on this page and reset when you reload. Nothing is sent.");
  await expect(page.locator(".site-footer p").nth(1)).toHaveText("Challenge by Frontend Mentor. Built by Royer Adames.");
  await expect(page.locator(".site-footer").getByRole("link", { name: "Frontend Mentor", exact: true })).toHaveAttribute("href", "https://www.frontendmentor.io/challenges/multistep-form-YVAnSdqQBJ");
  await expect(page.locator(".site-footer").getByRole("link", { name: "Royer Adames", exact: true })).toHaveAttribute("href", "https://royeradames.com");
});

test("1440 px desktop centres the 940 by 600 white card with FM's sidebar and 450 px content", async ({ page }) => {
  await open(page);
  const card = await box(page, ".form-card");
  expect(card).toMatchObject({ x: 250, y: 212, width: 940, height: 600 });
  expect(card.x + card.width / 2).toBe(720);
  expect(card.y + card.height / 2).toBe(512);
  const sidebar = await box(page, ".step-sidebar");
  expect(sidebar).toMatchObject({ x: 266, y: 228, width: 274, height: 568 });
  expect((await box(page, ".step-panel")).width).toBe(450);
  expect((await box(page, ".step-panel")).x).toBe(640);
  await expect(page.locator(".form-card")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(240, 245, 255)");
  await expect(page.locator("body")).toHaveCSS("font-family", /Ubuntu/);
  await expect(page.locator(".step-sidebar")).toHaveCSS("background-image", /bg-sidebar-desktop\.svg/);
  const nextButton = await box(page, ".primary-button");
  expect(nextButton.x + nextButton.width).toBe(1090);
  expect(nextButton.y + nextButton.height).toBe(780);
});

test("375 px mobile uses the 172 px image band, overlapping white card and bottom action bar", async ({ page }) => {
  await open(page, 375);
  expect(await box(page, ".step-sidebar")).toMatchObject({ x: 0, y: 0, width: 375, height: 172 });
  expect(await box(page, ".step-panel")).toMatchObject({ x: 16, y: 99, width: 343 });
  await expect(page.locator(".step-sidebar")).toHaveCSS("background-image", /bg-sidebar-mobile\.svg/);
  const actions = await box(page, ".form-actions");
  expect(actions.x).toBe(0);
  expect(actions.width).toBe(375);
  expect(actions.y + actions.height).toBe(1024);
  const nextButton = await box(page, ".primary-button");
  expect(nextButton.x + nextButton.width).toBe(359);
  await reachPlan(page);
  const cards = await page.locator(".plan-card").all();
  const first = await cards[0].boundingBox();
  const second = await cards[1].boundingBox();
  expect(first?.width).toBe(295);
  expect(second?.x).toBe(first?.x);
  expect(second?.y).toBeGreaterThan((first?.y ?? 0) + (first?.height ?? 0));
});

async function expectLayout(page: Page, context: string) {
  const problems = await layoutProblems(page);
  expect(problems.scroll, `sideways scroll: ${context}`).toBeLessThanOrEqual(0);
  expect(problems.wrapped, `wrapped buttons: ${context}`).toEqual([]);
  expect(problems.overflow, `content overflow: ${context}`).toEqual([]);
  expect(await smallText(page), `text below 16 px: ${context}`).toEqual([]);
  await expect(page.locator("button[disabled]")).toHaveCount(0);
}

test("320-1920 width sweep covers errors, each step, both billing periods and thank-you", async ({ page }) => {
  test.setTimeout(300_000);
  await open(page);
  const widths = [...new Set([...Array.from({ length: 161 }, (_, i) => 320 + i * 10), 359, 360, 375, 767, 768, 1023, 1024])].sort((a, b) => a - b);
  async function sweep(state: string) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 1024 });
      await expectLayout(page, `${state}, ${width}`);
    }
  }
  await page.getByRole("button", { name: "Next Step", exact: true }).click();
  await expect(page.locator(".field-error:visible")).toHaveCount(3);
  await sweep("personal info errors");
  await fillInfo(page, { name: "VeryLongUnbrokenName".repeat(20), email: "stephenking@lorem.com", phone: "+1 234 567 890" });
  await next(page, "Select your plan");
  await page.getByRole("button", { name: "Next Step", exact: true }).click();
  await sweep("plan selection error");
  await page.getByRole("radio", { name: "Arcade", exact: true }).check();
  await sweep("monthly plans");
  await page.getByRole("switch").click();
  await sweep("yearly plans");
  await next(page, "Pick add-ons");
  await sweep("yearly add-ons");
  await next(page, "Finishing up");
  await sweep("yearly summary");
  await page.getByRole("button", { name: "Change", exact: true }).click();
  await page.getByRole("switch").click();
  await next(page, "Pick add-ons");
  await sweep("monthly add-ons");
  await next(page, "Finishing up");
  await sweep("monthly summary");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await sweep("thank-you");
});

async function expectContrast(page: Page, context: string) {
  for (const pair of await textContrast(page)) expect(pair.ratio, `${context}: ${pair.text}`).toBeGreaterThanOrEqual(4.5);
  for (const pair of await controlContrast(page)) expect(pair.ratio, `${context}: ${pair.label}`).toBeGreaterThanOrEqual(3);
}

async function hoverControls(page: Page, context: string) {
  await expectContrast(page, `${context}, rest`);
  for (const target of await page.locator("button:visible,a:visible,.plan-card:visible,.add-on-card:visible,.info-field input:visible").all()) {
    await target.hover();
    await expectContrast(page, `${context}, hover ${await target.textContent()}`);
  }
}

test("text passes 4.5:1 and control borders pass 3:1 at rest and hover throughout the flow", async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [1440, 375]) {
    await open(page, width);
    await hoverControls(page, `info ${width}`);
    await page.getByRole("button", { name: "Next Step", exact: true }).click();
    await hoverControls(page, `required errors ${width}`);
    await fillInfo(page, { name: "Stephen King", email: "invalid@", phone: "+1 234 567 890" });
    await expect(page.locator("#email-error")).toHaveText("Enter a valid email address");
    await hoverControls(page, `email error ${width}`);
    await page.locator("#email").fill("stephenking@lorem.com");
    await next(page, "Select your plan");
    await page.getByRole("button", { name: "Next Step", exact: true }).click();
    await hoverControls(page, `plan error ${width}`);
    await page.getByRole("radio", { name: "Arcade", exact: true }).check();
    await hoverControls(page, `monthly plans ${width}`);
    await page.getByRole("switch").click();
    await hoverControls(page, `yearly plans ${width}`);
    await next(page, "Pick add-ons");
    await hoverControls(page, `add-ons ${width}`);
    await page.getByRole("checkbox", { name: "Customizable Profile", exact: true }).check();
    await next(page, "Finishing up");
    await hoverControls(page, `summary ${width}`);
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await hoverControls(page, `thank-you ${width}`);
  }
});

test("200% text still reflows through every step at mobile and desktop widths", async ({ page }) => {
  test.setTimeout(120_000);
  for (const width of [320, 375, 768, 1440, 1920]) {
    await open(page, width);
    await page.addStyleTag({ content: "html { font-size: 200%; }" });
    await page.getByRole("button", { name: "Next Step", exact: true }).click();
    await expectLayout(page, `200% info errors, ${width}`);
    await reachPlan(page);
    await page.getByRole("radio", { name: "Advanced", exact: true }).check();
    await page.getByRole("switch").click();
    await expectLayout(page, `200% yearly plans, ${width}`);
    await next(page, "Pick add-ons");
    await expectLayout(page, `200% add-ons, ${width}`);
    await next(page, "Finishing up");
    await expectLayout(page, `200% summary, ${width}`);
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expectLayout(page, `200% thank-you, ${width}`);
  }
});

test("meaningful checkmarks and focus indicators keep FM assets and passing contrast", async ({ page }) => {
  await open(page);
  await reachSummary(page);
  await page.getByRole("button", { name: "Go Back", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Online service", exact: true })).toHaveCSS("background-image", /icon-checkmark\.svg/);
  await expect(page.getByRole("checkbox", { name: "Online service", exact: true })).toHaveCSS("background-color", "rgb(71, 61, 255)");
  await page.getByRole("checkbox", { name: "Online service", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("checkbox", { name: "Larger storage", exact: true })).toHaveCSS("outline-width", "3px");
  const ratio = await page.evaluate(() => {
    const colour = getComputedStyle(document.querySelector<HTMLInputElement>('input[name="largerStorage"]') ?? document.body).outlineColor;
    const [r, g, b] = (colour.match(/[\d.]+/g) ?? []).slice(0, 3).map((value) => {
      const s = Number(value) / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(3);
});
