import ExcelJS from 'exceljs';

export const addExcelHeaderAndLogos = async (worksheet: ExcelJS.Worksheet, workbook: ExcelJS.Workbook, title: string, colCount: number) => {
  // Fetch logo images
  let logo1Id;
  const logoUrl = 'https://iili.io/KDFk4fI.png';
  const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(logoUrl)}&output=png`;

  try {
    // Try reliable image proxy first
    const res1 = await fetch(proxyUrl);
    if (!res1.ok) throw new Error(`Proxy fetch failed with status: ${res1.status}`);
    
    const blob1 = await res1.blob();
    const buffer1 = await blob1.arrayBuffer();
    
    logo1Id = workbook.addImage({
      buffer: buffer1,
      extension: 'png',
    });
  } catch (error) {
    console.error('Failed to load logo images via proxy, trying direct:', error);
    try {
      // Fallback to direct fetch (might fail due to CORS but worth a try)
      const resDirect = await fetch(logoUrl);
      if (resDirect.ok) {
        const blobDirect = await resDirect.blob();
        const bufferDirect = await blobDirect.arrayBuffer();
        logo1Id = workbook.addImage({
          buffer: bufferDirect,
          extension: 'png',
        });
      }
    } catch (directError) {
      console.error('Direct fetch also failed:', directError);
    }
  }

  // Add Image 1 to Worksheet (Top Left)
  if (logo1Id !== undefined) {
    worksheet.addImage(logo1Id, {
      tl: { col: 0, row: 0 },
      ext: { width: 80, height: 90 }
    });
    
    // Add same logo to Top Right
    worksheet.addImage(logo1Id, {
      tl: { col: colCount - 1, row: 0 },
      ext: { width: 80, height: 90 }
    });
  }

  // Header text
  const safeColCount = Math.max(1, Math.min(colCount, 26));
  const endCol = String.fromCharCode(64 + safeColCount); 
  
  worksheet.mergeCells(`B1:${endCol}1`);
  worksheet.getCell('B1').value = 'PEMERINTAH KOTA PASURUAN';
  worksheet.getCell('B1').font = { bold: true, size: 14, name: 'Times New Roman' };
  worksheet.getCell('B1').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(`B2:${endCol}2`);
  worksheet.getCell('B2').value = 'SMP NEGERI 7';
  worksheet.getCell('B2').font = { bold: true, size: 16, name: 'Times New Roman' };
  worksheet.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(`B3:${endCol}3`);
  worksheet.getCell('B3').value = 'Jalan Simpang Slamet Riadi Nomor 2, Kota Pasuruan, Jawa Timur, 67139';
  worksheet.getCell('B3').font = { size: 11, name: 'Times New Roman' };
  worksheet.getCell('B3').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(`B4:${endCol}4`);
  worksheet.getCell('B4').value = 'Telepon (0343) 426845';
  worksheet.getCell('B4').font = { size: 11, name: 'Times New Roman' };
  worksheet.getCell('B4').alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells(`B5:${endCol}5`);
  worksheet.getCell('B5').value = 'Pos-el smp7pas@yahoo.co.id , Laman www.smpn7pasuruan.sch.id';
  worksheet.getCell('B5').font = { size: 11, name: 'Times New Roman' };
  worksheet.getCell('B5').alignment = { horizontal: 'center', vertical: 'middle' };

  // Double border under header
  for (let i = 1; i <= colCount; i++) {
    const cell = worksheet.getCell(6, i);
    cell.border = {
      bottom: { style: 'double' },
      top: { style: 'thin' }
    };
  }

  // Title
  worksheet.mergeCells(`A8:${endCol}8`);
  worksheet.getCell('A8').value = title;
  worksheet.getCell('A8').font = { bold: true, size: 12, name: 'Times New Roman' };
  worksheet.getCell('A8').alignment = { horizontal: 'center', vertical: 'middle' };

  // Adjust row heights for header
  for (let i = 1; i <= 5; i++) {
    worksheet.getRow(i).height = 20;
  }
}

export const applyColorfulTableStyle = (worksheet: ExcelJS.Worksheet, headerRowIndex: number, dataRowCount: number, colCount: number) => {
  // Header styling
  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' } // Indigo 600
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true
    };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  // Row styling (Warna warni / Zebra Striping with soft colors)
  const colors = ['FFF3F4F6', 'FFE0E7FF', 'FFFEF3C7', 'FFD1FAE5', 'FFFCE7F3', 'FFDBEAFE', 'FFFEF08A']; 
  
  for (let i = 1; i <= dataRowCount; i++) {
    const row = worksheet.getRow(headerRowIndex + i);
    const bgColor = colors[(i - 1) % colors.length];
    
    for (let j = 1; j <= colCount; j++) {
      const cell = row.getCell(j);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: bgColor }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    }
  }
}
