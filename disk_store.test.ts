import * as fs from "node:fs/promises";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { TmpDb, fileExists } from "./disk_store";

const DB_FILE = "./tmp/tmpdb.db";

// make a dummy file that can be used for tests
beforeAll(async () => {
  // a+ - open for reading and appending and  create if not existing yet
  await fs.open("./tmp/dummyfile.db", "a+");
});

// clean up after tests
afterEach(async () => {
  await fs.rm(DB_FILE, { force: true });
});

describe("fileExists", () => {
  test("returns true if file exists", async () => {
    const e = await fileExists("./tmp/dummyfile.db");
    expect(e).toBe(true);
  });

  test("returns false if file does not exist", async () => {
    const e = await fileExists(DB_FILE);
    expect(e).toBe(false);
  });
});

describe("initialize TmpDb", () => {
  test("creates a new file", async () => {
    // file should not exist
    expect(await fileExists(DB_FILE)).toBe(false);
    // file should exist after instance of class is created
    const db = new TmpDb(DB_FILE);
    expect(db.file).not.toBeNull();
  });
});

describe("sets a key value");
