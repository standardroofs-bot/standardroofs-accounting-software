const http = require("http");

const urls = [
  "http://localhost:3000/",
  "http://localhost:3000/capital",
  "http://localhost:3000/estimates",
  "http://localhost:3000/banking",
  "http://localhost:3000/reports",
  "http://localhost:3000/invoices",
  "http://localhost:3000/api/capital",
  "http://localhost:3000/api/estimates",
  "http://localhost:3000/api/reports",
  "http://localhost:3000/api/bank-accounts",
];

async function checkUrl(url) {
  return new Promise((resolve) => {
    http
      .get(url, (res) => {
        console.log(`[HTTP ${res.statusCode}] ${url}`);
        resolve(res.statusCode);
      })
      .on("error", (err) => {
        console.error(`[FAIL] ${url}: ${err.message}`);
        resolve(500);
      });
  });
}

async function run() {
  console.log("Checking all SR-Books HTTP endpoints on port 3000...\n");
  for (const url of urls) {
    await checkUrl(url);
  }
  console.log("\nEndpoint verification complete.");
}

run();
