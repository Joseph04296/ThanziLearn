const fs = require('fs');
const path = require('path');
const fontkit = require('@pdf-lib/fontkit');
const { PDFDocument, rgb } = require('pdf-lib');

// The supplied certificate is a flattened design, not a fillable PDF form.
// The committed template has had its baked-in placeholder text removed; this
// module draws the real learner name, course title and issue date in its place.
const TEMPLATE_BYTES = fs.readFileSync(path.join(__dirname, 'assets', 'ThanziLearn-Certificate.pdf'));
const NAME_FONT_BYTES = fs.readFileSync(path.join(__dirname, 'assets', 'fonts', 'CormorantInfant-Bold.ttf'));
const TEXT_FONT_BYTES = fs.readFileSync(path.join(__dirname, 'assets', 'fonts', 'Roboto-Bold.ttf'));

const toArrayBuffer = buf => Uint8Array.from(buf).buffer;
const cloneBytes = buf => Uint8Array.from(buf);

const NAME_INK = rgb(54 / 255, 48 / 255, 52 / 255);
const BLUE = rgb(21 / 255, 101 / 255, 216 / 255);
const DATE_INK = rgb(58 / 255, 53 / 255, 57 / 255);

// Coordinates use pdf-lib's bottom-left origin, in PDF points. The page is
// A4 landscape (841.92 x 595.92 pt). `centerX` is the measured centre of each
// original placeholder, so replacements land on the same design lines.
const FIELDS = {
  learnerName: {
    centerX: 416, baselineY: 292.3, baseSize: 60, minSize: 32, maxWidth: 470,
    color: NAME_INK, font: 'name',
  },
  courseTitle: {
    centerX: 412, baselineY: 217, baseSize: 19.5, minSize: 11, maxWidth: 350,
    color: BLUE, font: 'text',
  },
  issuedAt: {
    centerX: 412, baselineY: 98.3, baseSize: 17.65, minSize: 11, maxWidth: 280,
    color: DATE_INK, font: 'text',
  },
};

const clean = value => String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();

function fittedSize(font, text, field) {
  let size = field.baseSize;
  while (size > field.minSize && font.widthOfTextAtSize(text, size) > field.maxWidth) size -= 0.5;
  return size;
}

function formatIssuedAt(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Africa/Blantyre',
  }).format(date);
}

async function generateCertificatePdf({ learnerName, courseTitle, issuedAt }) {
  const pdfDoc = await PDFDocument.load(cloneBytes(TEMPLATE_BYTES));
  pdfDoc.registerFontkit(fontkit);

  const fonts = {
    name: await pdfDoc.embedFont(toArrayBuffer(cloneBytes(NAME_FONT_BYTES))),
    text: await pdfDoc.embedFont(toArrayBuffer(cloneBytes(TEXT_FONT_BYTES))),
  };

  const values = {
    learnerName: clean(learnerName) || 'Learner',
    courseTitle: clean(courseTitle) || 'Course',
    issuedAt: formatIssuedAt(issuedAt),
  };

  const page = pdfDoc.getPages()[0];

  for (const [key, field] of Object.entries(FIELDS)) {
    const text = values[key];
    if (!text) continue;
    const font = fonts[field.font];
    const size = fittedSize(font, text, field);
    const width = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: field.centerX - width / 2,
      y: field.baselineY,
      size,
      font,
      color: field.color,
    });
  }

  return Buffer.from(await pdfDoc.save());
}

module.exports = { generateCertificatePdf, formatIssuedAt };
