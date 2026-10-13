import { expect, test } from "@playwright/test";
import { fillInfo, next, open, reachPlan, reachSummary, waitForHydrated } from "./helpers";

const thankYouText = "Thanks for confirming your subscription! We hope you have fun using our platform. If you ever need support, please feel free to email us at support@loremgaming.com.";

test("empty personal info reports all three required errors, links them and focuses Name", async ({ page }) => {
  await open(page);
  await expect(page.locator(".field-error:visible")).toHaveCount(0);
  await page.getByRole("button", { name: "Next Step", exact: true }).click();
  await expect(page.locator(".field-error:visible")).toHaveCount(3);
  for (const id of ["name", "email", "phone"]) {
    await expect(page.locator(`#${id}-error`)).toHaveText("This field is required");
    await expect(page.locator(`#${id}`)).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(`#${id}`)).toHaveAttribute("aria-describedby", `${id}-error`);
  }
  await expect(page.locator("#name")).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Personal info");
  await page.locator("#name").fill("Stephen King");
  await expect(page.locator("#name-error")).toHaveCount(0);
  await expect(page.locator("#name")).toHaveAttribute("aria-invalid", "false");
  await page.getByRole("button", { name: "Next Step", exact: true }).click();
  await expect(page.locator("#email")).toBeFocused();
  await expect(page.locator("button[disabled]")).toHaveCount(0);
});

test("malformed email is an inline format error and revalidates after the failed attempt", async ({ page }) => {
  await open(page);
  await fillInfo(page, { name: "Vanessa Mint", email: "vanessamint@", phone: "+1 234 567 890" });
  await expect(page.locator(".field-error:visible")).toHaveCount(0);
  await page.getByRole("button", { name: "Next Step", exact: true }).click();
  await expect(page.locator("#email-error")).toHaveText("Enter a valid email address");
  await expect(page.locator("#email")).toBeFocused();
  await expect(page.locator("#email")).toHaveAttribute("aria-describedby", "email-error");
  await page.locator("#email").fill("vanessamint@example.com");
  await expect(page.locator("#email-error")).toHaveCount(0);
  await next(page, "Select your plan");
});

test("no default plan exposes selection validation and focuses the first radio", async ({ page }) => {
  await open(page);
  await reachPlan(page);
  await expect(page.locator('input[name="plan"]:checked')).toHaveCount(0);
  await expect(page.locator(".plan-fieldset legend")).toBeVisible();
  await page.getByRole("button", { name: "Next Step", exact: true }).click();
  await expect(page.locator("#plan-error")).toHaveText("Please select a plan");
  await expect(page.getByRole("radio", { name: "Arcade", exact: true })).toBeFocused();
  for (const radio of await page.getByRole("radio").all()) {
    await expect(radio).toHaveAttribute("aria-invalid", "true");
    await expect(radio).toHaveAttribute("aria-describedby", "plan-error");
  }
  await page.getByRole("radio", { name: "Advanced", exact: true }).check();
  await expect(page.locator("#plan-error")).toHaveCount(0);
  await next(page, "Pick add-ons");
});

