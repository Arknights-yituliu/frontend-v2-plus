import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");
const sourceRoot = path.resolve(
  process.argv[2] ||
    path.join(
      process.env.LOCALAPPDATA || "",
      "Temp",
      "riic-yituliu-codex",
    ),
);
const outputPath = path.resolve(
  process.argv[3] ||
    path.join(
      projectRoot,
      "src",
      "static",
      "json",
      "tools",
      "riic_schedule_candidates.json",
    ),
);
const scheduleRoot = path.join(sourceRoot, "src", "assets", "texts", "schedule");
const targetDirectoryPattern = /^(153|243(?: 简化)?) 一天(?:两换|三换)$/;

function parseStats(value) {
  return value
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [itemName, ...itemCountParts] = part.split(" ");
      return {
        itemName,
        itemCount: itemCountParts.join(" ").trim(),
      };
    });
}

function parseQueueDescriptions(value) {
  return value.split("|").map((part) => part.trim());
}

function parseOperator(value) {
  let token = value.trim();
  const isTired = token.endsWith("!");

  if (isTired) {
    token = token.slice(0, -1);
  }

  const eliteLevel = "012".includes(token.slice(-1))
    ? Number.parseInt(token.slice(-1), 10)
    : null;

  if (eliteLevel !== null) {
    token = token.slice(0, -1);
  }

  return {
    displayName: token,
    eliteLevel,
    isTired,
  };
}

function parseQueue(value) {
  const [operatorsPart = "", ...descriptionParts] = value.split("|");
  return {
    operators: operatorsPart
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map(parseOperator),
    description: descriptionParts.join("|").trim(),
  };
}

function parseStation(value) {
  const lines = value.trim().split(/\r?\n/);
  return {
    title: lines[0] || "",
    stationType: lines[1] || "",
    queues: lines.slice(2).map(parseQueue),
  };
}

function parseSchedule(value) {
  const [titlePart = "", descriptionPart = "", ...rest] = value
    .trim()
    .split(/^\s*-=-\s*$/m);
  const [statsLine = "", queueDescriptionLine = "", ...content] = rest
    .join("\n-=-\n")
    .trim()
    .split(/\r?\n/);
  const lines = content
    .join("\n")
    .trim()
    .split(/^\s*={3,}\s*$/m)
    .map((block) =>
      block
        .trim()
        .split(/^\s*-{3,}\s*$/m)
        .map(parseStation),
    );

  return {
    title: titlePart.trim(),
    description: descriptionPart.trim(),
    stats: parseStats(statsLine),
    queueDescriptions: parseQueueDescriptions(queueDescriptionLine),
    lines,
  };
}

function parseCount(value) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const multiplier = normalized.endsWith("k") ? 1000 : 1;
  const parsed = Number.parseFloat(normalized.replace(/k$/, ""));
  return Number.isFinite(parsed) ? parsed * multiplier : null;
}

function normalizeStat(stat) {
  const [basePart = "", dronePart] = stat.itemCount.split(/\s+\+\s+/);
  return {
    raw: stat.itemCount,
    base: parseCount(basePart),
    drone: dronePart === undefined ? null : parseCount(dronePart),
  };
}

function buildProduction(stats) {
  const statsMap = new Map(
    stats.map((stat) => [stat.itemName, normalizeStat(stat)]),
  );
  const experience = statsMap.get("EXP") || null;
  const goldValue = statsMap.get("贵金属") || null;
  const lmd = statsMap.get("龙门币") || null;
  const certificate = statsMap.get("高级凭证") || null;
  const orundum = statsMap.get("合成玉") || null;
  const drones =
    experience?.drone === null || experience?.drone === undefined
      ? null
      : Math.round(experience.drone * 0.06);

  return {
    experience,
    goldValue,
    lmd,
    certificate,
    orundum,
    drones,
    complete:
      experience?.base !== null &&
      experience?.drone !== null &&
      goldValue?.base !== null &&
      goldValue?.drone !== null &&
      lmd?.base !== null &&
      lmd?.drone !== null,
  };
}

