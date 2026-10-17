import { expect, test } from "@playwright/test";

test("home search opens the fixed deposit calculator", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Know the number");
  await page.getByLabel("Search a calculator or ask a money question").fill("How much will my FD earn?");
  await page.getByRole("link", { name: /Fixed deposit calculator/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Fixed deposit");
  await expect(page.getByText(/Maturity value is/)).toBeVisible();
});

test("a shared FD link keeps the amount", async ({ page }) => {
  await page.goto("/calculators/fd?amount=250000");
  await expect(page.locator("#field-principal")).toHaveValue("250000");
});

test("an article links to a calculator", async ({ page }) => {
  await page.goto("/learn/compound-interest");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("compound interest");
  await page.getByRole("link", { name: "simple compound interest" }).click();
  await expect(page).toHaveURL(/simple-compound-interest/);
});

test("a goal can be saved on the plan page", async ({ page }) => {
  await page.goto("/plan");
  await page.getByLabel("Name").fill("Emergency fund");
  await page.getByLabel("Target in current rupees").fill("180000");
  await page.getByRole("button", { name: "Save goal on this device" }).click();
  await expect(page.getByText(/Emergency fund: ₹/)).toBeVisible();
});
