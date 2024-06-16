import * as fs from "node:fs/promises";
import { encodeKeyDirEntry, encodeRecord } from "./format";

export const fileExists = async (filename: string): Promise<boolean> => {
  try {
    const stat = await fs.stat(filename);
    if (stat.isFile()) {
      return true;
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("ENOENT")) {
        return false;
      }
    }
    throw new Error("Error with checking if file exists: " + error);
  }
  return false;
};

export class TmpDb {
  filename: string;
  // need to have the undefined there to tell Typescript there will not be
  // an initializer
  file: fs.FileHandle | undefined;
  keyDir: Map<string, Buffer>;
  // the current position in the file being written to
  writePosition: number;
  constructor(filename: string) {
    this.filename = filename;
    this.keyDir = new Map();
    this.writePosition = 0;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      const exists = await fileExists(this.filename);
      if (exists) {
        throw new Error(
          "tmpdb does not support reusing an existing file. Please use a different filename",
        );
      }
      // ax+ - open for reading and appending but fail if exists
      this.file = await fs.open(this.filename, "ax+");
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Error with checking if file exists")) {
          throw new Error("Error with checking if file exists");
        }
      }
      throw new Error("Error opening file: " + error);
    }
  }

  set(key: string, value: string) {
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const record = encodeRecord(timestamp, key, value);
    if (this.file) {
      try {
        // first append to file and flush to disk
        this.file.appendFile(record.buffer);
        this.file.sync();

        // update in memory hash map
        const entry = encodeKeyDirEntry(
          timestamp,
          record.valueSize,
          this.writePosition,
        );
        this.keyDir.set(key, entry);
        this.writePosition += record.valueSize;
      } catch (error) {
        throw new Error("Error appending to file: " + error);
      }
    } else {
      throw new Error("File is null");
    }
  }
}
