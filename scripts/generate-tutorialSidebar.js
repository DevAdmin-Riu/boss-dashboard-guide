#!/usr/bin/env node
/**
 * routes.json -> tutorialSidebar items 배열(JSON) 생성
 *
 * 출력: generated/generated-tutorialSidebar.json
 * - 이 파일 내용(JSON 배열)을 복사해서 sidebars.ts의 tutorialSidebar에 붙여넣으면 됨.
 */

const fs = require("node:fs");
const path = require("node:path");

const ROUTES_JSON = path.resolve(process.cwd(), "generated/routes.json");
const OUTPUT_JSON = path.resolve(
  process.cwd(),
  "generated/tutorialSidebar.json"
);

function stripSlashes(p) {
  return String(p || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function docIdFromPath(routePath) {
  // doc/<path>/index.md -> id: "<path>/index"
  const clean = stripSlashes(routePath);
  return clean ? `${clean}/index` : "index";
}

function lastSegment(routePath) {
  const segs = String(routePath || "")
    .split("/")
    .filter(Boolean);
  return segs[segs.length - 1] || "";
}

function baseLabel(route) {
  const ml = Array.isArray(route.menuLabel) ? route.menuLabel : [];
  return ml.length ? ml[ml.length - 1] : String(route.path || "");
}

function groupKey(route) {
  const ml = Array.isArray(route.menuLabel) ? route.menuLabel : [];
  return ml[0] || "기타";
}

function buildTutorialSidebarItems(routes) {
  // 원래 배열 순서를 기억
  const originalIndex = new Map();
  routes.forEach((r, i) => originalIndex.set(r.path, i));

  // 1) group by menuLabel[0]
  const groups = new Map();
  for (const r of routes) {
    const key = groupKey(r);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  // 2) sort categories by min sidebarOrder (같으면 routes에 먼저 나온 그룹 우선)
  const categories = [...groups.entries()]
    .map(([label, items]) => ({
      label,
      order: Math.min(...items.map((x) => Number(x.sidebarOrder ?? 9999))),
      firstIdx: Math.min(
        ...items.map((x) => originalIndex.get(x.path) ?? 999999)
      ),
      items,
    }))
    .sort((a, b) => a.order - b.order || a.firstIdx - b.firstIdx);

  const tutorialSidebarItems = categories.map((cat) => {
    const docs = [...cat.items].sort(
      (a, b) =>
        (originalIndex.get(a.path) ?? 999999) -
        (originalIndex.get(b.path) ?? 999999)
    );

    // label duplicates -> append last path segment
    const counts = new Map();
    for (const d of docs) {
      const l = baseLabel(d);
      counts.set(l, (counts.get(l) || 0) + 1);
    }

    const items = docs.map((d) => {
      const base = baseLabel(d);
      const dup = (counts.get(base) || 0) > 1;
      const label = dup ? `${base} (${lastSegment(d.path)})` : base;

      return { type: "doc", id: docIdFromPath(d.path), label };
    });

    return { type: "category", label: cat.label, items };
  });

  return ["intro", ...tutorialSidebarItems];
}

function main() {
  if (!fs.existsSync(ROUTES_JSON)) {
    console.error(`routes.json not found: ${ROUTES_JSON}`);
    process.exit(1);
  }

  const routes = JSON.parse(fs.readFileSync(ROUTES_JSON, "utf-8"));
  if (!Array.isArray(routes)) {
    console.error("routes.json must be an array");
    process.exit(1);
  }

  // minimal validation
  const invalid = routes.filter((r) => !r || typeof r.path !== "string");
  if (invalid.length) {
    console.error(`Invalid items (missing 'path'): ${invalid.length}`);
    process.exit(1);
  }

  const items = buildTutorialSidebarItems(routes);

  // JSON 배열만 출력 (붙여넣기 용)
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(items, null, 2) + "\n", "utf-8");
  console.log(`✅ generated: ${OUTPUT_JSON}`);
  console.log("Copy this JSON array into sidebars.ts -> tutorialSidebar");
}

main();
