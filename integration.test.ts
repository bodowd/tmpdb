import * as fs from "node:fs/promises";
import { describe, expect, test, vitest } from "vitest";
import { TmpDb } from "./disk_store";
import { faker } from "@faker-js/faker";

const DB_FILE = "./tmp/tmpdb.db";

const cleanUp = async () => {
  await fs.rm(DB_FILE, { force: true });
};

describe("writes and reads", () => {
  const NUM: number = 1000;
  const data: { key: string; value: string }[] = [];
  for (let i = 0; i < NUM; i++) {
    const key = faker.person.fullName();
    const value = faker.airline.flightNumber();
    data.push({ key: key, value: value });
  }

  test("writing a lot of random data gives expected outputs back", async () => {
    await cleanUp();
    const db = new TmpDb(DB_FILE);
    await db.initialize();

    for (const d of data) {
      await db.set(d.key, d.value);
      const val = await db.get(d.key);
      expect(val).toEqual(d.value);
    }
  });
});
