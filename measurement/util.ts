import { faker } from "@faker-js/faker";
import * as fs from "node:fs/promises";

export const cleanUp = async (DB_FILE: string) => {
  await fs.rm(DB_FILE, { force: true });
};

export const genData = (num: number) => {
  const data = new Map<string, string>();
  const dataGenStart = performance.now();
  while (data.size < num) {
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

export const calcAvg = (times: number[]) => {
  const sum = times.reduce((a, b) => a + b, 0);
  const avg = sum / times.length;
  return avg;
};
