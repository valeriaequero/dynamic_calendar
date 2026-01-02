const express = require('express');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');

const app = express();
const PORT = 3000;

app.use('/static', express.static('public'));

app.get('/wallpaper', async (req, res) => {
  const width = parseInt(req.query.width) || 1170;
  const height = parseInt(req.query.height) || 2532;

  // Colors (hex without # in URL)
  const bgColor = '#' + (req.query.bg || '2a2a2a');
  const dotColor = '#' + (req.query.dot || '7d95b2');
  const todayColor = '#' + (req.query.today || 'd8cec6');
  const textColor = '#' + (req.query.text || 'f3ede8');

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  if (req.query.bgImage) {
    try {
      const image = await loadImage(req.query.bgImage);
      ctx.drawImage(image, 0, 0, width, height);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, width, height);
    } catch (error) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
  }

  // Date / progress
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11
  const currentDay = now.getDate();

  const startOfYear = new Date(currentYear, 0, 1);
  const endOfYear = new Date(currentYear, 11, 31);
  const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
  const totalDays = Math.floor((endOfYear - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
  const daysLeft = totalDays - dayOfYear;
  const percentage = Math.round((dayOfYear / totalDays) * 100);

  // --- Your measurements ---
  const topOfJanText = 875;          // y for top of month label
  const monthToMonthSpacing = 240;   // left edge dot -> left edge dot
  const dotDiameter = 15;            // actual dot diameter
  const dotGap = 15;                 // blank gap between dot edges
  const bottomTextDistance = 575;

  // --- Derived layout ---
  const dotRadius = dotDiameter / 2;
  const spacing = dotDiameter + dotGap;                  // 30px pitch
  const monthDotsWidth = 7 * dotDiameter + 6 * dotGap;   // 195px edge-to-edge

  const monthsPerRow = 3;
  const monthSpacingX = monthToMonthSpacing;

  // Total width of one 3-month row from left edge of Jan first dot
  // to right edge of Mar last dot:
  const rowSpan = (monthsPerRow - 1) * monthSpacingX + monthDotsWidth;

  // Center the whole 3-month row in the canvas:
  const startX = Math.round((width - rowSpan) / 2);

  // Vertical spacing
  const monthLabelGap = 30;           // top of label -> first dot row
  const verticalGap = 60;             // gap between month blocks
  const maxMonthHeight = 6 * spacing; // 6 rows max
  const rowSpacing = monthLabelGap + maxMonthHeight + verticalGap;

  const contentTop = topOfJanText;

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Text rendering: make your "topOfJanText" act like the top of the text box
  ctx.textBaseline = 'top';

  // Draw months
  for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
    const col = monthIndex % monthsPerRow;
    const row = Math.floor(monthIndex / monthsPerRow);

    // Month LEFT EDGE (not center)
    const monthLeft = startX + col * monthSpacingX;
    const monthY = contentTop + row * rowSpacing;

    // Month label aligned to monthLeft
    ctx.fillStyle = textColor;
    ctx.font = '27px "SF Pro Display"';
    ctx.textAlign = 'left';
    ctx.fillText(months[monthIndex], monthLeft, monthY);

    const firstDay = new Date(currentYear, monthIndex, 1);
    const daysInMonth = new Date(currentYear, monthIndex + 1, 0).getDate();
    const startDayOfWeek = firstDay.getDay(); // 0=Sun ... 6=Sat

    for (let day = 1; day <= daysInMonth; day++) {
      const position = startDayOfWeek + day - 1;
      const dotCol = position % 7;
      const dotRow = Math.floor(position / 7);

      // arc() uses CENTER coordinates [web:102]
      const cx = monthLeft + dotRadius + dotCol * spacing;
      const cy = monthY + monthLabelGap + dotRadius + dotRow * spacing;

      const isToday = (monthIndex === currentMonth && day === currentDay);
      const isPast = (monthIndex < currentMonth) ||
                     (monthIndex === currentMonth && day <= currentDay);

      if (isToday) {
        ctx.fillStyle = todayColor;
        ctx.globalAlpha = 1.0;
      } else if (isPast) {
        ctx.fillStyle = dotColor;
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = dotColor;
        ctx.globalAlpha = 0.3;
      }

      ctx.beginPath();
      ctx.arc(cx, cy, dotRadius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  // Bottom counter
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = todayColor;
  ctx.font = '35px "SF Pro Text"';
  ctx.textAlign = 'center';
  ctx.fillText(`${daysLeft}d left · ${percentage}%`, width / 2, height - bottomTextDistance);

  res.set('Content-Type', 'image/png');
  res.send(canvas.toBuffer('image/png'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Test: http://localhost:${PORT}/wallpaper`);
  console.log(
    `With background: http://localhost:${PORT}/wallpaper?bgImage=http://localhost:${PORT}/static/cross2.jpg&today=c9a97e&dot=8db4d0&text=e6ddc9`
  );
});
