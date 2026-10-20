const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

let backendProcess = null;
let frontendProcess = null;

const isPackaged = app.isPackaged;

const projectRoot = path.resolve(__dirname, "..");

const developmentBackendPath = path.join(projectRoot, "backend");

const developmentFrontendPath = path.join(projectRoot, "frontend");

const packagedBackendPath = path.join(process.resourcesPath, "backend");

const packagedFrontendPath = path.join(
  process.resourcesPath,
  "frontend",
  "standalone",
);

const backendPath = isPackaged ? packagedBackendPath : developmentBackendPath;

const frontendPath = isPackaged
  ? packagedFrontendPath
  : developmentFrontendPath;

const backendServerPath = path.join(backendPath, "dist", "server.js");

const frontendServerPath = isPackaged
  ? path.join(frontendPath, "server.js")
  : path.join(frontendPath, ".next", "standalone", "server.js");

const applicationDataPath = path.join(
  app.getPath("appData"),
  "Pharmacy Management System",
);

const productionEnvPath = path.join(applicationDataPath, ".env");

function ensureProductionEnvironment() {
  if (!isPackaged) {
    return;
  }

  if (!fs.existsSync(applicationDataPath)) {
    fs.mkdirSync(applicationDataPath, {
      recursive: true,
    });
  }

  if (!fs.existsSync(productionEnvPath)) {
    const defaultEnv = [
      'DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/pharmacy_db"',
      'JWT_SECRET="CHANGE_THIS_TO_A_LONG_RANDOM_SECRET"',
      'JWT_EXPIRES_IN="1d"',
      'PHARMACY_NAME="Your Pharmacy"',
      'ADMIN_NAME="Administrator"',
      'ADMIN_USERNAME="admin"',
      'ADMIN_PASSWORD="CHANGE_THIS_PASSWORD"',
      "",
    ].join("\n");

    fs.writeFileSync(productionEnvPath, defaultEnv, "utf8");

    console.log(`Created production configuration at: ${productionEnvPath}`);

    throw new Error(
      `Application configuration was created at:\n${productionEnvPath}\n\nPlease configure the database and administrator credentials, then restart the application.`,
    );
  }
}

function startBackend() {
  console.log("Starting backend...");
  console.log(`Backend path: ${backendPath}`);

  const backendEnvironment = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    PORT: "4000",
  };

  if (isPackaged) {
    backendEnvironment.PHARMACY_ENV_PATH = productionEnvPath;
  }

  backendProcess = spawn(process.execPath, [backendServerPath], {
    cwd: backendPath,
    env: backendEnvironment,
    stdio: "inherit",
    windowsHide: false,
  });

  backendProcess.on("error", (error) => {
    console.error("Backend error:", error);
  });

  backendProcess.on("exit", (code, signal) => {
    console.log(
      `Backend exited with code ${code}${signal ? `, signal ${signal}` : ""}`,
    );

    backendProcess = null;
  });
}

function startFrontend() {
  console.log("Starting frontend...");
  console.log(`Frontend path: ${frontendPath}`);

  frontendProcess = spawn(process.execPath, [frontendServerPath], {
    cwd: frontendPath,

    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: "3000",
      HOSTNAME: "localhost",
    },

    stdio: "inherit",
    windowsHide: false,
  });

  frontendProcess.on("error", (error) => {
    console.error("Frontend error:", error);
  });

  frontendProcess.on("exit", (code, signal) => {
    console.log(
      `Frontend exited with code ${code}${signal ? `, signal ${signal}` : ""}`,
    );

    frontendProcess = null;
  });
}

function waitForServer(url, name) {
  return new Promise((resolve, reject) => {
    const maxAttempts = 40;
    let attempts = 0;

    function check() {
      attempts++;

      const request = http.get(url, (response) => {
        response.resume();

        if (response.statusCode >= 200 && response.statusCode < 500) {
          console.log(`${name} is ready.`);
          resolve();
          return;
        }

        retry();
      });

      request.on("error", retry);

      request.setTimeout(1000, () => {
        request.destroy();
        retry();
      });
    }

    function retry() {
      if (attempts >= maxAttempts) {
        reject(
          new Error(`${name} did not become ready within the expected time.`),
        );

        return;
      }

      setTimeout(check, 500);
    }

    check();
  });
}

function stopProcess(processInstance, name) {
  if (!processInstance) {
    return;
  }

  console.log(`Stopping ${name}...`);

  try {
    processInstance.kill();
  } catch (error) {
    console.error(`Unable to stop ${name}:`, error);
  }
}

async function createWindow() {
  ensureProductionEnvironment();

  startBackend();

  await waitForServer("http://localhost:4000/api/health", "Backend");

  startFrontend();

  await waitForServer("http://localhost:3000", "Frontend");

  const win = new BrowserWindow({
    width: 1280,
    height: 800,

    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadURL("http://localhost:3000");
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error("Unable to start Pharmacy Management System:", error);

    stopProcess(frontendProcess, "frontend");
    stopProcess(backendProcess, "backend");

    frontendProcess = null;
    backendProcess = null;

    app.quit();
    return;
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch((error) => {
        console.error("Unable to recreate Pharmacy Management System:", error);
      });
    }
  });
});

app.on("before-quit", () => {
  stopProcess(frontendProcess, "frontend");
  stopProcess(backendProcess, "backend");

  frontendProcess = null;
  backendProcess = null;
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
