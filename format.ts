/*
 * This implementation follows the bitcask paper: https://riak.com/assets/bitcask-intro.pdf
 * and https://github.com/avinassh/go-caskdb
 *
 * The header consists of the following:
 * timestamp - 4 bytes
 * keySize - 4 bytes
 * valueSize - 4 bytes
 *
 * After the header, is the record:
 * key - serialized string
 * value - serialized string
 *
 * the keySize and valueSize in the header will provide the offset information
 * necessary to know where a key and value starts or ends
 *
 * |                  HEADER                  |
 * | timestamp (4)| keySize (4)| valueSize (4)| key | value |
 *
 * The KeyDir is an in memory hashmap that maps the key to the file offset that the
 * value is at on disk
 * The format of a KeyDir entry is:
 *
 * timestamp - 4 bytes
 * valueSize - 4 bytes
 * valueOffset - 4 bytes
 *
 * */

export const HEADER_SIZE: number = 12;
export const KEY_DIR_ENTRY_SIZE: number = 12;

export interface KeyDirEntry {
  valueSize: number;
  valueOffset: number;
  timestamp: number;
}

export interface Header {
  timestamp: number;
  keySize: number;
  valueSize: number;
}

// maybe not necessary to store the key if there will be no restore
export interface KV {
  key: string;
  value: string;
}

export interface TmpdbRecord {
  header: Header;
  kv: KV;
}

export const encodeKeyDirEntry = (
  timestamp: number,
  valueSize: number,
  // this is the offset relative to the start of the database file
  valueOffset: number,
): Buffer => {
  const buf = Buffer.alloc(KEY_DIR_ENTRY_SIZE);
  buf.writeUInt32LE(timestamp, 0);
  buf.writeUInt32LE(valueSize, 4);
  buf.writeUInt32LE(valueOffset, 8);
  return buf;
};

export const decodeKeyDirEntry = (entry: Buffer): KeyDirEntry => {
  const timestamp = entry.readUInt32LE(0);
  const valueSize = entry.readUInt32LE(4);
  const valueOffset = entry.readUInt32LE(8);
  return {
    timestamp: timestamp,
    valueSize: valueSize,
    valueOffset: valueOffset,
  };
};

export const encodeHeader = (
  timestamp: number,
  keySize: number,
  valueSize: number,
): Buffer => {
  const buf = Buffer.alloc(HEADER_SIZE);

  // each slot in the buffer array is 1 byte
  // each item of the header is 4 bytes
  // therefore, each write of a UInt32 (which is 4 bytes)
  // needs to be done at previousOffset + 4
  buf.writeUint32LE(timestamp, 0);
  buf.writeUint32LE(keySize, 4);
  buf.writeUint32LE(valueSize, 8);
  return buf;
};

export const decodeHeader = (header: Buffer): Header => {
  const timestamp = header.readUInt32LE(0);
  const keySize = header.readUInt32LE(4);
  const valueSize = header.readUInt32LE(8);
  return {
    timestamp: timestamp,
    keySize: keySize,
    valueSize: valueSize,
  };
};

export const encodeRecord = (
  timestamp: number,
  key: string,
  value: string,
): {
  record: Buffer;
  // the valueOffset is needed to put into the KeyDir entry
  // this is relative to this individual entry, not the start of the database file
  // it is the headersize + keysize
  // this is where the value starts
  valueOffset: number;
  // valueSize is needed in the keyDir entry to know how much to read after the
  // valueOffset
  valueSize: number;
} => {
  const keyBuffer = Buffer.from(key);
  const valueBuffer = Buffer.from(value);
  const header = encodeHeader(timestamp, keyBuffer.length, valueBuffer.length);
  const kv = Buffer.concat([Buffer.from(key), Buffer.from(value)]);
  const record = Buffer.concat([header, kv]);
  return {
    record: record,
    valueOffset: HEADER_SIZE + keyBuffer.length,
    valueSize: valueBuffer.length,
  };
};

export const decodeRecord = (buf: Buffer): TmpdbRecord => {
  const header = decodeHeader(buf);

  const key = buf
    .subarray(HEADER_SIZE, HEADER_SIZE + header.keySize)
    .toString();

  const value = buf
    .subarray(
      HEADER_SIZE + header.keySize,
      HEADER_SIZE + header.keySize + header.valueSize,
    )
    .toString();

  return { header: header, kv: { key: key, value: value } };
};
