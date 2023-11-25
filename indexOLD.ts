// import puppeteer from "puppeteer-core";
// import fs from "fs";
// import fetch from "node-fetch";
// import path from "path";
// import extract from "extract-zip";

// async function run() {
//   let browser;
//   let files: File[];
//   let file: File;

//   try {
//     // Launch the browser and open a new blank page
//     const browser = await puppeteer.launch({
//       executablePath:
//         "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
//     });
//     const page = await browser.newPage();

//     // Navigate the page to a URL
//     await page.goto(
//       "https://www.gobilda.com/1611-series-flanged-ball-bearing-8mm-id-x-14mm-od-5mm-thickness-2-pack/"
//     );

//     page.once("load", () => console.log("Page loaded!"));

//     // Get the breadcrumbs to organize file structure
//     const breadcrumsSelector = ".breadcrumbs";

//     await page.waitForSelector(breadcrumsSelector);
//     const el = await page.$(breadcrumsSelector);

//     breadcrumbs = await el.evaluate((e) => e.textContent);
//     breadcrumbs = breadcrumbs.replace(/\s+/g, " ").trim();

//     console.log(breadcrumbs.trim());

//     // Get the file name
//     const nameSelector = ".productView-title";

//     await page.waitForSelector(nameSelector);
//     const nameEl = await page.$(nameSelector);

//     name = await nameEl.evaluate((e) => e.textContent);

//     console.log("File Name: " + name);

//     // Get the actual file
//     const fileSelector = ".product-downloadsList-listItem-link.ext-zip";

//     await page.waitForSelector(fileSelector);
//     const fileEl = await page.$(fileSelector);

//     stepFile = await fileEl.evaluate((e) => e.href);
//     console.log("Step File Path: " + stepFile);

//     // Download the file
//     try {
//       const response = await fetch(stepFile);
//       const buffer = await response.buffer();
//       fs.writeFile("file.zip", buffer, (err) => {
//         if (err) throw err;
//         console.log("File downloaded and saved as file.zip");
//       });
//     } catch (error) {
//       console.error("Error downloading file", error);
//     }

//     // try {
//     //   const response = await fetch(stepFile);
//     //   const buffer = await response.buffer();
//     //   fs.writeFile("file.zip", buffer, () => {
//     //     extract("file.zip", { dir: downloadPath }, function (err) {
//     //       if (err) {
//     //         console.error("Error extracting .zip file", err);
//     //       }
//     //     });
//     //   });
//     // } catch (error) {
//     //   console.error("Error downloading or extracting .zip file", error);
//     // }

//     //
//   } catch (error) {
//     console.error("scrape failed", error);
//   } finally {
//     await browser?.close();
//   }
// }

// run();
