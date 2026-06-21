import { getDocument } from './node_modules/pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

const data = new Uint8Array(fs.readFileSync('public/docs/tamil-bible-pothu-mozhipeyarppu.pdf'));
const pdf = await getDocument({ data, disableWorker: true }).promise;
console.log('Pages:', pdf.numPages);
const outline = await pdf.getOutline();
console.log('Has outline:', !!outline, 'length:', outline ? outline.length : 0);
if (outline && outline.length) {
  console.log(JSON.stringify(outline.slice(0, 10), null, 2));
}
