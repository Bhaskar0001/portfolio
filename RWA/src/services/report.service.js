const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const ExcelJS = require('exceljs');

class ReportService {
    async generateBillPDF(billData) {
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 400]);
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        page.drawText('SOCIETY OS - MAINTENANCE BILL', {
            x: 50,
            y: height - 50,
            size: 20,
            font,
            color: rgb(0.13, 0.65, 0.35),
        });

        page.drawText(`Bill No: ${billData.billNumber}`, { x: 50, y: height - 100, size: 12 });
        page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 450, y: height - 100, size: 12 });

        page.drawText(`Resident: ${billData.residentName || 'N/A'}`, { x: 50, y: height - 130, size: 12 });
        page.drawText(`Flat: ${billData.flatDetails || 'N/A'}`, { x: 50, y: height - 150, size: 12 });

        page.drawText('Description', { x: 50, y: height - 200, size: 12, font });
        page.drawText('Amount', { x: 450, y: height - 200, size: 12, font });

        page.drawText(`Maintenance (${billData.month}/${billData.year})`, { x: 50, y: height - 230, size: 12 });
        page.drawText(`₹${billData.amount}`, { x: 450, y: height - 230, size: 12 });

        if (billData.lateFee > 0) {
            page.drawText('Late Fee', { x: 50, y: height - 250, size: 12 });
            page.drawText(`₹${billData.lateFee}`, { x: 450, y: height - 250, size: 12 });
        }

        page.drawLine({
            start: { x: 50, y: height - 270 },
            end: { x: 550, y: height - 270 },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });

        page.drawText('Total Amount', { x: 50, y: height - 300, size: 14, font });
        page.drawText(`₹${billData.totalAmount}`, { x: 450, y: height - 300, size: 14, font });

        page.drawText('Please pay before the due date to avoid late fees.', {
            x: 50,
            y: 50,
            size: 10,
            color: rgb(0.5, 0.5, 0.5),
        });

        const pdfBytes = await pdfDoc.save();
        return pdfBytes;
    }

    async generateResidentExcel(residents) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Residents');

        sheet.columns = [
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Flat', key: 'flat', width: 15 },
            { header: 'Role', key: 'role', width: 15 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        residents.forEach(res => {
            sheet.addRow({
                name: res.name,
                flat: `${res.flat?.block}-${res.flat?.flatNumber}`,
                role: res.type,
                phone: res.phone,
                status: res.isActive ? 'Active' : 'Inactive'
            });
        });

        return await workbook.xlsx.writeBuffer();
    }
}

module.exports = new ReportService();
