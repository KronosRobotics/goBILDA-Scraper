import puppeteer, { Browser } from "puppeteer-core";

export async function setupPage(browser: Browser) {
  const page = await browser.newPage();

  // Set the viewport size
  await page.setViewport({ width: 1280, height: 800 });

  // Set the default page timeout
  await page.setDefaultTimeout(5 * 1000);

  // More speed optimization
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (
      req.resourceType() === "stylesheet" ||
      req.resourceType() === "font" ||
      req.resourceType() === "image"
    ) {
      req.abort();
    } else {
      req.continue();
    }
  });

  return page;
}
