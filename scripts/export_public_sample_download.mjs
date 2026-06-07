import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const siteDir = path.join(root, "site");
const zipPath = path.join(siteDir, "trendfoundry-free-sample-pack.zip");
const manifestPath = path.join(siteDir, "trendfoundry-free-sample-pack.json");
const publicSiteUrl = "https://bravecownofear.github.io/trendfoundry/";
const issueOrderHref = "https://github.com/BraveCowNoFear/trendfoundry/issues/new?template=order-sample-pack.yml&title=Sample%20pack%20request%3A%20";
const contactEmail = "rivan_Britain@outlook.com";

const sourceFiles = [
  ["public-sample.en.md", "public-sample.en.md", "text/markdown"],
  ["public-sample.zh-CN.md", "public-sample.zh-CN.md", "text/markdown"],
  ["public-sample.en.csv", "public-sample.en.csv", "text/csv"],
  ["public-sample.zh-CN.csv", "public-sample.zh-CN.csv", "text/csv"],
  ["ready-to-record-script.md", "ready-to-record-script.md", "text/markdown"],
  ["signal-board.png", "signal-board.png", "image/png"],
  ["signal-board.meta.json", "signal-board.meta.json", "application/json"]
];

const orderInstructions = `# TrendFoundry Sample Pack

This ZIP contains the public proof assets only. It is safe to share with potential buyers.

## Files

- public-sample.en.md / public-sample.zh-CN.md: three current opportunities with proof links.
- public-sample.en.csv / public-sample.zh-CN.csv: the same sample in spreadsheet-friendly form.
- ready-to-record-script.md: one scene-by-scene script example.
- signal-board.png: the current visual signal board.
- signal-board.meta.json: data timestamp and top-item provenance for the board image.

## Upgrade

- Sample issue: USD 9 one-off.
- Weekly brief: USD 19/month.
- Custom niche: USD 49/month.

Order page: ${publicSiteUrl}order/
GitHub request: ${issueOrderHref}
Email: ${contactEmail}

Do not send card numbers, passwords, private IDs, wallet seeds, or payment credentials through public issues or email.
`;

const readme = `TrendFoundry Free Sample Pack

Open order-instructions.md first.

Generated from public site files. Seller-only files such as prospects.csv, outreach-board.md, latest.json, raw leads, and private order data are intentionally excluded.
`;

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosTime, dosDate } = dosDateTime();

  for (const entry of entries) {
    const name = Buffer.from(entry.name.replace(/\\/g, "/"), "utf8");
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const crc = crc32(data);
    const localHeader = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0x0800),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name
    ]);
    localParts.push(localHeader, data);

    centralParts.push(
      Buffer.concat([
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0x0800),
        u16(0),
        u16(dosTime),
        u16(dosDate),
        u32(crc),
        u32(data.length),
        u32(data.length),
        u16(name.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        name
      ])
    );
    offset += localHeader.length + data.length;
  }

  const centralDir = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(offset),
    u16(0)
  ]);
  return Buffer.concat([...localParts, centralDir, end]);
}

await mkdir(siteDir, { recursive: true });

const entries = [
  { name: "README.txt", data: Buffer.from(readme, "utf8") },
  { name: "order-instructions.md", data: Buffer.from(orderInstructions, "utf8") }
];

for (const [source, target] of sourceFiles) {
  entries.push({ name: target, data: await readFile(path.join(siteDir, source)) });
}

const manifest = {
  product: "TrendFoundry Free Sample Pack",
  generatedAt: new Date().toISOString(),
  publicSiteUrl,
  orderPage: `${publicSiteUrl}order/`,
  githubRequest: issueOrderHref,
  contactEmail,
  zip: "trendfoundry-free-sample-pack.zip",
  files: [
    "README.txt",
    "order-instructions.md",
    ...sourceFiles.map(([, target]) => target)
  ],
  excludedSellerOnlyFiles: ["prospects.csv", "outreach-board.md", "latest.json", "data/leads.json", "docs/lead-pipeline.md"],
  safety: [
    "Public proof assets only.",
    "No seller-only prospect list or private order data included.",
    "No payment credentials are requested in the public pack."
  ]
};

entries.push({ name: "manifest.json", data: Buffer.from(JSON.stringify(manifest, null, 2), "utf8") });
manifest.files.push("manifest.json");

await writeFile(zipPath, makeZip(entries));
await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

console.log(`Wrote ${zipPath}`);
console.log(`Wrote ${manifestPath}`);
