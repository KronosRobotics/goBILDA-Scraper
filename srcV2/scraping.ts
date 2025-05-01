// Importing libraries
import puppeteer, { Browser } from "puppeteer-core";
import fs from "fs";

// Importing helper functions
import { setupPage } from "./helper.js";

/**
 * Start of the actual program
 *
 *
 * @param baseLinks OR a single link
 * @param browser
 * @returns a non-duplicate list to every single product page on goBILDA
 */
export async function getAllLinks(
  baseLink: string,
  browser: Browser
): Promise<Set<string>> {
  // Declare a set to store all the links (set over array so no duplicates)
  let links = new Set<string>();

  try {
    // Declare a new page for each link (since using one page then going to another link can be slower)
    const page = await setupPage(browser);

    // Get the page from the base url and wait until its loaded
    await page.goto(baseLink, { waitUntil: "networkidle2" });

    // Extract all the links that can be found on the hamburger menu
    const productLinks: (string | null)[] = await page.evaluate(() => {
      /**
       * Each product card has a <a> tag, use this to get the href link for that page
       * Sometimes the sub pages are in a list OR table format (see example links below)
       * List: https://www.gobilda.com/bearings/
       * Table: https://www.gobilda.com/stainless-steel-rex-shafting/
       */
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
        await getAllLinks(link as string, browser);
      }
    } else {
      //! We are on an actual product page
    }
  } catch (error) {
    console.error(`Error in getting links ${baseLink}: ${error}`);
  } finally {
    // Write the scraped links to a file in the root dir
    fs.writeFileSync(`../links.json`, JSON.stringify(Array.from(links)));

    return links;
  }
}

/**
 *
 * Private function: Called by getAllLinks
 * @param link
 */
async function scrapeProductDataAndDownload(link: string): Promise<void> {
  // ... (your implementation)
}

/**
 *
 * Private function: Called by scrapeProductDataAndDownload
 * @param downloadLink
 * @param outputPath
 */
async function downloadAndUnzip(
  downloadLink: string,
  outputPath: string
): Promise<void> {
  // ... (your implementation)
}
