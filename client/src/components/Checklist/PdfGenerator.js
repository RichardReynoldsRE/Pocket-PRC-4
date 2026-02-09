import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Corrects image orientation by drawing through a canvas.
 */
async function correctImageOrientation(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.src = dataUrl;
  });
}

/**
 * Generates a filled PRC PDF from form data.
 * Returns { blob, filename }.
 */
export async function generatePRC(formData) {
  const response = await fetch('/KW_Maine_Public_Records_Checklist.pdf');
  const pdfBytes = await response.arrayBuffer();
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Helpers
  const setValue = (fieldName, value) => {
    try {
      const field = form.getTextField(fieldName);
      if (value) field.setText(String(value));
    } catch (e) {
      console.warn(`Field not found: ${fieldName}`);
    }
  };

  const setCheckbox = (fieldName, isChecked) => {
    try {
      const field = form.getCheckBox(fieldName);
      isChecked ? field.check() : field.uncheck();
    } catch (e) {
      console.warn(`Checkbox not found: ${fieldName}`);
    }
  };

  // Fill form fields - exact same field names as v3
  setValue('Property Address', formData.propertyAddress);

  setCheckbox('Homestead', formData.homesteadExemption);
  setCheckbox('Veterans', formData.veteransExemption);
  setCheckbox('Tree Growth', formData.treeGrowthExemption);
  setCheckbox('NA', formData.noExemptions);

  setValue('Homestead $', formData.homesteadAmount);
  setValue('Veterans $', formData.veteransAmount);
  setValue('Tree Growth $', formData.treeGrowthAmount);

  setCheckbox('undefined', formData.propertyDataCard);
  setCheckbox('undefined_2', formData.taxMap);

  // Date formatting
  const dateValue = formData.dateVisited;
  const formattedDate = dateValue
    ? new Date(dateValue + 'T00:00:00').toLocaleDateString('en-US')
    : '';
  setValue('DATE VISITED', formattedDate);

  setValue('Current Zone', formData.currentZoning);
  setValue('Overlay?', formData.zoningOverlay);

  if (formData.floodZone) {
    try {
      form.getRadioGroup('Flood Zone').select(formData.floodZone);
    } catch (e) {
      console.warn('Flood Zone radio error');
    }
  }

  setValue(
    '2 Does current use appear to conform to zoning restrictions',
    formData.conformsToZoning
  );
  setValue(
    '3 Number of legal dwelling units permitted per ordinance',
    formData.dwellingUnits
  );

  setCheckbox('undefined_3', formData.septicInShoreland === 'Yes');
  setCheckbox('undefined_4', formData.septicInShoreland === 'No');
  setCheckbox('undefined_5', formData.septicInShoreland === 'N/A');

  setValue(
    '5 Record dates  descriptions of permits issued or code enforcement issues if any DO NOT LEAVE BLANK',
    formData.permitsDescription
  );

  setCheckbox('toggle_12', formData.codeEnforcementDocs);
  setCheckbox('undefined_6', formData.zoneOverlays);
  setCheckbox('undefined_7', formData.recordedSurvey);
  setCheckbox('undefined_8', formData.easements);
  setCheckbox('undefined_9', formData.associationDocs);
  setCheckbox('undefined_10', formData.associationFinancials);
  setCheckbox('undefined_11', formData.condoCertificate);
  setCheckbox('undefined_12', formData.septicDesign);

  setValue('4 COMPLETED BY', formData.completedBy);

  // Embed attachments as pages
  for (let i = 0; i < formData.attachments.length; i++) {
    const attachment = formData.attachments[i];
    try {
      if (attachment.type.startsWith('image/')) {
        const correctedDataUrl = await correctImageOrientation(attachment.data);
        const base64Data = correctedDataUrl.split(',')[1];
        const fileBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        const image = await pdfDoc.embedJpg(fileBytes);
        const page = pdfDoc.addPage();
        const pageWidth = page.getWidth();
        const pageHeight = page.getHeight();
        const margin = 50;

        // Title
        page.drawText(`Attachment ${i + 1}: ${attachment.name}`, {
          x: margin,
          y: pageHeight - margin,
          size: 10,
          font: helveticaBold,
          color: rgb(0, 0, 0),
        });

        // Calculate dimensions to fit
        const availableHeight = pageHeight - 2 * margin - 30;
        const availableWidth = pageWidth - 2 * margin;
        const imageAspect = image.width / image.height;
        const pageAspect = availableWidth / availableHeight;

        let drawWidth, drawHeight;
        if (imageAspect > pageAspect) {
          drawWidth = availableWidth;
          drawHeight = drawWidth / imageAspect;
        } else {
          drawHeight = availableHeight;
          drawWidth = drawHeight * imageAspect;
        }

        const x = (pageWidth - drawWidth) / 2;
        const y = (pageHeight - drawHeight) / 2 - 15;

        page.drawImage(image, { x, y, width: drawWidth, height: drawHeight });
      } else if (attachment.type === 'application/pdf') {
        const base64Data = attachment.data.split(',')[1];
        const fileBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        const attachedPdf = await PDFDocument.load(fileBytes);
        const copiedPages = await pdfDoc.copyPages(
          attachedPdf,
          attachedPdf.getPageIndices()
        );
        copiedPages.forEach((page) => pdfDoc.addPage(page));
      }
    } catch (e) {
      console.error('Error processing attachment:', attachment.name, e);
    }
  }

  const pdfBytesOutput = await pdfDoc.save();
  const blob = new Blob([pdfBytesOutput], { type: 'application/pdf' });

  const propertyAddr = formData.propertyAddress || 'Property';
  const cleanAddr = propertyAddr.replace(/[^a-zA-Z0-9]/g, '_');
  const date = new Date().toISOString().split('T')[0];
  const filename = `PRC_${cleanAddr}_${date}.pdf`;

  return { blob, filename };
}