for (const billing of ["monthly", "yearly"] satisfies ("monthly" | "yearly")[]) {
  test(`full ${billing} journey uses FM prices and confirms the exact thank-you copy`, async ({ page }) => {
    await open(page);
    await reachSummary(page, billing);
    const yearly = billing === "yearly";
    await expect(page.locator(".summary-plan")).toContainText(`Arcade (${yearly ? "Yearly" : "Monthly"})`);
    await expect(page.locator(".summary-plan > strong")).toHaveText(yearly ? "$90/yr" : "$9/mo");
    await expect(page.locator(".summary-add-ons li")).toHaveText(yearly ? ["Online service+$10/yr", "Larger storage+$20/yr"] : ["Online service+$1/mo", "Larger storage+$2/mo"]);
    await expect(page.locator(".summary-total > span")).toHaveText(`Total (per ${yearly ? "year" : "month"})`);
    await expect(page.locator(".summary-total > strong")).toHaveText(yearly ? "$120/yr" : "+$12/mo");
    await page.getByRole("button", { name: "Confirm", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Thank you!", exact: true })).toBeFocused();
    await expect(page.locator(".thank-you p")).toHaveText(thankYouText);
    await expect(page.locator('.step-list [aria-current="step"] .step-number')).toHaveText("4");
    await expect(page.locator(".form-actions")).toHaveCount(0);
  });
}

test("Go Back preserves the exact draft and every selection through steps 1-4", async ({ page }) => {
  await open(page);
  const original = { name: "  Vanessa   Mint  ", email: "vanessa.mint+demo@example.com", phone: " +1 (234) 567-890 " };
  await fillInfo(page, original);
  await next(page, "Select your plan");
  await page.getByRole("radio", { name: "Pro", exact: true }).check();
  await page.getByRole("switch").click();
  await next(page, "Pick add-ons");
  await page.getByRole("checkbox", { name: "Online service", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Larger storage", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Customizable Profile", exact: true }).check();
  await next(page, "Finishing up");
  await expect(page.locator(".summary-total strong")).toHaveText("$170/yr");

  for (let round = 0; round < 2; round++) {
    await page.getByRole("button", { name: "Go Back", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Pick add-ons", exact: true })).toBeFocused();
    await expect(page.getByRole("checkbox", { name: "Online service", exact: true })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Larger storage", exact: true })).not.toBeChecked();
    await expect(page.getByRole("checkbox", { name: "Customizable Profile", exact: true })).toBeChecked();
    await page.getByRole("button", { name: "Go Back", exact: true }).click();
    await expect(page.getByRole("radio", { name: "Pro", exact: true })).toBeChecked();
    await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Go Back", exact: true }).click();
    for (const id of ["name", "email", "phone"] satisfies (keyof typeof original)[]) await expect(page.locator(`#${id}`)).toHaveValue(original[id]);
    await next(page, "Select your plan");
    await expect(page.getByRole("radio", { name: "Pro", exact: true })).toBeChecked();
    await next(page, "Pick add-ons");
    await next(page, "Finishing up");
    await expect(page.locator(".summary-plan")).toContainText("Pro (Yearly)");
    await expect(page.locator(".summary-add-ons li")).toHaveText(["Customizable Profile+$20/yr"]);
    await expect(page.locator(".summary-total strong")).toHaveText("$170/yr");
  }
});

test("Change returns to plan selection and new plan, billing and add-ons update the summary", async ({ page }) => {
  await open(page);
  await reachSummary(page);
  await page.getByRole("button", { name: "Change", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Select your plan", exact: true })).toBeFocused();
  await expect(page.getByRole("radio", { name: "Arcade", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "Advanced", exact: true }).check();
  await page.getByRole("switch").click();
  await expect(page.getByText("2 months free", { exact: true })).toHaveCount(3);
  await next(page, "Pick add-ons");
  await expect(page.getByRole("checkbox", { name: "Online service", exact: true })).toBeChecked();
  await page.getByRole("checkbox", { name: "Customizable Profile", exact: true }).check();
  await next(page, "Finishing up");
  await expect(page.locator(".summary-plan")).toContainText("Advanced (Yearly)");
  await expect(page.locator(".summary-total strong")).toHaveText("$170/yr");
});

test("a plan error does not block the info step after Go Back or discard its values", async ({ page }) => {
  await open(page);
  await reachPlan(page);
  await page.getByRole("button", { name: "Next Step", exact: true }).click();
  await expect(page.locator("#plan-error")).toBeVisible();
  await page.getByRole("switch").click();
  await page.getByRole("button", { name: "Go Back", exact: true }).click();
  await expect(page.locator("#name")).toHaveValue("Stephen King");
  await expect(page.locator("#email")).toHaveValue("stephenking@lorem.com");
  await expect(page.locator("#phone")).toHaveValue("+1 234 567 890");
  await next(page, "Select your plan");
  await expect(page.locator(".field-error:visible")).toHaveCount(0);
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Next Step", exact: true }).click();
  await expect(page.locator("#plan-error")).toHaveText("Please select a plan");
});

test("add-ons are optional and all FM names, descriptions, plan prices and yearly discounts appear", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { name: "Personal info", exact: true })).toBeVisible();
  await expect(page.getByText("Please provide your name, email address, and phone number.", { exact: true })).toBeVisible();
  for (const placeholder of ["e.g. Stephen King", "e.g. stephenking@lorem.com", "e.g. +1 234 567 890"]) await expect(page.getByPlaceholder(placeholder, { exact: true })).toBeVisible();
  await reachPlan(page);
  await expect(page.getByText("You have the option of monthly or yearly billing.", { exact: true })).toBeVisible();
  await expect(page.locator(".plan-copy")).toHaveText(["Arcade$9/mo", "Advanced$12/mo", "Pro$15/mo"]);
  await page.getByRole("switch").click();
  await expect(page.locator(".plan-copy")).toHaveText(["Arcade$90/yr2 months free", "Advanced$120/yr2 months free", "Pro$150/yr2 months free"]);
  await page.getByRole("radio", { name: "Arcade", exact: true }).check();
  await next(page, "Pick add-ons");
  await expect(page.getByText("Add-ons help enhance your gaming experience.", { exact: true })).toBeVisible();
  await expect(page.locator(".add-on-copy")).toHaveText(["Online serviceAccess to multiplayer games", "Larger storageExtra 1TB of cloud save", "Customizable ProfileCustom theme on your profile"]);
  await expect(page.locator(".add-on-price")).toHaveText(["+$10/yr", "+$20/yr", "+$20/yr"]);
  for (const checkbox of await page.getByRole("checkbox").all()) await checkbox.uncheck();
  await next(page, "Finishing up");
  await expect(page.getByText("Double-check everything looks OK before confirming.", { exact: true })).toBeVisible();
  await expect(page.locator(".summary-add-ons")).toHaveCount(0);
  await expect(page.locator(".summary-total strong")).toHaveText("$90/yr");
});

test("steps are informational and announcements follow Next, Go Back and Change", async ({ page }) => {
  await open(page);
  await expect(page.locator(".step-list button,.step-list a")).toHaveCount(0);
  await expect(page.locator(".step-list li")).toHaveCount(4);
  await expect(page.locator(".step-label")).toHaveText(["Step 1Your info", "Step 2Select plan", "Step 3Add-ons", "Step 4Summary"]);
  await expect(page.locator(".step-announcement")).toHaveText("Step 1 of 4: Personal info");
  await reachPlan(page);
  await expect(page.locator(".step-announcement")).toHaveText("Step 2 of 4: Select your plan");
  await expect(page.locator('.step-list [aria-current="step"] .step-number')).toHaveText("2");
  await page.getByRole("button", { name: "Go Back", exact: true }).click();
  await expect(page.locator(".step-announcement")).toHaveText("Step 1 of 4: Personal info");
});

test("a submit before hydration is queued and native typing is retained", async ({ page }) => {
  let releaseScripts = () => {};
  const gate = new Promise<void>((resolve) => { releaseScripts = resolve; });
  await page.route("**/_next/static/**/*.js", async (route) => { await gate; await route.continue(); });
  await page.goto("/", { waitUntil: "commit" });
  try {
    await expect(page.locator("#subscription-form")).toHaveAttribute("data-hydrated", "false");
    await page.locator("#name").fill("Early Stephen King");
    await page.getByRole("button", { name: "Next Step", exact: true }).click();
    await expect(page.locator("#subscription-form")).toHaveAttribute("data-pending-submit", "true");
  } finally {
    releaseScripts();
  }
  await waitForHydrated(page);
  await expect(page.locator("#name")).toHaveValue("Early Stephen King");
  await expect(page.locator(".field-error:visible")).toHaveCount(2);
  await expect(page.locator("#email")).toBeFocused();
  expect(new URL(page.url()).search).toBe("");
});

test("the demo issues no non-GET requests and reload starts a new draft", async ({ page }) => {
  const writes: string[] = [];
  page.on("request", (request) => { if (request.method() !== "GET") writes.push(`${request.method()} ${request.url()}`); });
  await open(page, 375);
  await reachSummary(page, "yearly");
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thank you!", exact: true })).toBeVisible();
  await page.reload();
  await waitForHydrated(page);
  await expect(page.locator("#name")).toHaveValue("");
  await expect(page.locator("#email")).toHaveValue("");
  await expect(page.locator("#phone")).toHaveValue("");
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }))).toEqual({ local: 0, session: 0 });
});

test("whole cards activate native radio and checkbox controls and keyboard billing works", async ({ page }) => {
  await open(page);
  await reachPlan(page);
  await page.locator(".plan-card").filter({ hasText: "Advanced" }).click();
  await expect(page.getByRole("radio", { name: "Advanced", exact: true })).toBeChecked();
  await page.getByRole("radio", { name: "Advanced", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Pro", exact: true })).toBeChecked();
  await page.getByRole("switch").focus();
  await page.keyboard.press("Space");
  await expect(page.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  await next(page, "Pick add-ons");
  await page.locator(".add-on-card").filter({ hasText: "Customizable Profile" }).click();
  await expect(page.getByRole("checkbox", { name: "Customizable Profile", exact: true })).toBeChecked();
});
