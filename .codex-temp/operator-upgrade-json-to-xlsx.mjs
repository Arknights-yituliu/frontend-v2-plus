import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = path.resolve("src/static/json/tools/operatorUpgradeData.json");
const desktopPath = path.join(process.env.USERPROFILE, "Desktop", "operatorUpgradeData.xlsx");
const data = JSON.parse(await fs.readFile(sourcePath, "utf8"));

const rows = [];
for (const [operatorId, operator] of Object.entries(data.operators)) {
  for (const upgrade of operator.upgrades ?? []) {
    rows.push([
      operatorId,
      operator.name ?? "",
      upgrade.elite ?? null,
      upgrade.level ?? null,
      upgrade.skillName ?? "",
      upgrade.text ?? "",
      upgrade.eff ?? "",
    ]);
  }
}

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("干员升级技能");
sheet.showGridLines = false;

const headers = ["干员 ID", "干员名称", "精英阶段", "等级", "技能名称", "技能说明", "效果变化"];
sheet.getRangeByIndexes(0, 0, 1, headers.length).values = [headers];
sheet.getRangeByIndexes(1, 0, rows.length, headers.length).values = rows;

const table = sheet.tables.add(`A1:G${rows.length + 1}`, true, "OperatorUpgradeData");
table.style = "TableStyleMedium2";
sheet.freezePanes.freezeRows(1);

sheet.getRange("A:A").format.columnWidth = 22;
sheet.getRange("B:B").format.columnWidth = 16;
sheet.getRange("C:D").format.columnWidth = 11;
sheet.getRange("E:E").format.columnWidth = 24;
sheet.getRange("F:F").format.columnWidth = 78;
sheet.getRange("G:G").format.columnWidth = 36;
sheet.getRange(`A2:G${rows.length + 1}`).format.wrapText = true;
sheet.getRange(`C2:D${rows.length + 1}`).format.horizontalAlignment = "center";
sheet.getRange(`A1:G1`).format = {
  fill: "#1F4E78",
  font: { bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
};
sheet.getRange("A1:G1").format.rowHeight = 24;

const check = await workbook.inspect({
  kind: "table",
  range: "干员升级技能!A1:G8",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 7,
});
console.log(check.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 20 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

const preview = await workbook.render({
  sheetName: "干员升级技能",
  range: "A1:G12",
  scale: 1,
  format: "png",
});
await fs.writeFile(path.resolve(".codex-temp/operator-upgrade-preview.png"), new Uint8Array(await preview.arrayBuffer()));

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(desktopPath);
console.log(`OUTPUT=${desktopPath}`);
console.log(`ROWS=${rows.length}`);
