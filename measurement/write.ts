import { performance } from "node:perf_hooks";
import { faker } from "@faker-js/faker";
import { TmpDb } from "../disk_store";
import * as fs from "node:fs/promises";

const DB_FILE = "./tmp/tmpdb.db";
const NUM: number = 10000;
const cleanUp = async () => {
  await fs.rm(DB_FILE, { force: true });
};

const main = async () => {
  await cleanUp();
  const db = new TmpDb(DB_FILE);
  await db.initialize();

  const dataGenStart = performance.now();
  let data = [];
  for (let i = 0; i < NUM; i++) {
    const name = faker.person.firstName();
    const acct = faker.image.dataUri();
    data.push([name, acct]);
  }
  const dataGenEnd = performance.now();
  console.log("DATA GEN (ms): ", dataGenEnd - dataGenStart);

  const times = [];
  const startOverall = performance.now();
  for (const d of data) {
    const start = performance.now();
    db.set(d[0], d[1]);
    const end = performance.now();
    times.push(end - start);
  }
  const endOverall = performance.now();
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  console.log("AVG TIME TO WRITE PER ENTRY (ms): ", avg);
  console.log("TOTAL WRITE TIME (ms): ", endOverall - startOverall);
};

main()
  .then(() => console.log("ok"))
  .catch((err) => console.error(err));
