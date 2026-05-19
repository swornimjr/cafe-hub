import PDFDocument from 'pdfkit';

const COL = { product: 50, qty: 275, unit: 345, notes: 415 };
const PAGE_WIDTH = 545;

function row(doc, o, muted, urgentColor) {
  const y = doc.y;
  const isUrgent = o.urgent;

  doc.fontSize(10)
    .fillColor(isUrgent ? urgentColor : '#1a1a1a')
    .font(isUrgent ? 'Helvetica-Bold' : 'Helvetica')
    .text(`${isUrgent ? '● ' : ''}${o.item}`, COL.product, y, { width: COL.qty - COL.product - 8, lineBreak: false });

  doc.fillColor('#1a1a1a').font('Helvetica')
    .text(String(o.qty), COL.qty, y, { width: 60, align: 'center', lineBreak: false });

  doc.text(o.unit || '—', COL.unit, y, { width: 60, align: 'center', lineBreak: false });

  if (o.note) {
    doc.fontSize(9).fillColor(muted).font('Helvetica-Oblique')
      .text(o.note, COL.notes, y, { width: PAGE_WIDTH - COL.notes, lineBreak: false });
  }

  doc.moveDown(0.15);
  doc.y = doc.y + 6;

  doc.moveTo(COL.product, doc.y).lineTo(PAGE_WIDTH, doc.y)
    .strokeColor('#f0f0f0').lineWidth(0.5).stroke();
  doc.moveDown(0.35);
}

export function generateOrderPdf(orders, dateStr) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const espresso = '#4e342e';
    const muted = '#888888';
    const urgentColor = '#dc2626';

    // Header
    doc.fontSize(22).fillColor(espresso).font('Helvetica-Bold').text('Cafe Hub', 50, 50);
    doc.fontSize(11).fillColor(muted).font('Helvetica').text('Stock Order', 50, 76);
    doc.fontSize(10).fillColor(muted).text(`Generated: ${dateStr}`, 50, 76, { width: PAGE_WIDTH - 50, align: 'right' });

    const headerBottom = 100;
    doc.moveTo(50, headerBottom).lineTo(PAGE_WIDTH, headerBottom).strokeColor('#dddddd').lineWidth(1).stroke();
    doc.y = headerBottom + 16;

    const stores = ['Atrium', 'Cleanskin'];
    stores.forEach(store => {
      const storeOrders = orders.filter(o => o.store === store);
      if (!storeOrders.length) return;

      // Store heading
      doc.fontSize(12).fillColor(espresso).font('Helvetica-Bold').text(store, COL.product, doc.y);
      doc.moveDown(0.4);

      // Column headers
      const hy = doc.y;
      doc.fontSize(8.5).fillColor(muted).font('Helvetica');
      doc.text('PRODUCT', COL.product, hy, { width: COL.qty - COL.product - 8, lineBreak: false });
      doc.text('QTY',     COL.qty,     hy, { width: 60, align: 'center', lineBreak: false });
      doc.text('UNIT',    COL.unit,    hy, { width: 60, align: 'center', lineBreak: false });
      doc.text('NOTES',   COL.notes,   hy, { width: PAGE_WIDTH - COL.notes, lineBreak: false });

      doc.moveDown(0.2);
      doc.moveTo(COL.product, doc.y + 2).lineTo(PAGE_WIDTH, doc.y + 2)
        .strokeColor('#dddddd').lineWidth(0.5).stroke();
      doc.moveDown(0.5);

      storeOrders.forEach(o => row(doc, o, muted, urgentColor));

      doc.moveDown(0.8);
    });

    // Footer
    const total = orders.length;
    const urgentCount = orders.filter(o => o.urgent).length;
    doc.moveTo(50, doc.y).lineTo(PAGE_WIDTH, doc.y).strokeColor('#dddddd').lineWidth(1).stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor(muted).font('Helvetica')
      .text(`Total items: ${total}${urgentCount ? `   ·   Urgent: ${urgentCount}` : ''}`, { align: 'right' });

    doc.end();
  });
}
