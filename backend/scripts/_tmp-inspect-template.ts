import { readFileSync } from 'fs';
import { PDFDocument } from 'pdf-lib';

async function main() {
  const bytes = readFileSync('C:/Users/Administrator/Downloads/Sample Certificate.pdf');
  const doc = await PDFDocument.load(bytes);
  const page = doc.getPage(0);
  console.log('page size', page.getSize());
  try {
    const form = doc.getForm();
    const fields = form.getFields();
    console.log('field count', fields.length);
    for (const f of fields) {
      console.log(f.getName(), f.constructor.name);
    }
  } catch (e) {
    console.log('no form / error', (e as Error).message);
  }
  console.log('page count', doc.getPageCount());
}

main().catch((e) => { console.error(e); process.exit(1); });
