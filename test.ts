import puppeteer, { Browser, Page } from "puppeteer-core";
import { scrapePage } from "./helper.js";

// Declare IIFE function
(async () => {
  // Declare variables
  let browser: Browser;
  let page: Page;

  // Declare constants
  const chromePath =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

  // Launch the browser and open a new blank page
  browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
  });
  page = await browser.newPage();

  // Set the viewport size (optimization)
  await page.setViewport({ width: 1280, height: 800 });

  // Set the timeout (optimization)
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

  const output = await scrapePage(
    "https://www.gobilda.com/3412-series-5mm-htd-pitch-timing-belt-9mm-width-295mm-pitch-length-59-tooth/",
    page,
    "./"
  );

  // console.log(output);
})();
