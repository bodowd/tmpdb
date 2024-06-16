# tmpdb

tmpdb is an embedded key-value store for NodeJS. It is based off the bitcask[[1]]
paper. It is designed to just serve as a temorary cache that writes values to disk,
rather than just store data in memory. Currently, it does not support features
that a more long term storage would need, like merging and compaction of database
files, since tmpdb is not intended for long term storage, it's just a temporary cache.
It also only supports a couple functions from the bitcask API.

The motivation behind it was to use this as a cache in memory-constrained
environments, namely in an AWS Lambda function.

AWS Lambda functions allow access to the `/tmp` directory and it supports up to
10 GB of ephemeral storage[[2]]. tmpdb could use this directory to store a database
file.

tmpdb handles writing key value pairs to disk and finding these records later through
a simple API.

## Acknowledgements

The bitcask[[1]] paper describes "a Log-Structured Hash Table for Fast Key/Value Data",
and tmpdb is implemented following this paper, and also by looking at go-caskdb[[3]]
for inspiration and guidance.

## How does it work

The key value pairs are stored in a single file on disk. Each new record is simply
appended to the end of this file.

```
┌───────────────────┬────────────────┬────────────────┬───────────────────┐
│1,k:hello,v:world  │ 2,k:bit,v:cask │3,k:Node,v:JS   │ next record here  │
└───────────────────┴────────────────┴────────────────┴───────────────────┘
```

An in-memory hash table is used to track where values on disk are for a given key.
The offset indicates where in the file the value resides. There is some additional information
that is needed to know how much of the file to read, but basically this is the main
idea.

| key   | value     |
| ----- | --------- |
| hello | offset: 1 |
| bit   | offset: 2 |
| Node  | offset: 3 |

The data in both the records on disk as well as in the in-memory hash table are
serialized to binary.

More details on how the file format and hash table format can be found in `format.ts`

## Installation

I haven't worked on distributing this package yet. But if you want to use it now,
just copy the code into your code.

## API

`set(key: string, value: string): Promise<void>`
`setMany(kvPairs: KV[]): Promise<void>`
`get(key: string): Promise<null | void | string>`

## Usage

```js
// create a new TmpDb instance, and then run `initialize`
// IMPORTANT: make sure you use `await`!

// tell tmpdb where to create a file
const DB_FILE = "/tmp/tmpdb.db";
const db = new TmpDb(DB_FILE);
await db.initialize();

await db.set('hello', 'welcome');
await db.set('bye', 'have a good one');

/* if you want to batch up records before flushing to disk,
* there is the setMany method
* you may find writes of many records faster with this
* method
*/
await db.set([
    {key: '1', value: 'flask'},
    {key: '2':, value: 'pipette'},
    {key: '3':, value: 'stir bar'},
    {key: '4':, value: 'column'},
])


// get what you have set
// val is 'welcome'
const val = await db.get('hello')

// if you use an existing key, it will overwrite the value
await db.set('hello', 'world')


// newVal is now 'world'
const newVal = await db.get('hello')

```

## Experiments

You can find a script in `/measurement` which does some timing on how fast
it is to write records and get records. You can try it out on your computer
to see how it performs for you.

On some quick tests, I found this implementation can write a record in ~6 ms and
read a record in <0.1 ms. Using the `setMany` function, which accumulates the writes in
memory until a limit before flushing to disk, this can get to an average write per record
of ~0.05 ms.

This seems consistent with what was reported in the bitcask paper.

I was curious about how sqlite would perform. I created a table with a key column and a value
column, and then created an index on key. I also used Prisma as an ORM in the tests.
I saw an average of ~20 ms writes per record and ~0.3 ms reads. The times did
not shift beyond random noise (from a quick glance) between 100 to 100000 records.

But you should test it out on your data and machine to see how it works for you.

[1]: https://riak.com/assets/bitcask-intro.pdf
[2]: https://aws.amazon.com/blogs/aws/aws-lambda-now-supports-up-to-10-gb-ephemeral-storage/
[3]: https://github.com/avinassh/go-caskdb/tree/master
