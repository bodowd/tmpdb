import { performance } from "node:perf_hooks";
import { faker } from "@faker-js/faker";
import { TmpDb } from "../disk_store";
import * as fs from "node:fs/promises";
import { KV } from "../format";

const DB_FILE = "./tmp/tmpdb.db";
const NUM: number = 1000000;
const cleanUp = async () => {
  await fs.rm(DB_FILE, { force: true });
};

const genData = () => {
  const data = new Map<string, string>();
  const dataGenStart = performance.now();
  while (data.size < NUM) {
    // const key = faker.person.firstName();
    const key = faker.git.commitSha();
    const value = faker.finance.accountName();

    // store unique keys so we don't have any updates
    if (!data.has(key)) {
      data.set(key, value);
    }
  }
  const dataGenEnd = performance.now();

  console.log("DATA GEN (ms): ", dataGenEnd - dataGenStart);

  let res = [];
  for (const e of data.entries()) {
    res.push({ key: e[0], value: e[1] });
  }
  return res;
};

const calcAvg = (times: number[]) => {
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  return avg;
};

const setData = async (db: TmpDb, data: KV[]) => {
  const times = [];
  const start = performance.now();
  for (const d of data) {
    const start = performance.now();

    await db.set(d.key, d.value);

    const end = performance.now();
    times.push(end - start);
  }
  const avg = calcAvg(times);
  const end = performance.now();
  console.log("AVG TIME TO WRITE PER ENTRY (ms): ", avg);
  console.log("TOTAL WRITE TIME (ms): ", end - start);
};

const setManyData = async (db: TmpDb, data: KV[]) => {
  const start = performance.now();
  await db.setMany(data);
  const end = performance.now();
  console.log("TIME PER ENTRY (ms): ", (end - start) / data.length);
  console.log("TOTAL WRITE TIME TO SET MANY (ms): ", end - start);
};

const getData = async (db: TmpDb, data: KV[]) => {
  // measure getting data
  const errors = [];
  const times = [];
  const start = performance.now();
  for (const d of data) {
    const startGetOne = performance.now();
    const val = await db.get(d.key);
    if (!val || d.value !== val) {
      errors.push(d, val);
    }
    const endGetOne = performance.now();
    times.push(endGetOne - startGetOne);
  }
  const end = performance.now();
  const avg = calcAvg(times);
  console.log("ERRORS: ", errors);
  console.log("AVG GET TIME PER ENTRY (ms): ", avg);
  console.log("TOTAL GET TIME (ms): ", end - start);
};

const main = async () => {
  await cleanUp();
  let db = new TmpDb(DB_FILE);
  await db.initialize();

  console.log(`RUNNING ${NUM} SAMPLES`);

  const data = genData();

  console.log("measure set one by one");
  await setData(db, data);
  await getData(db, data);

  console.log("cleaning up and now running setMany");
  await cleanUp();
  db = new TmpDb(DB_FILE);
  await db.initialize();

  await setManyData(db, data);
  await getData(db, data);
};

main()
  .then(() => console.log("ok"))
  .catch((err) => console.error(err));

// simpleTest()
//   .then(() => console.log("ok"))
//   .catch((err) => console.error(err));
