import { Page } from "puppeteer-core";
import fetch from "node-fetch";
import fs from "fs-extra";
import * as path from "path";
import AdmZip from "adm-zip";
import { TableUserConfig, table, createStream, StreamUserConfig } from "table";

import { goBildaFile } from "./types.js";

/**
 * Uses getLinks to recursively get every product page from a base url (like gobilda.com/structure)
 * Then all the links are saved to a JSON file and this Set
 * Declared globally so it can be used in multiple functions
 */
let scrapedLinks = new Set<string>();

let errorTableData: String[][] = [];

/**
 * After getLinks runs gets a link, this will run asyncronusly
 * getLinks -> scrapePage -> downloadAndUnzip
 */
export async function helper(pageURL: string, saveDir: string, page: Page) {
  // console.log(pageURL, saveDir, page)

  const parsedPageData = await scrapePage(pageURL, page, saveDir);

  if (parsedPageData) {
    await downloadAndUnzip(
      parsedPageData.zipURL,
      parsedPageData.path,
      parsedPageData.name
    );
  }
}

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

  if (!content) {
    throw new Error(
      `No element found for selector (function getTextContent): ${selector}`
    );
  }
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
 * This is the last step after: getLinks, scrapePage, then downloadAndUnzip
 * Referenced by helper()
 *
 * @param url URL of the product page to request the .zip file from
 * @param outputDir Directory location to save the .step file to
 * @param name Name of file to save (from product page)
 */
export async function downloadAndUnzip(
  url: string,
  outputDir: string,
  name: string
) {
  let dir: string;
  try {
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

    zip.forEach((entry) => {
      // Store the unzipped file in memory (buffer) since it's currently a UID name
      const data = entry.getData();

      // Extract the directory structure from the zip entry name
      dir = path.dirname(entry.entryName);

      // Create the directory structure in the output directory if it doesn't exist
      fs.mkdirSync(path.join(outputDir, dir), { recursive: true });

      // Write the file to the correct directory using the custom name
      fs.writeFileSync(path.join(outputDir, dir, name), data, {
        encoding: "utf8",
      });
    });
  } catch (error) {
    console.error(`Error in downloading and unzipping ${url}: ${error}`);
    errorTableData.push(["Error"], [url], ["Skipped"]);
  } finally {
    // Log it so the user can see the sucess live
    //@ts-ignore
    console.table([[name, outputDir]]);
  }
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
    await page.goto(url, { waitUntil: "networkidle2" });

    // Extract all the links that can be found on the hamburger menu
    const productLinks: (string | null)[] = await page.evaluate(() => {
      // Each product card has a <a> tag, use this to get the href link for that page
      const links = Array.from(
        document.querySelectorAll("li.product a, .productTable-cell a")
      ).map((link) => link.getAttribute("href"));

      console.log("links: ", links);

      // Sometimes the links are #mm3 or other weird things. Filter out so only links from goBILDA are used
      return links.filter(
        (href) => href && href.startsWith("https://www.gobilda.com/")
      );
    });

    /**
     * If productLinks is not empty, recursively follow the links
     * 
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
      // console.log("Scraping product page: ", `[test](${url})`);

      helper(url, "../files", page);
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

/**
 * With a goBILDA URL, scrape for the .zip, unzip, then download the .step file
 * Used in getLinks()
 *
 * @param url The product page to scrape
 * @param page Pupeteer's base page
 * @param saveDir Base directory to save the file to
 * @returns goBildaFile
 * @example scrapePage("https://www.gobilda.com/2106-series-stainless-steel-rex-shaft-8mm-diameter-40mm-length/", page, "../files");
 */
export async function scrapePage(
  url: string,
  page: Page,
  saveDir: string
): Promise<goBildaFile | void> {
  // Declare variables
  let path: string;
  let name: string;
  let zipURL: string;

  // Go to page, get breadcrums, get name, get path, get zipURL
  try {
    // Navigate the page to a URL
    const output = await page.goto(url, { waitUntil: "networkidle0" });
    console.log("output: ", output);

    // page.once("load", () => console.log("Page loaded: ", path, name));
    const breadcrumbs = await page.$$eval(".breadcrumbs a", (anchors) =>
      anchors.map((anchor) =>
        anchor?.textContent?.replace(/ /g, "_").replace(/[\/\\?%*:|"<>]/g, "_")
      )
    );

    // Create the path to save the file to
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
      errorTableData.push(["Missing .step for"], [url], ["Skipped"]);
      console.log("Skipping: No .step file found for: ", url);
      return void 0;
    } else {
      zipURL = "https://www.gobilda.com" + zipHerf;
    }

    // zipURL =
    //   "https://www.gobilda.com" +
    //   (await getHref(page, ".product-downloadsList-listItem-link.ext-zip"));

    return { path, name, zipURL };
  } catch (error) {
    // @ts-ignore
    if (error.message.includes("net::ERR_ABORTED")) {
      console.error(`Network request was aborted for page ${url}`);
      // Handle the error (e.g., retry the operation, log the error, etc.)
    } else {
      console.error(`Error in scraping ${url}: \n${error}`);
    }
  }
}

export async function tableManager() {
  const config: TableUserConfig = {
    header: {
      alignment: "center",
      content: "Errors / Skipped Pages",
    },
  };

  errorTableData.push(["Status:", "Name:", "Link:"]);

  return table(errorTableData, config);
}
