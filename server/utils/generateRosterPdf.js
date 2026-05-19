import PDFDocument from 'pdfkit';

const DAYS     = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const DAY_ABBR = { Mon:'MON', Tue:'TUE', Wed:'WED', Thu:'THU', Fri:'FRI', Sat:'SAT', Sun:'SUN' };

const C = {
  nameBg:      '#1E293B',
  nameText:    '#FFFFFF',
  dayHdrBg:    '#F8FAFC',
  dayHdrTxt:   '#1E293B',
  border:      '#CBD5E1',
  openBg:      '#DBEAFE',
  openTxt:     '#1E40AF',
  openHdr:     '#2563EB',
  openOffTxt:  '#93C5FD',
  closeBg:     '#DCFCE7',
  closeTxt:    '#166534',
  closeHdr:    '#16A34A',
  closeOffTxt: '#86EFAC',
  offBg:       '#1E293B',
  title:       '#0F172A',
  sub:         '#64748B',
};

function weekDates(weekOf) {
  const [y, mo, day] = weekOf.split('-').map(Number);
  return DAYS.map((_, i) => new Date(y, mo - 1, day + i).getDate());
}

function parseStartHour(timeStr) {
  try {
    const startPart = timeStr.split('–')[0];
    const pm = /pm/i.test(startPart);
    const stripped = startPart.replace(/[apm\s]/gi, '').trim();
    let h;
    if (stripped.includes(':')) {
      const [hh, mm] = stripped.split(':');
      h = parseInt(hh) + parseInt(mm) / 60;
    } else {
      h = parseFloat(stripped);
    }
    if (pm && h < 12) h += 12;
    if (!pm && h === 12) h = 0;
    return h;
  } catch { return 9; }
}

