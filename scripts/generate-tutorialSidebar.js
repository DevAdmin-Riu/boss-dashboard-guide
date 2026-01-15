#!/usr/bin/env node
/**
 * routes.json -> tutorialSidebar items 배열(JSON) 생성
 *
 * 출력: generated/tutorialSidebar.json
 *
 * 규칙:
 * - menuLabel 길이 1:  [Group(menuLabel[0])] -> doc(label=menuLabel[0])
 * - menuLabel 길이 2:  [Group(menuLabel[0])] -> doc(label=menuLabel[1])
 * - menuLabel 길이 3+: [Group(menuLabel[0])] -> [Sub(menuLabel[1])] -> doc(label=마지막 요소)
 *
 * ★ 가장 중요:
 * - "routes.json 원본 순서"를 100% 유지한다.
 *   (그룹/서브/문서 모두 원본 등장 순서 그대로)
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

function groupLabel(route) {
  return menu(route)[0] || "기타";
}

function subLabel(route) {
  return menu(route)[1] || null;
}

function docLabel(route) {
  const ml = menu(route);
  return ml.length ? ml[ml.length - 1] : String(route.path || "");
}

function build(routes) {
  // 0) 각 그룹 내부/전체에서 "마지막 라벨" 중복 여부 계산 (원본 전체 기준)
  const labelCountByGroup = new Map(); // group -> Map<label, count>

  for (const r of routes) {
    const g = groupLabel(r);
    const l = docLabel(r);
    if (!labelCountByGroup.has(g)) labelCountByGroup.set(g, new Map());
    const m = labelCountByGroup.get(g);
    m.set(l, (m.get(l) || 0) + 1);
  }

  // 1) streaming builder: routes 순회하며 그룹/서브/문서 구조를 "등장 순서대로" 만든다
  const groups = new Map(); // groupLabel -> category node
  const groupOrder = []; // groupLabel 등장 순서 기록

  function ensureGroup(gLabel) {
    if (!groups.has(gLabel)) {
      groups.set(gLabel, { type: "category", label: gLabel, items: [] });
      groupOrder.push(gLabel);
    }
    return groups.get(gLabel);
  }

  // 그룹마다 subCategory 맵을 따로 들고, "첫 등장 위치에" category를 삽입하기 위해
  // groupNode.__subMap 으로 관리 (출력 시 제거)
  function ensureSub(groupNode, sLabel) {
    if (!groupNode.__subMap) groupNode.__subMap = new Map();
    const map = groupNode.__subMap;

    if (!map.has(sLabel)) {
      const subNode = { type: "category", label: sLabel, items: [] };
      map.set(sLabel, subNode);
      // ★ 서브카테고리는 "처음 등장한 위치"에 바로 삽입
      groupNode.items.push(subNode);
    }
    return map.get(sLabel);
  }

  for (const r of routes) {
    const ml = menu(r);
    const g = groupLabel(r);
    const groupNode = ensureGroup(g);

    const base = docLabel(r);
    const isDup = (labelCountByGroup.get(g)?.get(base) || 0) > 1;
    const label = isDup ? `${base} (${lastSegment(r.path)})` : base;

    const docItem = { type: "doc", id: docIdFromPath(r.path), label };

    // menuLabel 길이 3+ => subcategory(menuLabel[1]) 아래
    if (ml.length >= 3) {
      const s = subLabel(r);
      const subNode = ensureSub(groupNode, s);
      subNode.items.push(docItem);
      continue;
    }

    // menuLabel 길이 1~2 => group 바로 아래, "그 자리"에 doc push
    groupNode.items.push(docItem);
  }

  // 2) 출력: groupOrder 순서대로 category 배열 생성 + 내부 임시 필드 제거
  const result = groupOrder.map((g) => {
    const node = groups.get(g);
    // 임시 필드 제거
    if (node.__subMap) delete node.__subMap;
    return node;
  });

  return result;
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

  const items = build(routes);

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(items, null, 2) + "\n", "utf-8");
  console.log(`✅ generated: ${OUTPUT_JSON}`);
  console.log("Copy this JSON array into sidebars.ts -> tutorialSidebar");
}

main();
