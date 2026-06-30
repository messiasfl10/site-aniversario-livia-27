(function () {
  function normalizeValue(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (Array.isArray(value)) {
      return value.join("; ");
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  }

  function escapeCSVValue(value) {
    const normalizedValue = normalizeValue(value);

    if (/[",\r\n;]/.test(normalizedValue)) {
      return `"${normalizedValue.replace(/"/g, '""')}"`;
    }

    return normalizedValue;
  }

  function buildCSV(columns, rows) {
    const header = columns.map((column) => escapeCSVValue(column.label)).join(";");
    const body = rows.map((row) =>
      columns
        .map((column) => {
          const value =
            typeof column.value === "function"
              ? column.value(row)
              : row[column.value];

          return escapeCSVValue(value);
        })
        .join(";"),
    );

    return [header, ...body].join("\r\n");
  }

  function buildRows(columns, rows) {
    return [
      columns.map((column) => column.label),
      ...rows.map((row) =>
        columns.map((column) =>
          typeof column.value === "function"
            ? column.value(row)
            : row[column.value],
        ),
      ),
    ];
  }

  function getTimestamp() {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");

    return [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate()),
      pad(now.getHours()),
      pad(now.getMinutes()),
    ].join("");
  }

  function downloadCSV(filename, columns, rows) {
    downloadCSVRows(filename, buildRows(columns, rows));
  }

  function downloadCSVRows(filename, rows) {
    const csv = `\ufeff${rows.map((row) => row.map(escapeCSVValue).join(";")).join("\r\n")}`;
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${filename}-${getTimestamp()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getCellStyle(type) {
    const border = {
      bottom: { style: "thin", color: { rgb: "D9E2EC" } },
      left: { style: "thin", color: { rgb: "D9E2EC" } },
      right: { style: "thin", color: { rgb: "D9E2EC" } },
      top: { style: "thin", color: { rgb: "D9E2EC" } },
    };

    if (type === "header") {
      return {
        alignment: { horizontal: "center", vertical: "center", wrapText: true },
        border,
        fill: { fgColor: { rgb: "8E7AB5" } },
        font: { bold: true, color: { rgb: "FFFFFF" } },
      };
    }

    if (type === "total") {
      return {
        alignment: { vertical: "center", wrapText: true },
        border,
        fill: { fgColor: { rgb: "F3EFFA" } },
        font: { bold: true },
      };
    }

    return {
      alignment: { vertical: "center", wrapText: true },
      border,
    };
  }

  function getColumnWidths(rows) {
    return (rows[0] || []).map((_, columnIndex) => {
      const maxLength = rows.reduce((max, row) => {
        const value = normalizeValue(row[columnIndex]);
        return Math.max(max, value.length);
      }, 0);

      return { wch: Math.min(Math.max(maxLength + 2, 12), 38) };
    });
  }

  function styleWorksheet(worksheet, rows, xlsx) {
    const range = xlsx.utils.decode_range(worksheet["!ref"]);
    const headerStyle = getCellStyle("header");
    const bodyStyle = getCellStyle("body");
    const totalStyle = getCellStyle("total");

    for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
      const rowValues = rows[rowIndex] || [];
      const isTotalRow = rowValues.some(
        (value) => normalizeValue(value) === "Total esperado geral",
      );

      for (
        let columnIndex = range.s.c;
        columnIndex <= range.e.c;
        columnIndex += 1
      ) {
        const cellAddress = xlsx.utils.encode_cell({
          c: columnIndex,
          r: rowIndex,
        });

        if (!worksheet[cellAddress]) {
          worksheet[cellAddress] = { t: "s", v: "" };
        }

        worksheet[cellAddress].s =
          rowIndex === 0 ? headerStyle : isTotalRow ? totalStyle : bodyStyle;
      }
    }

    worksheet["!autofilter"] = { ref: xlsx.utils.encode_range(range) };
    worksheet["!cols"] = getColumnWidths(rows);
  }

  function downloadXLSX(filename, sheetName, rows, merges = []) {
    if (!window.XLSX) {
      return false;
    }

    const xlsx = window.XLSX;
    const worksheet = xlsx.utils.aoa_to_sheet(rows);
    const workbook = xlsx.utils.book_new();

    styleWorksheet(worksheet, rows, xlsx);

    if (merges.length) {
      worksheet["!merges"] = merges;
    }

    xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    xlsx.writeFile(workbook, `${filename}-${getTimestamp()}.xlsx`);

    return true;
  }

  window.AdminExport = {
    buildRows,
    downloadCSV,
    downloadCSVRows,
    downloadXLSX,
  };
})();
