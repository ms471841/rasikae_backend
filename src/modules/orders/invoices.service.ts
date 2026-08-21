import { Injectable } from '@nestjs/common';
const PDFDocument = require('pdfkit');
import { Order } from './schemas/order.schema';

@Injectable()
export class InvoicesService {
  async generateInvoicePdf(order: Order): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      // 1. Header & Branding
      doc.fillColor('#444444').fontSize(20).text('RASIKAE', 50, 50);
      doc.fontSize(10).text('Premium Food Delivery Platform', 50, 75);

      doc
        .fillColor('#000000')
        .fontSize(20)
        .text('INVOICE', 0, 50, { align: 'right' });
      doc
        .fontSize(10)
        .text(
          `Order ID: #${(order as any)._id.toString().slice(-6).toUpperCase()}`,
          0,
          75,
          { align: 'right' },
        );
      doc.text(`Date: ${order.createdAt.toLocaleDateString()}`, 0, 90, {
        align: 'right',
      });

      doc.moveTo(50, 110).lineTo(550, 110).stroke();

      // 2. Billing Details
      doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 50, 130);
      doc
        .font('Helvetica')
        .fontSize(10)
        .text((order.userId as any)?.name || 'Valued Customer', 50, 145);
      const addr = order.deliveryAddress;
      doc.text(`${addr?.street || ''}, ${addr?.city || ''}`, 50, 160, {
        width: 200,
      });

      doc.fontSize(12).font('Helvetica-Bold').text('Restaurant:', 350, 130);
      doc
        .font('Helvetica')
        .fontSize(10)
        .text(
          (order.restaurantId as any)?.name || 'Partner Restaurant',
          350,
          145,
        );
      doc.text((order.restaurantId as any)?.address || '', 350, 160, {
        width: 200,
      });

      doc.moveTo(50, 210).lineTo(550, 210).stroke();

      // 3. Table Header
      let y = 230;
      doc.font('Helvetica-Bold').text('Item Description', 50, y);
      doc.text('Qty', 300, y);
      doc.text('Price', 400, y);
      doc.text('Total', 500, y);

      doc
        .moveTo(50, y + 15)
        .lineTo(550, y + 15)
        .stroke();
      y += 30;

      // 4. Items
      doc.font('Helvetica');
      order.items.forEach((item) => {
        doc.text(item.name, 50, y);
        doc.text(item.quantity.toString(), 300, y);
        doc.text(`₹${(item.price / 100).toFixed(2)}`, 400, y);
        doc.text(`₹${((item.price * item.quantity) / 100).toFixed(2)}`, 500, y);
        y += 20;
      });

      doc
        .moveTo(50, y + 10)
        .lineTo(550, y + 10)
        .stroke();
      y += 30;

      // 5. Totals
      const rightColX = 400;
      const valColX = 500;

      doc.text('Subtotal:', rightColX, y);
      doc.text(`₹${((order as any).subTotal / 100).toFixed(2)}`, valColX, y);
      y += 20;

      doc.text('CGST (5%):', rightColX, y);
      doc.text(`₹${((order as any).cgst / 100).toFixed(2)}`, valColX, y);
      y += 20;

      doc.text('SGST (5%):', rightColX, y);
      doc.text(`₹${((order as any).sgst / 100).toFixed(2)}`, valColX, y);
      y += 20;

      doc.text('Delivery Fee:', rightColX, y);
      doc.text(`₹${((order as any).deliveryFee / 100).toFixed(2)}`, valColX, y);
      y += 25;

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Grand Total:', rightColX, y);
      doc.text(`₹${(order.totalAmount / 100).toFixed(2)}`, valColX, y);

      // 6. Footer
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#888888')
        .text(
          'This is a computer-generated invoice and does not require a physical signature.',
          50,
          700,
          { align: 'center', width: 500 },
        );

      doc.end();
    });
  }
}
