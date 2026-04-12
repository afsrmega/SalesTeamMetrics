import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePdf = async (element, filename) => {
  const canvas = await html2canvas(element, {
    scale: 2, 
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight
  });

  const imgData = canvas.toDataURL('image/png');
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // Use a standard page format like 'a4' and calculate aspect ratio to fit
  const pdf = new jsPDF({
    orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
    unit: 'px',
    format: [imgWidth, imgHeight]
  });
  
  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  pdf.save(filename);
};