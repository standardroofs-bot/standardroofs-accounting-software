import * as XLSX from "xlsx";

/**
 * Universal Excel / CSV Export Utility using xlsx
 */
export function exportToExcel(data: any[], filename: string, sheetName: string = "Sheet1") {
  if (!data || data.length === 0) {
    alert("No records to export.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths
  const colWidths = Object.keys(data[0] || {}).map((key) => {
    const maxValLength = Math.max(
      key.length,
      ...data.map((row) => (row[key] !== null && row[key] !== undefined ? String(row[key]).length : 0))
    );
    return { wch: Math.min(Math.max(maxValLength + 2, 10), 40) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}

export function exportToCSV(data: any[], filename: string) {
  if (!data || data.length === 0) {
    alert("No records to export.");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csvOutput], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSampleExcel(
  columns: { header: string; example: string | number }[],
  filename: string
) {
  const row1: Record<string, any> = {};
  columns.forEach((col) => {
    row1[col.header] = col.example;
  });

  const worksheet = XLSX.utils.json_to_sheet([row1]);
  worksheet["!cols"] = columns.map((c) => ({ wch: Math.max(c.header.length, String(c.example).length) + 4 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sample_Template");
  const cleanFilename = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename);
}

export function exportToPDF(
  title: string,
  columns: { header: string; dataKey: string }[],
  data: any[]
) {
  if (!data || data.length === 0) {
    alert("No records to export to PDF.");
    return;
  }

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups to generate PDF.");
    return;
  }

  const todayStr = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const tableHeaderHtml = columns
    .map((c) => `<th style="padding: 8px 10px; border-bottom: 2px solid #334155; text-align: left; font-size: 11px; text-transform: uppercase;">${c.header}</th>`)
    .join("");

  const tableRowsHtml = data
    .map(
      (row, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? "#ffffff" : "#f8fafc"};">
        ${columns
          .map((c) => `<td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-family: ui-sans-serif, system-ui;">${row[c.dataKey] ?? ""}</td>`)
          .join("")}
      </tr>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} - Standard Roofs Books</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
          .company { font-size: 18px; font-weight: 800; color: #1e293b; }
          .title { font-size: 14px; font-weight: 700; color: #2563eb; }
          .meta { font-size: 10px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">Standard Roofs • SR-Books</div>
            <div class="meta">GSTIN: 33AEWFS5187G1ZD • Erode Headquarters, Tamil Nadu</div>
          </div>
          <div style="text-align: right;">
            <div class="title">${title}</div>
            <div class="meta">Exported on: ${todayStr} • Total Records: ${data.length}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Standard Roofs Enterprise Accounting & ERP</span>
          <span>Official System Generated Report</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
