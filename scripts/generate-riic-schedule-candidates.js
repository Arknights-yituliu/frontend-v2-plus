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
const MINUTES_PER_DAY = 24 * 60;
const SCHEDULE_DIRECTORY_META = {
  "153 一天两换": {
    layout: "153",
    variant: "standard",
    shiftMode: "twice",
    isOrundum: false,
    facilityRequirement: null,
    facilityRequirementLabel: "",
    goldManufactureRooms: null,
  },
  "153 一天三换": {
    layout: "153",
    variant: "standard",
    shiftMode: "threeTimes",
    isOrundum: false,
    facilityRequirement: null,
    facilityRequirementLabel: "",
    goldManufactureRooms: null,
  },
  "243 一天一换": {
    layout: "243",
    variant: "standard",
    shiftMode: "once",
    isOrundum: false,
    facilityRequirement: null,
    facilityRequirementLabel: "",
    goldManufactureRooms: null,
  },
  "243 一天两换": {
    layout: "243",
    variant: "standard",
    shiftMode: "twice",
    isOrundum: false,
    facilityRequirement: null,
    facilityRequirementLabel: "",
    goldManufactureRooms: null,
  },
  "243 一天三换": {
    layout: "243",
    variant: "standard",
    shiftMode: "threeTimes",
    isOrundum: false,
    facilityRequirement: null,
    facilityRequirementLabel: "",
    goldManufactureRooms: null,
  },
  "243 简化 一天两换": {
    layout: "243",
    variant: "simplified",
    shiftMode: "twice",
    isOrundum: false,
    facilityRequirement: null,
    facilityRequirementLabel: "",
    goldManufactureRooms: null,
  },
  "243 搓玉 一天两换": {
    layout: "243",
    variant: "orundum",
    shiftMode: "twice",
    isOrundum: true,
    facilityRequirement: null,
    facilityRequirementLabel: "",
    goldManufactureRooms: null,
  },
  "右满 252（2 赤金）一天两换": {
    layout: "252",
    variant: "rightFull2Gold",
    shiftMode: "twice",
    isOrundum: false,
    facilityRequirement: "rightFull",
    facilityRequirementLabel: "右满",
    goldManufactureRooms: 2,
  },
  "右满 252（3 赤金）一天两换": {
    layout: "252",
    variant: "rightFull3Gold",
    shiftMode: "twice",
    isOrundum: false,
    facilityRequirement: "rightFull",
    facilityRequirementLabel: "右满",
    goldManufactureRooms: 3,
  },
  "满血 252（2 赤金）一天三换": {
    layout: "252",
    variant: "fullBlood2Gold",
    shiftMode: "threeTimes",
    isOrundum: false,
    facilityRequirement: "fullBlood",
    facilityRequirementLabel: "满血",
    goldManufactureRooms: 2,
  },
  "右满 342 搓玉 一天两换": {
    layout: "342",
    variant: "rightFullOrundum",
    shiftMode: "twice",
    isOrundum: true,
    facilityRequirement: "rightFull",
    facilityRequirementLabel: "右满",
    goldManufactureRooms: null,
  },
};

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

function getDronesPerDay(powerPlantCount) {
  if (!Number.isFinite(powerPlantCount)) {
    return null;
  }

  // A level-three power plant has a 5% default boost plus the 20% filler assumption.
  return Math.round((MINUTES_PER_DAY / 6) * (1 + powerPlantCount * 0.25));
}

function buildProduction(stats, powerPlantCount) {
  const statsMap = new Map(
    stats.map((stat) => [stat.itemName, normalizeStat(stat)]),
  );
  const experience = statsMap.get("EXP") || null;
  const goldValue = statsMap.get("贵金属") || null;
  const lmd = statsMap.get("龙门币") || null;
  const certificate = statsMap.get("高级凭证") || null;
  const orundum = statsMap.get("合成玉") || null;
  return {
    experience,
    goldValue,
    lmd,
    certificate,
    orundum,
    drones: getDronesPerDay(powerPlantCount),
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
  const directoryMeta = SCHEDULE_DIRECTORY_META[directoryName];

  if (!directoryMeta) {
    throw new Error(`No schedule metadata found for ${directoryName}`);
  }

  return {
    id: `${directoryName}/${fileName.replace(/\.txt$/i, "")}`,
    sourcePath: relativeSourcePath,
    sourceUpdatedAt: parseSourceDate(fileName),
    ...directoryMeta,
    powerPlantCount: Number.parseInt(directoryMeta.layout.slice(-1), 10),
    ...schedule,
    production: buildProduction(
      schedule.stats,
      Number.parseInt(directoryMeta.layout.slice(-1), 10),
    ),
    requirements: buildRequirements(schedule),
  };
}

if (!fs.existsSync(scheduleRoot)) {
  throw new Error(`Schedule source directory does not exist: ${scheduleRoot}`);
}

const candidates = fs
  .readdirSync(scheduleRoot, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isDirectory() &&
      Object.prototype.hasOwnProperty.call(SCHEDULE_DIRECTORY_META, entry.name),
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
    directories: Object.keys(SCHEDULE_DIRECTORY_META),
  },
  candidates,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(
  `Generated ${candidates.length} RIIC schedule candidates at ${outputPath}`,
);
