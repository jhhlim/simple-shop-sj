import * as XLSX from "xlsx";

export async function fileToCsvText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return "";
    return XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
  }
  return file.text();
}

export const IMPORT_TEMPLATE_CSV = `Name,Description,Price,Category,Stock,SKU,Image URL
Vintage silver ring,Size 7 sterling silver ring,45.00,Jewelry,1,RING001,
Used denim jacket,Levi's medium wash jacket,25.00,Used goods,1,JKT002,
One-of-a-kind find,Unique collectible item,10.00,Other,1,MISC003,
`;
