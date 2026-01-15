#!/usr/bin/env node
/**
 * routes.json -> tutorialSidebar items 배열(JSON) 생성
 *
 * 출력: generated/tutorialSidebar.json
 * - 이 파일 내용(JSON 배열)을 복사해서 sidebars.ts의 tutorialSidebar에 붙여넣으면 됨.
 *
 * 지원:
 * - menuLabel 길이 1:  [Group] -> doc(label=menuLabel[0])
 * - menuLabel 길이 2:  [Group(menuLabel[0])] -> doc(label=menuLabel[1])
 * - menuLabel 길이 3+: [Group(menuLabel[0])] -> [Sub(menuLabel[1])] -> doc(label=마지막 요소)
 *
 * 정렬:
 * - 그룹/서브/문서 모두 routes.json 원본 순서 유지
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
  const clean = stripSlashes(routePath);
  return clean ? `${clean}/index` : "index";
}

function lastSegment(routePath) {
  const segs = String(routePath || "")
    .split("/")
    .filter(Boolean);
  return segs[segs.length - 1] || "";
}

function menu(route) {
  return Array.isArray(route.menuLabel) ? route.menuLabel.filter(Boolean) : [];
}

function groupKey(route) {
  return menu(route)[0] || "기타";
}

function subKey(route) {
  // menuLabel[1]이 있으면 서브 카테고리 키로 사용
  return menu(route)[1] || null;
}

function baseLabel(route) {
  const ml = menu(route);
  return ml.length ? ml[ml.length - 1] : String(route.path || "");
}

function buildTutorialSidebarItems(routes) {
  // 원본 순서 기억
  const originalIndex = new Map();
  routes.forEach((r, i) => originalIndex.set(r.path, i));

  // 1) group by menuLabel[0]
  const groups = new Map();
  for (const r of routes) {
    const key = groupKey(r);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  // 2) sort categories by min sidebarOrder, then by first appearance
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
    // 그룹 내 라우트도 원본 순서 유지
    const routesInGroup = [...cat.items].sort(
      (a, b) =>
        (originalIndex.get(a.path) ?? 999999) -
        (originalIndex.get(b.path) ?? 999999)
    );

    // 3) (옵션) subgroup by menuLabel[1] if exists (menuLabel 길이 3+에서 의미 있음)
    const subGroups = new Map(); // key: subLabel|null -> routes[]
    for (const r of routesInGroup) {
      const ml = menu(r);
      const key = ml.length >= 3 ? subKey(r) : null; // 길이 3+만 서브 카테고리로 묶음
      if (!subGroups.has(key)) subGroups.set(key, []);
      subGroups.get(key).push(r);
    }

    // 서브그룹 순서도 "처음 등장 순서"로 유지
    const subEntries = [...subGroups.entries()].sort((a, b) => {
      const aFirst = Math.min(
        ...a[1].map((x) => originalIndex.get(x.path) ?? 999999)
      );
      const bFirst = Math.min(
        ...b[1].map((x) => originalIndex.get(x.path) ?? 999999)
      );
      return aFirst - bFirst;
    });

    // 그룹 전체에서 label duplicate 계산(서브그룹이 달라도 같은 마지막 라벨이면 중복 처리)
    const counts = new Map();
    for (const r of routesInGroup) {
      const l = baseLabel(r);
      counts.set(l, (counts.get(l) || 0) + 1);
    }

    // 서브그룹별 items 생성
    const catItems = [];
    for (const [subLabel, subRoutes] of subEntries) {
      const docs = subRoutes.map((r) => {
        const base = baseLabel(r);
        const dup = (counts.get(base) || 0) > 1;
        const label = dup ? `${base} (${lastSegment(r.path)})` : base;
        return { type: "doc", id: docIdFromPath(r.path), label };
      });

      if (subLabel) {
        // ✅ menuLabel 길이 3+인 경우: 2차 category 생성
        catItems.push({
          type: "category",
          label: subLabel,
          items: docs,
        });
      } else {
        // ✅ menuLabel 길이 1~2인 경우: 기존처럼 doc 바로 넣음
        catItems.push(...docs);
      }
    }

    return { type: "category", label: cat.label, items: catItems };
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

  const invalid = routes.filter((r) => !r || typeof r.path !== "string");
  if (invalid.length) {
    console.error(`Invalid items (missing 'path'): ${invalid.length}`);
    process.exit(1);
  }

  const items = buildTutorialSidebarItems(routes);

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(items, null, 2) + "\n", "utf-8");
  console.log(`✅ generated: ${OUTPUT_JSON}`);
  console.log("Copy this JSON array into sidebars.ts -> tutorialSidebar");
}

main();
