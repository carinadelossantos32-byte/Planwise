// Puts a picture on a single PDF page, with no extra library.
// The page is A4, landscape when the picture is wider than tall, with the picture centered and scaled to fit.

const MARGIN = 24; // points

// the bytes inside a data URL such as "data:image/jpeg;base64,...."
const dataUrlToBytes = (dataUrl) => {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

// jpeg: the bytes of a JPEG file; width / height: its size in pixels
export const jpegToPdfBlob = (jpeg, width, height) => {
  const landscape = width >= height;
  const pageW = landscape ? 841.89 : 595.28;
  const pageH = landscape ? 595.28 : 841.89;
  const scale = Math.min((pageW - MARGIN * 2) / width, (pageH - MARGIN * 2) / height);
  const drawW = width * scale;
  const drawH = height * scale;
  const x = (pageW - drawW) / 2;
  const y = (pageH - drawH) / 2;
  const n = (value) => value.toFixed(2);

  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [];
  let length = 0;
  const push = (data) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const object = (id, body) => {
    offsets[id] = length;
    push(`${id} 0 obj\n${body}\nendobj\n`);
  };

  const content = `q ${n(drawW)} 0 0 ${n(drawH)} ${n(x)} ${n(y)} cm /Im0 Do Q`;

  push('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(pageW)} ${n(pageH)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = length;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg);
  push('\nendstream\nendobj\n');
  object(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

  const xrefAt = length;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let id = 1; id <= 5; id += 1) xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  push(`${xref}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

  return new Blob(chunks, { type: 'application/pdf' });
};

// a canvas as a one-page PDF (the canvas must have an opaque background)
export const canvasToPdfBlob = (canvas, quality = 0.95) =>
  jpegToPdfBlob(dataUrlToBytes(canvas.toDataURL('image/jpeg', quality)), canvas.width, canvas.height);