function buildRequirements(schedule) {
  const requirementMap = new Map();

  for (const stationLine of schedule.lines) {
    for (const station of stationLine) {
      for (const queue of station.queues) {
        for (const operator of queue.operators) {
          const current = requirementMap.get(operator.displayName);
          const eliteLevel =
            operator.eliteLevel === null
              ? current?.eliteLevel ?? null
              : Math.max(operator.eliteLevel, current?.eliteLevel ?? 0);

          requirementMap.set(operator.displayName, {
            name: operator.displayName,
            eliteLevel,
            source: "room",
          });
        }
      }
    }
  }

  if (
    schedule.description.includes("菲亚梅塔") &&
    !requirementMap.has("菲亚梅塔")
  ) {
    requirementMap.set("菲亚梅塔", {
      name: "菲亚梅塔",
      eliteLevel: null,
      source: "fiammetta",
    });
  }

  return [...requirementMap.values()].sort((left, right) =>
    left.name.localeCompare(right.name, "zh-CN"),
  );
}

function parseSourceDate(fileName) {
  const match = fileName.match(
    /(\d{4}-\d{2}-\d{2})[ -](\d{2})[-:](\d{2})/,
  );

  if (!match) {
    return "";
  }

  return `${match[1]}T${match[2]}:${match[3]}:00+08:00`;
}

function getSourceCommit() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: sourceRoot,
      encoding: "utf8",
      windowsHide: true,
    }).trim();
  } catch {
    return "";
  }
}

function buildCandidate(directoryName, fileName) {
  const sourcePath = path.join(scheduleRoot, directoryName, fileName);
  const relativeSourcePath = path
    .relative(sourceRoot, sourcePath)
    .split(path.sep)
    .join("/");
  const schedule = parseSchedule(fs.readFileSync(sourcePath, "utf8"));

  return {
    id: `${directoryName}/${fileName.replace(/\.txt$/i, "")}`,
    sourcePath: relativeSourcePath,
    sourceUpdatedAt: parseSourceDate(fileName),
    layout: directoryName.startsWith("153") ? "153" : "243",
    variant: directoryName.includes("简化") ? "simplified" : "standard",
    shiftMode: directoryName.includes("一天三换") ? "threeTimes" : "twice",
    ...schedule,
    production: buildProduction(schedule.stats),
    requirements: buildRequirements(schedule),
  };
}

if (!fs.existsSync(scheduleRoot)) {
  throw new Error(`Schedule source directory does not exist: ${scheduleRoot}`);
}

const candidates = fs
  .readdirSync(scheduleRoot, { withFileTypes: true })
  .filter(
    (entry) => entry.isDirectory() && targetDirectoryPattern.test(entry.name),
  )
  .flatMap((entry) =>
    fs
      .readdirSync(path.join(scheduleRoot, entry.name))
      .filter((fileName) => fileName.endsWith(".txt"))
      .map((fileName) => buildCandidate(entry.name, fileName)),
  )
  .sort((left, right) => {
    if (left.layout !== right.layout) {
      return left.layout.localeCompare(right.layout);
    }

    if (left.shiftMode !== right.shiftMode) {
      return left.shiftMode.localeCompare(right.shiftMode);
    }

    return right.sourceUpdatedAt.localeCompare(left.sourceUpdatedAt);
  });

const payload = {
  source: {
    repository: "https://github.com/BiologyHazard/riic-yituliu",
    commit: getSourceCommit(),
    directories: [
      "153 一天两换",
      "153 一天三换",
      "243 一天两换",
      "243 一天三换",
      "243 简化 一天两换",
    ],
  },
  candidates,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(
  `Generated ${candidates.length} RIIC schedule candidates at ${outputPath}`,
);
