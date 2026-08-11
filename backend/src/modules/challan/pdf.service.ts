import PDFDocument from 'pdfkit';
import prisma from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';

export async function generateChallanPdf(challanId: number): Promise<Buffer> {
  const challan = await prisma.salesChallan.findUnique({
    where: { id: challanId },
    include: {
      customer: true,
      created_by_user: true,
      items: true,
    },
  });

  if (!challan) {
    throw new NotFoundError(`Sales Challan with ID ${challanId} not found`, 'CHALLAN_NOT_FOUND');
  }

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    // Header / Branding
    doc
      .fillColor('#1890ff')
      .font('Helvetica-Bold')
      .fontSize(22)
      .text('FundsRoom Mini ERP + CRM', 50, 50)
      .fillColor('#333333')
      .font('Helvetica')
      .fontSize(10)
      .text('Delivery Challan & Tax Invoice Snapshot', 50, 75)
      .moveDown();

    // Divider line
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, 95).lineTo(550, 95).stroke();

    // Challan Metadata
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000').text(`Challan Number: ${challan.challan_number}`, 50, 110);
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text(`Status: ${challan.status}`, 50, 128);
    doc.text(`Date Created: ${new Date(challan.created_at).toLocaleDateString()}`, 50, 142);
    doc.text(`Created By: ${challan.created_by_user.email}`, 50, 156);

    // Customer Information Box
    doc
      .fillColor('#f5f5f5')
      .rect(320, 105, 230, 80)
      .fill();

    doc
      .fillColor('#333333')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`Customer Details:`, 330, 112)
      .font('Helvetica')
      .text(`Name: ${challan.customer.customer_name}`, 330, 126)
      .text(`Business: ${challan.customer.business_name}`, 330, 140)
      .text(`Phone: ${challan.customer.mobile_number}`, 330, 154)
      .text(`Address: ${challan.customer.address}`, 330, 168);

    // Table Header
    const tableTop = 205;
    doc
      .fillColor('#1890ff')
      .rect(50, tableTop, 500, 20)
      .fill();

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('#', 60, tableTop + 5)
      .text('Product (Snapshot)', 90, tableTop + 5)
      .text('SKU', 250, tableTop + 5)
      .text('Qty', 350, tableTop + 5)
      .text('Unit Price', 410, tableTop + 5)
      .text('Line Total', 480, tableTop + 5);

    let y = tableTop + 25;
    let grandTotal = 0;

    // Use IMMUTABLE SalesChallanItem snapshot fields strictly
    challan.items.forEach((item, index) => {
      const unitPrice = Number(item.snapshot_unit_price);
      const lineTotal = unitPrice * item.quantity;
      grandTotal += lineTotal;

      // Row background
      if (index % 2 === 1) {
        doc.fillColor('#fafafa').rect(50, y - 3, 500, 20).fill();
      }

      doc
        .fillColor('#333333')
        .font('Helvetica')
        .fontSize(9)
        .text((index + 1).toString(), 60, y)
        .text(item.snapshot_product_name, 90, y, { width: 150, height: 15, ellipsis: true })
        .text(item.snapshot_sku, 250, y)
        .text(item.quantity.toString(), 350, y)
        .text(`$${unitPrice.toFixed(2)}`, 410, y)
        .text(`$${lineTotal.toFixed(2)}`, 480, y);

      y += 22;
    });

    // Divider line below table
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, y).lineTo(550, y).stroke();
    y += 10;

    // Summary Totals
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(`Total Quantity: ${challan.total_quantity}`, 350, y)
      .text(`Grand Total: $${grandTotal.toFixed(2)}`, 350, y + 16);

    // Footer
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#999999')
      .text('Generated automatically by FundsRoom Mini ERP + CRM Operations Portal', 50, 720, {
        align: 'center',
        width: 500,
      });

    doc.end();
  });
}
