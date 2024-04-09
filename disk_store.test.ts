import * as fs from "node:fs/promises";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import { TmpDb, fileExists } from "./disk_store";
import {
  HEADER_SIZE,
  TmpdbRecord,
  decodeKeyDirEntry,
  decodeRecord,
} from "./format";

const DB_FILE = "./tmp/tmpdb.db";

// helper function to check that record is written to disk
const checkDisk = async (
  key: string,
  value: string,
  offset: number,
): Promise<{ bytesRead: number; record: TmpdbRecord }> => {
  const fd = await fs.open(DB_FILE, "r");
  const keySize = Buffer.from(key).length;
  const valSize = Buffer.from(value).length;
  const buf = Buffer.alloc(HEADER_SIZE + keySize + valSize);
  const { bytesRead, buffer: readBuffer } = await fd.read(
    buf,
    0,
    buf.length,
    offset,
  );
  await fd.close();
  return {
    bytesRead: bytesRead,
    record: decodeRecord(readBuffer),
  };
};

// make a dummy file that can be used for tests
beforeAll(async () => {
  // a+ - open for reading and appending and  create if not existing yet
  const fd = await fs.open("./tmp/dummyfile.db", "a+");
  await fd.close();
});

beforeEach(async () => {
  // file should not exist
  expect(await fileExists(DB_FILE)).toBe(false);
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
    // file should exist after instance of class is created
    const db = new TmpDb(DB_FILE);
    await db.initialize();
    expect(db.file).not.toBeNull();
    await db.file?.close();
  });
});

describe("sets a key value", () => {
  test("the key value is found in the db file", async () => {
    const db = new TmpDb(DB_FILE);
    await db.initialize();
    await db.set("hello", "test");
    // this is the first value being written so the offset is at 0
    // should read the length of record, which is the buffer length
    // that was allocated
    const diskRecord = await checkDisk("hello", "test", 0);

    expect(diskRecord.record.kv).toStrictEqual({ key: "hello", value: "test" });
    expect(diskRecord.bytesRead).toEqual(21);

    // db file should be 21 bytes now
    const stats = await db.file?.stat();
    expect(stats?.size).toEqual(21);

    await db.file?.close();
  });

  test("the corresponding keyDir entry is found", async () => {
    const db = new TmpDb(DB_FILE);
    await db.initialize();
    await db.set("found", "yes");

    expect(db.keyDir.get("found")).toBeDefined();
    // make sure this key is not found
    expect(db.keyDir.get("not found")).toBeUndefined();

    await db.file?.close();
  });

  test("database file is appended to", async () => {
    const db = new TmpDb(DB_FILE);
    await db.initialize();
    await db.set("hello", "test");
    const stats1 = await db.file?.stat();
    expect(stats1?.size).toEqual(21);

    // after adding 21 one more bytes, file size should increase to 42
    await db.set("name", "tmpdb");
    const stats2 = await db.file?.stat();
    expect(stats2?.size).toEqual(42);

    await db.file?.close();
  });

  test("value is updated in the keyDir if existing kv pair is updated", async () => {
    const db = new TmpDb(DB_FILE);
    await db.initialize();
    await db.set("hello", "test");

    const val1 = db.keyDir.get("hello");
    const offset1 = val1?.readUInt32LE(8);
    // first record is 21 bytes
    // value is 4 bytes
    // so value offset should be HEADER_SIZE + 5 bytes ("hello")
    expect(offset1).toEqual(17);

    await db.set("hello", "updated value");
    const val2 = db.keyDir.get("hello");
    expect(val2).toBeDefined();
    if (val2) {
      const offset2 = decodeKeyDirEntry(val2).valueOffset;
      // after appending to the file, the offset of the "hello" key
      // should now be 21 (previous record size) + 17 (HEADER_SIZE + 5 bytes for "hello")
      // 38
      expect(offset2).toEqual(38);
    }

    await db.file?.close();
  });
});

describe("gets a value", () => {
  test("returns value if key exists", async () => {
    const db = new TmpDb(DB_FILE);
    await db.initialize();
    await db.set("hello", "get test");

    const val = await db.get("hello");
    expect(val).toEqual("get test");

    await db.file?.close();
  });

  test("returns null if key not found", async () => {
    const db = new TmpDb(DB_FILE);
    await db.initialize();
    await db.set("hello", "get test");
    const val = await db.get("bye");
    expect(val).toBeNull();

    await db.file?.close();
  });

  test("returns the new value if a key is updated", async () => {
    const db = new TmpDb(DB_FILE);
    await db.initialize();
    await db.set("hello", "get test");
    const val1 = await db.get("hello");
    expect(val1).toEqual("get test");
    await db.set("hello", "updated");
    const val2 = await db.get("hello");
    expect(val2).toEqual("updated");

    await db.file?.close();
  });
});

describe("batch set kv pairs", () => {
  let data: { key: string; value: string }[] = [];
  for (let i = 0; i < 100; i++) {
    data.push({ key: i.toString(), value: i.toString() });
  }

  test("sets in batches successfully", async () => {
    const db = new TmpDb(DB_FILE);
    await db.initialize();

    await db.setMany(data);

    for (const d of data) {
      const val = await db.get(d.key);
      if (val) {
        expect(val).toEqual(d.value);
      }
    }
    await db.file?.close();
  });
});
