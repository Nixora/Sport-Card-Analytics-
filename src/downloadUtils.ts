import { TransformedCard } from "./types";
import * as xlsx from "xlsx";

export const handleDownload = (format: string, groupedCards: any[]) => {
  if (format === "json") {
    const jsonData = JSON.stringify(groupedCards);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "groupedCards.json";
    a.click();
    URL.revokeObjectURL(url);
  } else if (format === "csv") {
    const csvData = groupedCards.map((group: TransformedCard) => ({
      "Card Name": group.cardName,
      "Average Price": group.averagePrice.toFixed(2),
      "Lower Bound": group.lowerBound.toFixed(2),
      "Upper Bound": group.upperBound.toFixed(2),
      "Standard Deviation": group.standardDeviation.toFixed(2),
      "Peak Price": group.peakPrice.toFixed(2),
      "Peak Day": group.peakDay,
    }));
    const headers = Object.keys(csvData[0]);
    const csvRows = [headers, ...csvData].map((row) =>
      headers.map((fieldName) => row[fieldName])
    );
    const csvContent = csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "groupedCards.csv";
    a.click();
    URL.revokeObjectURL(url);
  } else if (format === "xlsx") {
    const workbook = xlsx.utils.book_new();
    const sheetData = groupedCards.map((group: TransformedCard) => ({
      "Card Name": group.cardName,
      "Average Price": group.averagePrice.toFixed(2),
      "Lower Bound": group.lowerBound.toFixed(2),
      "Upper Bound": group.upperBound.toFixed(2),
      "Standard Deviation": group.standardDeviation.toFixed(2),
      "Peak Price": group.peakPrice.toFixed(2),
      "Peak Day": group.peakDay,
    }));
    const worksheet = xlsx.utils.json_to_sheet(sheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, "groupedCards");
    const xlsxBuffer = xlsx.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });
    const blob = new Blob([xlsxBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "groupedCards.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }
};
