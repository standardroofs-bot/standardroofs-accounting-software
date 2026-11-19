const http = require("http");

function postLogin() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      email: "admin@standardroofs.com",
      password: "Admin@2026",
      rememberMe: true,
    });

    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path: "/api/auth/login",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          const cookieHeader = res.headers["set-cookie"];
          const cookies = cookieHeader ? cookieHeader.map((c) => c.split(";")[0]).join("; ") : "";
          resolve({ status: res.statusCode, cookies, body: JSON.parse(body || "{}") });
        });
      }
    );
    req.write(postData);
    req.end();
  });
}

function getWithAuth(path, cookies) {
  return new Promise((resolve) => {
    http.get(
      {
        hostname: "localhost",
        port: 3000,
        path,
        headers: {
          Cookie: cookies,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            length: body.length,
            data: body.startsWith("{") ? JSON.parse(body) : null,
          });
        });
      }
    );
  });
}

async function main() {
  console.log("=== LOGGING IN VIA /api/auth/login ===");
  const login = await postLogin();
  console.log("Login Status:", login.status, "Success:", login.body.success, "User:", login.body.user?.email);

  const endpoints = [
    "/api/machines",
    "/api/inventory",
    "/api/inventory/tiles",
    "/api/inventory/checklists",
    "/api/reports/monthly-matrix",
  ];

  for (const ep of endpoints) {
    const res = await getWithAuth(ep, login.cookies);
    console.log(`[${res.status}] ${ep}: Success=${res.data?.success} (Payload: ${res.length} bytes)`);
    if (ep === "/api/machines") {
      console.log(`   -> Machines count: ${res.data?.machines?.length}, Total Count: ${res.data?.masterSummary?.totalMachineCount}`);
    } else if (ep === "/api/inventory") {
      console.log(`   -> Inventory items: ${res.data?.materials?.length}, Valuation: ₹ ${res.data?.totalValuation}`);
    } else if (ep === "/api/inventory/tiles") {
      console.log(`   -> Tiles items: ${res.data?.tiles?.length}`);
    } else if (ep === "/api/inventory/checklists") {
      console.log(`   -> Checklist items: ${res.data?.checklists?.length}`);
    } else if (ep === "/api/reports/monthly-matrix") {
      console.log(`   -> Months in matrix: ${res.data?.months?.length}, FY: ${res.data?.fy}`);
    }
  }
}

main();