export function generateRosterPdf(store, weekRange, weekOf, shifts, openingStaff = [], closingStaff = []) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    /* ── Debug: log whenever PDFKit adds a page ── */
    const _origAddPage = doc.addPage.bind(doc);
    doc.addPage = function (...args) {
      console.error('[PDF] addPage triggered — doc.y =', doc.y, '| page.maxY =', doc.page.maxY());
      console.error(new Error().stack.split('\n').slice(1, 5).join('\n'));
      return _origAddPage(...args);
    };

    const PAGE_H = 595;
    const LEFT   = 30;
    const W      = 841 - 60;   // 781
    const NAME_W = 95;
    const DAY_W  = (W - NAME_W) / 7;  // ≈ 98
    const ROW_H  = 18;
    const HDR_H  = 18;

    const dates = weekDates(weekOf);
    let y = 30;

    /* ── Draw text centred in a cell — no width/align to avoid layout engine ── */
    function cText(str, cellX, cellW, cellY, cellH, fSize, color, bold = true) {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fSize);
      const tw = doc.widthOfString(str);
      const tx = cellX + (cellW - tw) / 2;
      const ty = cellY + (cellH - fSize) / 2 - 1;
      doc.fillColor(color).text(str, tx, ty, { lineBreak: false });
      // Hard-reset cursor so accumulated drift never crosses page boundary
      doc.x = LEFT;
      doc.y = y;
    }

    // ── Title ──────────────────────────────────────────────────────────────────
    doc.font('Helvetica-Bold').fontSize(14);
    const titleStr = `${store.toUpperCase()} WEEKLY ROSTER`;
    const titleW = doc.widthOfString(titleStr);
    doc.fillColor(C.title).text(titleStr, LEFT + (W - titleW) / 2, y, { lineBreak: false });
    doc.x = LEFT; doc.y = y;
    y += 18;

    doc.font('Helvetica').fontSize(9);
    const subW = doc.widthOfString(weekRange);
    doc.fillColor(C.sub).text(weekRange, LEFT + (W - subW) / 2, y, { lineBreak: false });
    doc.x = LEFT; doc.y = y;
    y += 14;

    doc.moveTo(LEFT, y).lineTo(LEFT + W, y).strokeColor('#E2E8F0').lineWidth(1).stroke();
    y += 10;

    // ── Section heading ────────────────────────────────────────────────────────
    function drawSectionHeader(label, colour) {
      y += 8;
      doc.rect(LEFT, y, 4, 14).fill(colour);
      doc.x = LEFT; doc.y = y;

      doc.font('Helvetica-Bold').fontSize(8);
      doc.fillColor(colour).text(label, LEFT + 10, y + 3, { lineBreak: false });
      doc.x = LEFT; doc.y = y;
      y += 20;
    }

    // ── Day header row ─────────────────────────────────────────────────────────
    function drawDayHeaders() {
      doc.rect(LEFT, y, NAME_W, HDR_H).fillAndStroke(C.nameBg, C.border);
      doc.x = LEFT; doc.y = y;

      DAYS.forEach((d, i) => {
        const x = LEFT + NAME_W + i * DAY_W;
        doc.rect(x, y, DAY_W, HDR_H).fillAndStroke(C.dayHdrBg, C.border);
        doc.x = LEFT; doc.y = y;
        // "MON 12" on one line
        cText(`${DAY_ABBR[d]} ${dates[i]}`, x, DAY_W, y, HDR_H, 7, C.dayHdrTxt);
      });
      y += HDR_H;
      doc.x = LEFT; doc.y = y;
    }

    // ── Staff row ──────────────────────────────────────────────────────────────
    function drawStaffRow(staffName, section) {
      const shiftBg  = section === 'opening' ? C.openBg   : C.closeBg;
      const shiftTxt = section === 'opening' ? C.openTxt  : C.closeTxt;
      const offTxt   = section === 'opening' ? C.openOffTxt : C.closeOffTxt;

      doc.rect(LEFT, y, NAME_W, ROW_H).fillAndStroke(C.nameBg, C.border);
      doc.x = LEFT; doc.y = y;
      cText(staffName.toUpperCase(), LEFT, NAME_W, y, ROW_H, 6.5, C.nameText);

      DAYS.forEach((d, i) => {
        const x = LEFT + NAME_W + i * DAY_W;
        // Only show shifts that belong to this section's time range
        const dayShifts = shifts.filter(s => {
          if (s.name !== staffName || s.day !== d) return false;
          const h = parseStartHour(s.time);
          return section === 'opening' ? h < 12 : h >= 12;
        });
        if (dayShifts.length) {
          doc.rect(x, y, DAY_W, ROW_H).fillAndStroke(shiftBg, C.border);
          doc.x = LEFT; doc.y = y;
          cText(dayShifts.map(s => s.time).join('/'), x, DAY_W, y, ROW_H, 6.5, shiftTxt);
        } else {
          doc.rect(x, y, DAY_W, ROW_H).fillAndStroke(C.offBg, C.border);
          doc.x = LEFT; doc.y = y;
          cText('OFF', x, DAY_W, y, ROW_H, 6, offTxt);
        }
      });

      y += ROW_H;
      doc.x = LEFT; doc.y = y;
    }

    // ── Render ─────────────────────────────────────────────────────────────────
    if (openingStaff.length) {
      drawSectionHeader('OPENING SHIFT', C.openHdr);
      drawDayHeaders();
      openingStaff.forEach(name => drawStaffRow(name, 'opening'));
    }
    if (closingStaff.length) {
      drawSectionHeader('CLOSING SHIFT', C.closeHdr);
      drawDayHeaders();
      closingStaff.forEach(name => drawStaffRow(name, 'closing'));
    }

    // ── Footer ─────────────────────────────────────────────────────────────────
    const footerY = PAGE_H - 50;  // 545 — well within the 565 bottom boundary
    doc.moveTo(LEFT, footerY - 6).lineTo(LEFT + W, footerY - 6)
      .strokeColor('#E2E8F0').lineWidth(0.5).stroke();
    doc.x = LEFT; doc.y = footerY;

    const publishDate = new Date().toLocaleDateString('en-AU',
      { day: 'numeric', month: 'long', year: 'numeric' });

    doc.font('Helvetica').fontSize(7);
    doc.fillColor(C.sub).text(`Published: ${publishDate}`, LEFT, footerY, { lineBreak: false });
    doc.x = LEFT; doc.y = footerY;

    doc.font('Helvetica').fontSize(7);
    const brandStr = 'Cafe Hub — Atrium & Cleanskin';
    doc.fillColor(C.sub).text(brandStr, LEFT + W - doc.widthOfString(brandStr), footerY, { lineBreak: false });
    doc.x = LEFT; doc.y = footerY;

    doc.end();
  });
}
