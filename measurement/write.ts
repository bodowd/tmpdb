import { performance } from "node:perf_hooks";
import { faker } from "@faker-js/faker";
import { TmpDb } from "../disk_store";
import * as fs from "node:fs/promises";
import { KV } from "../format";

const DB_FILE = "./tmp/tmpdb.db";
const NUM: number = 1000;
const cleanUp = async () => {
  await fs.rm(DB_FILE, { force: true });
};

const genData = () => {
  const dataGenStart = performance.now();
  let data: KV[] = [];
  for (let i = 0; i < NUM; i++) {
    const key = faker.person.firstName();
    // const acct = faker.image.dataUri();
    const value = faker.finance.accountName();
    data.push({ key: key, value: value });
  }
  const dataGenEnd = performance.now();

  console.log("DATA GEN (ms): ", dataGenEnd - dataGenStart);

  return data;
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

const getData = async (db: TmpDb, data: KV[]) => {
  // measure getting data
  const errors = [];
  const times = [];
  const start = performance.now();
  for (const d of data) {
    const startGetOne = performance.now();
    const val = await db.get(d.key);
    if (!val) {
      errors.push(val);
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
  const db = new TmpDb(DB_FILE);
  await db.initialize();

  console.log(`RUNNING ${NUM} SAMPLES`);

  const data = genData();
  await setData(db, data);
  await getData(db, data);
};

main()
  .then(() => console.log("ok"))
  .catch((err) => console.error(err));

// simpleTest()
//   .then(() => console.log("ok"))
//   .catch((err) => console.error(err));
