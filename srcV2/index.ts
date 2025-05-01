// Import dependencies
import puppeteer, { Browser, Page } from "puppeteer-core";
import extract from "extract-zip";

import { getAllLinks } from "./scraping.js";

import fs from "fs";

// IIFE function
(async () => {
  // Declare variables
  let browser: Browser;
  let page: Page;

  // Declare constants
  const saveDir = "../files";
  const chromePath =
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const baseUrls = [
    "https://www.gobilda.com/structure/",
    "https://www.gobilda.com/motion/",
    "https://www.gobilda.com/electronics/",
    "https://www.gobilda.com/hardware/",
    "https://www.gobilda.com/kits/",
  ];

  // Launch the browser and open a new blank page
  browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
  });
  page = await browser.newPage();

  // Set the viewport size (optimization)
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

  // For each baselink, run the scrapePage function (like below)
  for (const baseUrl of baseUrls) {
    // Split the URL by the '/' character
    const parts = baseUrl.split("/");
    // Get the last non-empty string from the resulting array
    const lastPart = parts.filter(Boolean).pop();
    // Append 'Links.json' to the string to create the file name
    const fileName = `${lastPart}Links.json`;

    // Read the links from the JSON file
    const links = JSON.parse(fs.readFileSync(`../links/${fileName}`, "utf-8"));
    for (const link of links) {
      const scrapedInfo = await scrapePage(link, page, saveDir);

      // console.log(scrapedInfo);

      if (!scrapedInfo) {
        console.log(`Skipping: ScrapedInfo is null ${link}`);
        continue;
      }

      // Inside a try catch so if there is an error, the entire program doesn't crash
      try {
        await downloadAndUnzip(
          scrapedInfo.zipURL,
          scrapedInfo.path,
          scrapedInfo.name
        );
      } catch (error) {
        console.log(`Error: ${link} (skipping): ${error}`);
      }
    }
  }

  await browser.close();
})();
