/**
 * Minimal PDF Generator utility to create valid PDF files on-the-fly for statutory documents.
 */

function generateSamplePdfBuffer({ title, document_code, document_type, project_name, parcel_code, survey_number, village, description, uploaded_by }) {
  const contentText = `
%PDF-1.4
1 0 obj
<<
  /Type /Catalog
  /Pages 2 0 R
>>
endobj
2 0 obj
<<
  /Type /Pages
  /Kids [3 0 R]
  /Count 1
>>
endobj
3 0 obj
<<
  /Type /Page
  /Parent 2 0 R
  /Resources <<
    /Font <<
      /F1 4 0 R
    >>
  >>
  /MediaBox [0 0 612 792]
  /Contents 5 0 R
>>
endobj
4 0 obj
<<
  /Type /Font
  /Subtype /Type1
  /BaseFont /Helvetica
>>
endobj
5 0 obj
<< /Length 1200 >>
stream
BT
/F1 18 Tf
50 740 Td
(GOVERNMENT OF INDIA - BHOOMISETU PORTAL) Tj
/F1 12 Tf
0 -25 Td
(STATUTORY LAND ACQUISITION & REHABILITATION RECORD) Tj
0 -15 Td
(================================================================) Tj
/F1 14 Tf
0 -30 Td
(Document Code: ${document_code || 'DOC-2026-001'}) Tj
0 -20 Td
(Title: ${escapePdfString(title || 'Statutory Notice')}) Tj
/F1 11 Tf
0 -25 Td
(Category: ${document_type || 'STATUTORY_RECORD'}) Tj
0 -18 Td
(Project: ${escapePdfString(project_name || 'National Infrastructure Project')}) Tj
0 -18 Td
(Parcel: ${parcel_code || 'N/A'} - Survey No: ${survey_number || 'N/A'}, Village: ${escapePdfString(village || 'N/A')}) Tj
0 -25 Td
(----------------------------------------------------------------) Tj
0 -20 Td
(STATUTORY NOTICE / SUMMARY:) Tj
0 -18 Td
(${escapePdfString(description || 'Official statutory document recorded under RFCTLARR Act 2013.')}) Tj
0 -40 Td
(----------------------------------------------------------------) Tj
0 -20 Td
(Issued By: District Land Acquisition Officer (DLAO)) Tj
0 -18 Td
(Verification Officer: ${escapePdfString(uploaded_by || 'Rajesh Sharma, DLAO')}) Tj
0 -18 Td
(Digital Seal: BHOOMISETU-SSL-VERIFIED-256BIT) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000335 00000 n 
trailer
<<
  /Size 6
  /Root 1 0 R
>>
startxref
1600
%%EOF
`;

  return Buffer.from(contentText, 'utf-8');
}

function escapePdfString(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[\r\n]+/g, ' ');
}

module.exports = { generateSamplePdfBuffer };
