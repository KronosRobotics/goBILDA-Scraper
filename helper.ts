import { Page } from "puppeteer-core";
import fetch from "node-fetch";
import fs from "fs-extra";
import * as path from "path";
import AdmZip from "adm-zip";

import { goBildaFile } from "./types.js";

/**
 * Uses getLinks to recursively get every product page from a base url (like gobilda.com/structure)
 * Then all the links are saved to a JSON file and this Set
 * Declared globally so it can be used in multiple functions
 */
let scrapedLinks = new Set<string>();

/**
 * Get the text content of an element from an htlm page
 *
 * @param page The page from pupeteer to search
 * @param selector The class to search for
 *
 * @returns The text content of the element
 *
 * @example getTextContent(page, ".breadcrumbs");
 */
export async function getTextContent(
  page: Page,
  selector: string
): Promise<string> {
  await page.waitForSelector(selector);
  const el = await page.$(selector);
  const content = await el?.evaluate((e) => e.textContent);

  if (!content)
    throw new Error(
      `No element found for selector (function getTextContent): ${selector}`
    );

  return content;
}

/**
 * Get the href of an element from an htlm page
 *
 * @param page The page from pupeteer to search
 * @param selector The class to search for
 *
 * @returns The href of the element
 *
 * @example getHref(page, ".product-downloadsList-listItem-link.ext-zip"); //Useful for downloading files
 */
export async function getHref(
  page: Page,
  selector: string
): Promise<string | null> {
  const el = await page.$(selector);

  if (!el) {
    // console.log(
    //   `No element found for selector (function getHref): ${selector}`
    // );
    return null;
  }

  await page.waitForSelector(selector);

  const href = await el.evaluate((e) => e.getAttribute("href"));

  if (!href || !href.endsWith(".zip")) {
    console.log(
      `No .zip file found for selector (function getHref): ${selector}`
    );
    return null;
  }

  return href;
}

/**
 * Unzip a file from a browser url to a directory
 *
 *
 * @param url
 * @param outputDir
 */
export async function downloadAndUnzip(
  url: string,
  outputDir: string,
  name: string
) {
  // Check if the output directory exists, if not, create it
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get the zip file from goBILDA and save it in memory
  const response = await fetch(url);
  // Store the zip file in memory
  const buffer = Buffer.from(await response.arrayBuffer());

  // Extract the zip file to the output directory
  const zip = new AdmZip(buffer);

  // Unzip every file in the zip
  // zip.forEach((entry) => {
  //   // Store the unzipped file in memory (buffer) since it's currently a UID name
  //   const data = entry.getData();

  //   // Write the file to the output directory
  //   fs.writeFileSync(outputDir + name, data, { encoding: "utf8" });
  // });
  zip.forEach((entry) => {
    // Store the unzipped file in memory (buffer) since it's currently a UID name
    const data = entry.getData();

    // Extract the directory structure from the zip entry name
    const dir = path.dirname(entry.entryName);

    // Create the directory structure in the output directory if it doesn't exist
    fs.mkdirSync(path.join(outputDir, dir), { recursive: true });

    // Write the file to the correct directory using the custom name
    fs.writeFileSync(path.join(outputDir, dir, name), data, {
      encoding: "utf8",
    });
  });
}

/**
 * A add meathod for the scrapedLinks set
 */
export function addLink(url: string) {
  scrapedLinks.add(url);
}

/**
 * A clear meathod for the scrapedLinks set
 */
export function clearLinks() {
  scrapedLinks.clear();
}

/**
 * Get every product page from a base url (like gobilda.com/structure)
 *
 * @param url the base url to scan
 * @param page Pupeteer's base page
 *
 * @returns A set of links to product pages
 *
 * @example getLinks("https://www.gobilda.com/motion/", page);
 */
export async function getLinks(
  url: string,
  baseUrl: string,
  page: Page
): Promise<Set<string>> {
  try {
    // Get the page from the base url and wait until its loaded
    await page.goto(url, { waitUntil: "domcontentloaded" });

    // Extract links to product pages
    const productLinks = await page.evaluate(() => {
      // Each product card has a <a> tag, use this to get the href link for that page
      const links = Array.from(document.querySelectorAll("li.product a")).map(
        (link) => link.getAttribute("href")
      );
      // Sometimes the links are #mm3 or other weird things. Filter out so only links from goBILDA are used
      return links.filter(
        (href) => href && href.startsWith("https://www.gobilda.com/")
      );
    });

    /**
     * If productLinks is not empty, recursively follow the links
     * The recursive part is important. If you go to the gobilda.com -> structures page, you will see that there are multiple pages of products.
     * You need to THEN go into the structure page THEN go to U-channels
     * Note that even the U-Channels page has sub pages, so you need to go into them too
     * Finally, you'll reach the actual product page where you can download the .step files
     */
    if (productLinks.length > 0) {
      for (const link of productLinks) {
        await getLinks(link as string, baseUrl, page);
      }
    } else {
      // We are on an actual product page
      console.log("Scraping product page: ", url);

      /**
       * Add the URL to a set
       * a set is used instead of a list/array because there can be duplicates
       */
      addLink(url as string);
      // scrapedLinks.add(url as string);

      // console.log(scrapedLinks);

      // You could theoretically add a function here to scrape the product but there could be duplicates
      // await scrapeProductPage(page);
    }
  } catch (error) {
    console.error(`Error in getting links ${url}: ${error}`);
  } finally {
    // Split the URL by the '/' character
    const parts = baseUrl.split("/");
    // Get the last non-empty string from the resulting array
    const lastPart = parts.filter(Boolean).pop();
    // Append 'Links.json' to the string to create the file name
    const fileName = `${lastPart}Links.json`;

    // Write the scraped links to a file (different JSON file for Structure, Motion, etc.)
    fs.writeFileSync(
      `../links/${fileName}`,
      JSON.stringify(Array.from(scrapedLinks))
    );

    return scrapedLinks;
  }
}

export async function scrapePage(url: string, page: Page, saveDir: string) {
  // Declare variables
  let path: string;
  let name: string;
  let zipURL: string;

  // Navigate the page to a URL
  await page.goto(url);

  page.once("load", () => console.log("Page loaded: ", path, name));

  // Get the breadcrums to be used for File's path
  try {
    // const breadcrumbs = await page.$$eval(".breadcrumbs a", (anchors) =>
    //   anchors.map((anchor) => anchor?.textContent?.replace(/ /g, "_"))
    // );

    const breadcrumbs = await page.$$eval(".breadcrumbs a", (anchors) =>
      anchors.map((anchor) =>
        anchor?.textContent?.replace(/ /g, "_").replace(/[\/\\?%*:|"<>]/g, "_")
      )
    );
    path = `${saveDir}/${breadcrumbs.join("/")}`;

    // Get the name of the file
    name =
      (await getTextContent(page, ".productView-title")).replace(
        /[\/\\?%*:|"<>]/g,
        "-"
      ) + ".step";

    // Get the href of the file and concatinate the base url
    const zipHerf = await getHref(
      page,
      ".product-downloadsList-listItem-link.ext-zip"
    );

    // If the zupHeref is null, then the file doesn't exist. Skip this product
    if (!zipHerf) {
      console.log("Skipping: No .step file found for: ", url);
      return;
    } else {
      zipURL = "https://www.gobilda.com" + zipHerf;
    }

    // zipURL =
    //   "https://www.gobilda.com" +
    //   (await getHref(page, ".product-downloadsList-listItem-link.ext-zip"));

    return { path, name, zipURL };
  } catch (error) {
    console.error(`Error in scraping ${url}: \n${error}`);
  }
}
