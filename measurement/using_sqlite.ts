/*
 * Make sure to run npx prisma migrate reset before to wipe the database
 * and start new
 * */

import { performance } from "node:perf_hooks";
import { KV } from "../format";
import { PrismaClient } from "@prisma/client";
import { calcAvg, genData } from "./util";
const prisma = new PrismaClient();

const NUM: number = 100000;

const setData = async (data: KV[]) => {
  let times: number[] = [];

  const startWrite = performance.now();
  for (const d of data) {
    const start = performance.now();
    await prisma.kV.create({ data: { key: d.key, value: d.value } });
    const end = performance.now();
    times.push(end - start);
  }

  const endWrite = performance.now();
  const avg = calcAvg(times);
  console.log("AVG TIME TO WRITE PER ENTRY (ms): ", avg);
  console.log("TOTAL WRITE TIME (ms): ", endWrite - startWrite);
};

const getData = async (data: KV[]) => {
  const times: number[] = [];
  let errors: (string | void | KV | null)[] = [];
  const startGet = performance.now();

  for (const d of data) {
    const start = performance.now();
    const row = await prisma.kV.findFirst({ where: { key: d.key } });
    if (row?.value !== d.value) {
      errors.push(d, row);
    }
    const end = performance.now();
    times.push(end - start);
  }

  const endGet = performance.now();
  const avg = calcAvg(times);
  console.log("ERRORS: ", errors);
  console.log("AVG GET TIME PER ENTRY (ms): ", avg);
  console.log("TIME TO GET (ms): ", endGet - startGet);
};

const main = async () => {
  console.log(`RUNNING ${NUM} SAMPLES`);
  const data = genData(NUM);

  console.log("MEASURE SETTING DATA...");
  await setData(data);

  console.log("MEASURE GETTING DATA...");
  await getData(data);
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
