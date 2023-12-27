const puppeteer = require("puppeteer");
require("dotenv").config();

async function applyToAllJobs(page) {
  // Wait for the job list to be visible
  await page.waitForSelector(".srp-jobtuple-wrapper", { visible: true });

  // Evaluate the job elements and collect the URLs
  const jobUrls = await page.evaluate(() => {
    const jobElements = document.querySelectorAll(".srp-jobtuple-wrapper");
    const jobUrls = [];

    for (const jobElement of jobElements) {
      const jobLink = jobElement.querySelector(".title");
      if (jobLink) {
        jobUrls.push(jobLink.href);
      }
    }

    return jobUrls;
  });

  // Loop through each job URL and apply
  for (const jobURL of jobUrls) {
    const newPage = await page.browser().newPage();
    await processJobPage(jobURL, newPage);
  }
}

async function processJobPage(jobURL, page) {
  await page.goto(jobURL);
  await page.waitForTimeout(2000);

  const applyButton = await page.$("#apply-button");
  if (applyButton) {
    applyButton.click();
    await page.waitForTimeout(5000);
    const pageTitle = await page.title();
    if (pageTitle.includes("Apply Confirmation")) {
      // console.log(
      //   "Page redirected to Apply Confirmation. Proceeding to the next job."
      // );
      await page.goBack(); // Go back to the job list
      page.close();
    } else {
      // console.log(
      //   "Page not redirected. Additional information may be needed." + jobURL
      // );
      page.close();
    }
  } else {
    // console.log("Apply button not found.");
    page.close();
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ["--start-maximized"],
  });

  const page = await browser.newPage();
  await page.goto(process.env.website);

  // Wait for the login button to be visible and enabled
  await page.waitForSelector("#login_Layer", {
    visible: true,
    enabled: true,
  });

  // Click on the login button
  await page.click("#login_Layer");
  await page.waitForTimeout(500); // Adjust the waiting time as needed

  // Wait for the userName text box to be visible and enabled
  await page.waitForSelector(
    'input[placeholder="Enter your active Email ID / Username"]',
    { visible: true, enabled: true }
  );

  // Type text into the userName text box
  await page.type(
    'input[placeholder="Enter your active Email ID / Username"]',
    process.env.userName
  );

  // Wait for the password text box to be visible and enabled
  await page.waitForSelector('input[placeholder="Enter your password"]', {
    visible: true,
    enabled: true,
  });

  // Type password into the password box
  await page.type(
    'input[placeholder="Enter your password"]',
    process.env.password
  );

  // Wait for the Submit button to be visible and enabled
  await page.waitForSelector("button.btn-primary.loginButton");

  // Click on the Submit button
  await Promise.all([
    page.waitForNavigation(),
    page.click("button.btn-primary.loginButton"),
  ]);
  for (let job of JSON.parse(process.env.jobs || "[]")) {
    console.log(process.env.jobs);
    console.log(job);
    const desiredUrl =
      process.env.website +
      job +
      "-jobs-in-" +
      process.env.location +
      "?k=" +
      job +
      "&l=" +
      process.env.location +
      "&experience=" +
      process.env.experience +
      "&nignbevent_src=jobsearchDeskGNB&jobAge=" +
      process.env.jobAge;

    console.log("URL -> " + desiredUrl);
    await page.goto(desiredUrl, { waitUntil: "domcontentloaded" });

    // Apply to all jobs on the initial page
    await applyToAllJobs(page);
  }

  // Close the browser when done
  await browser.close();
})();
