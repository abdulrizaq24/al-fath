const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const POSTGRES_VERSION = "18";
const DEFAULT_POSTGRES_BIN = path.join(
  "C:",
  "Program Files",
  "PostgreSQL",
  POSTGRES_VERSION,
  "bin",
);

function findExecutable(name) {
  const candidates = [path.join(DEFAULT_POSTGRES_BIN, name), name];

  for (const candidate of candidates) {
    try {
      if (candidate === name || fs.existsSync(candidate)) {
        execFileSync(candidate, ["--version"], {
          stdio: "ignore",
          windowsHide: true,
        });

        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return null;
}

function getPostgresTool(name) {
  const executable = findExecutable(`${name}.exe`);

  if (!executable) {
    throw new Error(
      `Unable to locate PostgreSQL ${name}.exe. ` +
        `Expected PostgreSQL ${POSTGRES_VERSION} or a PostgreSQL executable on PATH.`,
    );
  }

  return executable;
}

function checkPostgresReady() {
  const pgIsReady = getPostgresTool("pg_isready");

  const result = execFileSync(pgIsReady, ["-h", "localhost", "-p", "5432"], {
    encoding: "utf8",
    windowsHide: true,
  });

  console.log(result.trim());
}

function getPostgresVersion() {
  const psql = getPostgresTool("psql");

  const result = execFileSync(psql, ["--version"], {
    encoding: "utf8",
    windowsHide: true,
  });

  return result.trim();
}

function main() {
  console.log("Pharmacy Management System database bootstrap");
  console.log("Read-only environment check");
  console.log("");

  console.log(`PostgreSQL: ${getPostgresVersion()}`);

  console.log("Checking PostgreSQL readiness...");
  checkPostgresReady();

  console.log("");
  console.log("Database bootstrap environment check completed.");
  console.log("No database was created, modified, or deleted.");
}

try {
  main();
} catch (error) {
  console.error("");
  console.error("Database bootstrap check failed.");

  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error);
  }

  process.exitCode = 1;
}
