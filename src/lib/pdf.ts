import "server-only";
import PDFDocument from "pdfkit";

export function renderPdf(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50, info: { Producer: "Working Mom" } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    build(doc);
    doc.end();
  });
}

/** Emittente dei documenti: da confermare con il modello fiscale (Allegato A, S-10). */
export const ISSUER = {
  name: "Working Mom S.r.l. Società Benefit",
  address: "Via di Donna Olimpia 16, Roma",
  vat: "P.IVA 17986961005",
};
