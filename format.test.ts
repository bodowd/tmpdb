import { expect, test } from "vitest";

import {
  Header,
  decodeHeader,
  decodeRecord,
  encodeHeader,
  encodeKeyDirEntry,
  encodeRecord,
} from "./format";

test("encodeHeader", () => {
  const tests: Header[] = [
    { timestamp: 16, keySize: 16, valueSize: 16 },
    { timestamp: 1000, keySize: 1024, valueSize: 512 },
  ];
  for (const t of tests) {
    const header = encodeHeader(t.timestamp, t.keySize, t.valueSize);
    const timestamp = header.readUInt32LE(0);
    const keySize = header.readUInt32LE(4);
    const valueSize = header.readUInt32LE(8);
    expect(timestamp).toEqual(t.timestamp);
    expect(keySize).toEqual(t.keySize);
    expect(valueSize).toEqual(t.valueSize);
  }
});

test("decodeHeader", () => {
  const tests: { buffer: Buffer; expectedResult: Header }[] = [
    {
      buffer: Buffer.from([
        0x10, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00,
      ]),
      expectedResult: {
        timestamp: 16,
        keySize: 16,
        valueSize: 16,
      },
    },
    {
      buffer: Buffer.from([
        0xe8, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x02, 0x00, 0x00,
      ]),
      expectedResult: {
        timestamp: 1000,
        keySize: 1024,
        valueSize: 512,
      },
    },
  ];

  for (const t of tests) {
    const header = decodeHeader(t.buffer);
    expect(header.timestamp).toEqual(t.expectedResult.timestamp);
    expect(header.keySize).toEqual(t.expectedResult.keySize);
    expect(header.valueSize).toEqual(t.expectedResult.valueSize);
  }
});

test("encodeRecord", () => {
  const tests = [
    // header is 12 bytes
    // each ascii character is 1 byte
    // header + "hello" + "world" = 12 + 5 + 5 = 22
    {
      timestamp: 10,
      key: "hello",
      value: "world",
      expectedSize: 22,
      expectedValueSize: 5,
      expectedValueOffset: 17,
    },
    {
      timestamp: 20,
      key: "system:node",
      value: "2",
      expectedSize: 24,
      expectedValueOffset: 23,
      expectedValueSize: 1,
    },
    // smiley face is 4 bytes
    {
      timestamp: 30,
      key: "😊",
      value: "happy",
      expectedSize: 21,
      expectedValueOffset: 16,
      expectedValueSize: 5,
    },
  ];

  for (const t of tests) {
    const result = encodeRecord(t.timestamp, t.key, t.value);
    expect(result.record.length).toEqual(t.expectedSize);
    expect(result.valueOffset).toEqual(t.expectedValueOffset);
    expect(result.valueSize).toEqual(t.expectedValueSize);
  }
});

test("decodeRecord", () => {
  const tests = [
    {
      buffer: Buffer.from([
        0x0a, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00,
        0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x77, 0x6f, 0x72, 0x6c, 0x64,
      ]),
      expectedResult: {
        timestamp: 10,
        key: "hello",
        value: "world",
      },
    },
    {
      buffer: Buffer.from([
        0x14, 0x00, 0x00, 0x00, 0x0b, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
        0x73, 0x79, 0x73, 0x74, 0x65, 0x6d, 0x3a, 0x6e, 0x6f, 0x64, 0x65, 0x32,
      ]),
      expectedResult: {
        timestamp: 20,
        key: "system:node",
        value: "2",
      },
    },
    {
      buffer: Buffer.from([
        0x1e, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00,
        0xf0, 0x9f, 0x98, 0x8a, 0x68, 0x61, 0x70, 0x70, 0x79,
      ]),
      expectedResult: {
        timestamp: 30,
        key: "😊",
        value: "happy",
      },
    },
  ];
  for (const t of tests) {
    const record = decodeRecord(t.buffer);
    expect(record.header.timestamp).toStrictEqual(t.expectedResult.timestamp);
    expect(record.kv.key).toStrictEqual(t.expectedResult.key);
    expect(record.kv.value).toStrictEqual(t.expectedResult.value);
  }
});

test("encodeKeyDirEntry", () => {
  const tests = [
    {
      timestamp: 10,
      valueSize: 10,
      valueOffset: 100,
    },
  ];

  for (const t of tests) {
    const buf = encodeKeyDirEntry(t.timestamp, t.valueSize, t.valueOffset);
    const timestamp = buf.readUInt32LE(0);
    const valueSize = buf.readUInt32LE(4);
    const valueOffset = buf.readUInt32LE(8);
    expect(t.timestamp).toEqual(timestamp);
    expect(t.valueSize).toEqual(valueSize);
    expect(t.valueOffset).toEqual(valueOffset);
  }
});
