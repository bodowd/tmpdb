import * as fs from "node:fs/promises";
import { decodeKeyDirEntry, encodeKeyDirEntry, encodeRecord } from "./format";

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
  private writePosition: number;
  constructor(filename: string) {
    this.filename = filename;
    this.keyDir = new Map();
    this.writePosition = 0;
  }

  // this function must be run by the user because I was not able to find a
  // way to run this in the constructor with async
  async initialize(): Promise<void> {
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

  async set(key: string, value: string) {
    const timestamp = Math.floor(new Date().getTime() / 1000);
    const res = encodeRecord(timestamp, key, value);
    if (this.file) {
      try {
        // first append to file and flush to disk
        await this.file.appendFile(res.record);
        await this.file.sync();

        // update in memory hash map
        const entry = encodeKeyDirEntry(
          timestamp,
          res.valueSize,
          this.writePosition + res.valueOffset,
        );
        this.keyDir.set(key, entry);
        // advance the write position "pointer" the length of the new
        // record which was written so that the next record will be written
        // after this record's value
        this.writePosition += res.record.length;
      } catch (error) {
        throw new Error("Error appending to file: " + error);
      }
    } else {
      throw new Error("File is null");
    }
  }

  async get(key: string): Promise<null | void | string> {
    if (this.file) {
      try {
        // look into keyDir to find the offset in the db file of the value that belongs to this kv pair
        const keyDirBuf = this.keyDir.get(key);
        if (!keyDirBuf) {
          return null;
        }
        const entry = decodeKeyDirEntry(keyDirBuf);

        const buf = Buffer.alloc(entry.valueSize);
        // read into $buf
        // start filling $buf at 0
        // read $valueSize bytes
        // starting in the file at $valueOffset
        const { buffer: readBuffer } = await this.file.read(
          buf,
          0,
          entry.valueSize,
          entry.valueOffset,
        );
        return readBuffer.toString();
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(error.message);
        }
      }
    } else {
      throw new Error("File is null");
    }
  }
}
