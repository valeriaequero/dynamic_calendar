const express = require('express');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const SECRET = process.env.DAYS_SECRET;   // set on Render

const app = express();
const PORT = 3000;

GlobalFonts.registerFromPath('./fonts/SF-Pro-Text-Regular.otf', 'SF Pro Text');
GlobalFonts.registerFromPath('./fonts/SF-Pro-Display-Regular.otf', 'SF Pro Display');
GlobalFonts.registerFromPath('./fonts/SF-Pro-Display-RegularItalic.otf', 'SF Pro Italic');

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {

  const paragraphs = String(text).split('\n');

  for (const p of paragraphs) {
    const words = p.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const testWidth = ctx.measureText(testLine).width;

      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trimEnd(), x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }

    if (line) {
      ctx.fillText(line.trimEnd(), x, y);
      y += lineHeight;
    }

    // small paragraph gap
    y += Math.floor(lineHeight * 0.35);
  }

  return y;
}

app.get('/days', (req, res) => {
    if (!SECRET || req.query.key !== SECRET) return res.sendStatus(401);

  const width = parseInt(req.query.width) || 1170;
  const height = parseInt(req.query.height) || 2532;

  const bgColor = '#' + (req.query.bg || 'f6f3ef');
  const dotColor = '#' + (req.query.dot || 'cfcac4');        // not passed
  const passedColor = '#' + (req.query.passed || '0e151f');  // passed (not today)
  const todayColor = '#' + (req.query.today || 'd06b4a');    // today
  const textColor = '#' + (req.query.text || '2b2b2b');

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // background
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // ---- TOP VERSE (HARDCODED) ----
  const verseRef = 'Isaiah 40';
  const verseText =
`³⁰ Even youths shall faint and be weary,
     and young men shall fall exhausted;
³¹ but they who wait for the Lord shall renew their strength,
     they shall mount up with wings like eagles,
   they shall run and not be weary,
     they shall walk and not faint.`;

  const verseX = width / 2;
  const verseMaxWidth = width - 2 * 120; // tune later
  let verseY = 660;                      // tune later

  ctx.fillStyle = '#0e151f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.font = '32px "SF Pro Italic"';
  ctx.fillText(verseRef, verseX, verseY);
  verseY += 40;

  ctx.font = '25px "SF Pro Display"';
  wrapText(ctx, verseText, verseX, verseY, verseMaxWidth, 22);

  // ---- DATE MATH ----
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  const dayOfYear = Math.floor((now - start) / 86400000) + 1;
  const totalDays = Math.floor((end - start) / 86400000) + 1;
  const daysLeft = totalDays - dayOfYear;
  const pct = Math.round((dayOfYear / totalDays) * 100);

  // FIXED GRID SHAPE
  const cols = 15;
  const rows = 25;

  // spacing knobs
  const sidePadding = parseInt(req.query.side || '50');
  const topPadding = parseInt(req.query.top || '900');
  const bottomPadding = parseInt(req.query.bottom || '310');
  const gap = parseInt(req.query.gap || '13');

  const maxGridW = width - 2 * sidePadding;
  const maxGridH = height - topPadding - bottomPadding;

  const dotDiameterW = (maxGridW - (cols - 1) * gap) / cols;
  const dotDiameterH = (maxGridH - (rows - 1) * gap) / rows;
  const dotDiameter = Math.floor(Math.min(dotDiameterW, dotDiameterH));

  const radius = dotDiameter / 2;
  const pitch = dotDiameter + gap;

  const gridW = cols * dotDiameter + (cols - 1) * gap;
  const gridH = rows * dotDiameter + (rows - 1) * gap;

  const startX = Math.round((width - gridW) / 2);
  const startY = Math.round(topPadding + (maxGridH - gridH) / 2);

  // draw dots
  for (let i = 1; i <= totalDays; i++) {
    const idx = i - 1;
    const c = idx % cols;
    const rrow = Math.floor(idx / cols);

    const cx = startX + radius + c * pitch;
    const cy = startY + radius + rrow * pitch;

    const isPassed = i < dayOfYear;
    const isToday = i === dayOfYear;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);

    if (isToday) ctx.fillStyle = todayColor;
    else if (isPassed) ctx.fillStyle = passedColor;
    else ctx.fillStyle = dotColor;

    ctx.fill();
  }

  // bottom text
  ctx.fillStyle = todayColor;
  ctx.font = '32px "SF Pro Display"';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(`${daysLeft} days left · ${pct}%`, width / 2, height - 270);

  res.set('Content-Type', 'image/png');
  res.send(canvas.toBuffer('image/png'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Test: http://localhost:${PORT}/days`);
});
