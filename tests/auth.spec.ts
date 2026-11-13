import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("when user signup with valid credentials should navigate to login page", async ({
    page,
  }) => {
    await page.goto("http://localhost:80/signup");
    await page.getByLabel("Name").fill("John");
    await page.getByLabel("Email").fill("john@gmail.com");
    await page.getByLabel("Password").fill("Password123!");
    await page
      .getByRole("button", {
        name: /Create account/i,
      })
      .click();

    await expect(page).toHaveURL(/login/i);
    await expect(
      page.getByRole("button", {
        name: /Log in/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Create account/i,
      }),
    ).not.toBeVisible();
    await expect(page.getByLabel("Name")).not.toBeVisible();
  });

  test("when user signup with duplicate credentials should navigate to login page", async ({
    page,
  }) => {
    await page.goto("http://localhost:80/signup");
    await page.getByLabel("Name").fill("John");
    await page.getByLabel("Email").fill("john@gmail.com");
    await page.getByLabel("Password").fill("Password123!");
    await page
      .getByRole("button", {
        name: /Create account/i,
      })
      .click();

    await expect(page).toHaveURL(/login/i);
    await expect(
      page.getByRole("button", {
        name: /Log in/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Create account/i,
      }),
    ).not.toBeVisible();
    await expect(page.getByLabel("Name")).not.toBeVisible();
  });

  test("when user signup with invalid email should stay at same page and show error message", async ({
    page,
  }) => {
    await page.goto("http://localhost:80/signup");
    await page.getByLabel("Name").fill("John");
    await page.getByLabel("Email").fill("john");
    await page.getByLabel("Password").fill("Password123!");
    await expect(page.getByText(/email is invalid/i)).toBeVisible();
    await page
      .getByRole("button", {
        name: /Create account/i,
      })
      .click();

    await expect(
      page.getByRole("button", {
        name: /Log in/i,
      }),
    ).not.toBeVisible();
    await expect(page.getByLabel("Name")).toBeVisible();
  });
  test("when user login with invalid password should stay at same page and show error message", async ({
    page,
  }) => {
    await page.goto("http://localhost:80/login");
    await page.getByLabel("Email").fill("john@gmail.com");
    await page.getByLabel("Password").fill("Passw");
    await page
      .getByRole("button", {
        name: /Log in/i,
      })
      .click();

    await expect(
      page.getByText(/password must be at least 8 characters/i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Log in/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Chatter/i }),
    ).not.toBeVisible();
  });
  test("when user login with not exist email should stay at same page and show error message", async ({
    page,
  }) => {
    await page.goto("http://localhost:80/login");
    await page.getByLabel("Email").fill("doe@gmail.com");
    await page.getByLabel("Password").fill("Password123!");
    await page
      .getByRole("button", {
        name: /Log in/i,
      })
      .click();

    await expect(
      page.getByText(/Email or password is incorrect./i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Log in/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Chatter/i }),
    ).not.toBeVisible();
  });
  test("when user login with not correct password should stay at same page and show error message", async ({
    page,
  }) => {
    await page.goto("http://localhost:80/login");
    await page.getByLabel("Email").fill("john@gmail.com");
    await page.getByLabel("Password").fill("notcorrect");
    await page
      .getByRole("button", {
        name: /Log in/i,
      })
      .click();

    await expect(
      page.getByText(/Email or password is incorrect./i),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: /Log in/i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Chatter/i }),
    ).not.toBeVisible();
  });
  test("when user login with correct credentials should navigate to relaionship home page", async ({
    page,
  }) => {
    await page.goto("http://localhost:80/login");
    await page.getByLabel("Email").fill("john@gmail.com");
    await page.getByLabel("Password").fill("Password123!");
    await page
      .getByRole("button", {
        name: /Log in/i,
      })
      .click();

    await expect(
      page.getByRole("button", {
        name: /Log in/i,
      }),
    ).not.toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Chatter/i }),
    ).toBeVisible();
  });
});
