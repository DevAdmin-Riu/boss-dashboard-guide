# boss-dashboard-guide (Docusaurus)

**포장보스 어드민(관리자용) 웹 서비스**의 이용 가이드 문서 사이트. 페이지(URL pathname) 단위의 가이드를 Docusaurus로 관리한다.

- 문서 사이트는 GitHub Pages로 배포된다: https://devadmin-riu.github.io/boss-dashboard-guide
- 문서 구조는 서비스의 URL 구조(`/a/b/c`)와 동일하게 `docs/a/b/c/index.md` 형태로 관리된다.
- 포장보스 서비스 저장소 목록은 [saleor-boss](https://github.com/DevAdmin-Riu/saleor-boss) 참조.

---

## 운영 모델 (주간 자동 동기화)

가이드 생성·최신화는 **Claude 주간 자동 동기화 루틴**이 수행한다. 사람은 push와 PR 머지만 담당한다.

```
[Claude 루틴 — 매주 자동]
saleor-dashboard origin/master 변경 감지 (기준점 커밋 대비)
→ 추가/삭제/변경된 페이지 분류
→ docs/**/index.md 생성·갱신·정리 + sidebars.ts·routes.source.json 동기화
→ npm run build 검증 후 develop 브랜치에 커밋 (push는 하지 않음)

[사람 — 루틴 보고 확인 후]
develop push → develop→main PR 생성·머지
→ GitHub Actions(.github/workflows/deploy.yml)가 GitHub Pages 자동 배포
```

- **기준점 관리**: `data/routes.source.json`의 `__meta.lastSyncedDashboardCommit`에 "가이드가 현재 반영하고 있는 saleor-dashboard origin/master 커밋 SHA"를 보관한다. 루틴은 매주 `이 커밋..origin/master` 범위의 변경만 처리하고, 처리 완료한 SHA로 갱신한다.
- 코드 파악 기준은 saleor / saleor-dashboard 모두 **`origin/master`**(실서버 배포 기준 브랜치)이며, 루틴은 두 저장소를 읽기 전용으로만 참조한다.
- 루틴 실행 조건: 이 저장소와 참조 저장소(`saleor-boss/saleor`, `saleor-boss/saleor-dashboard`)가 로컬에 존재해야 한다 (로컬 실행 전용).

<details>
<summary><strong>루틴 지침 전문 (Claude 스케줄 작업에 등록된 원문 — 복사해서 사용)</strong></summary>

````markdown
# boss-dashboard-guide 주간 자동 동기화 루틴

## 목적

saleor-dashboard의 실서버 배포 기준 브랜치(origin/master)와 boss-dashboard-guide(docs)를 매주 대조하여,
추가·변경·삭제된 페이지를 가이드에 반영하고 **develop 브랜치(가이드 저장소)에 커밋**한다.
**push는 절대 하지 않는다.**

## 기준 브랜치 (중요)

- 코드 파악 기준은 **`origin/master`**(saleor / saleor-dashboard 모두). master가 실서버 배포 기준 브랜치다.
- **로컬에 master 브랜치가 없다.** 원격 추적 ref `origin/master`를 읽는다.
- 최신 production 상태를 보려면 실행 시작 시 한 번 `git -C <repo> fetch origin master`로 ref를 갱신한다.
  (작업트리/로컬 브랜치를 건드리지 않는 read-only 작업 — 이 루틴에서 허용되는 유일한 네트워크 작업.)
- 절대 체크아웃하지 말고 `git -C <repo> show origin/master:<path>` / `git -C <repo> archive origin/master` / `git -C <repo> grep <pat> origin/master`로 읽는다.
- 참고: 이 프로젝트는 stage→master 흐름이라 master가 develop과 거의 동기(또는 master가 앞섬)다.

## 실행 환경 / 사전 조건

- 작업 대상(쓰기 허용): /Users/riu02/Desktop/boss-dashboard-guide (이 저장소 내부만)
- 참조 코드(읽기 전용): /Users/riu02/Desktop/saleor-boss/saleor, /Users/riu02/Desktop/saleor-boss/saleor-dashboard
- 두 참조 저장소는 로컬에 존재해야 하며, 네트워크/원격 환경에서는 동작하지 않는다(로컬 실행 전용).

## 절대 규칙 (위반 금지)

1. boss-dashboard-guide 외부 파일은 절대 수정하지 않는다. saleor-boss는 읽기 전용(브랜치 체크아웃·파일 수정 금지, `fetch origin master`만 예외).
2. 코드 파악은 항상 **두 저장소의 `origin/master` 기준**으로 한다.
3. codex 파이프라인 스크립트(generate-routes.sh, build-guides.sh)는 실행하지 않는다. 참고용일 뿐, 작업은 직접 수행한다.
4. 추측으로 UI 문자열을 지어내지 않는다. 모든 버튼/토스트/모달/라벨 문구는 코드에서 확인 후 인용한다.

## 기준점(baseline) 관리 ⭐

- data/routes.source.json의 `__meta.lastSyncedDashboardCommit`에 **이 가이드가 현재 반영하고 있는** saleor-dashboard 커밋 SHA를 보관한다. (현재 origin/master HEAD가 아니라, 마지막으로 반영을 끝낸 커밋.)
- **실행 시작 시점에 대상 ref를 고정한다:** `git -C saleor-dashboard fetch origin master` 후 `TARGET=$(git -C saleor-dashboard rev-parse origin/master)`.
  이번 실행은 처음부터 끝까지 이 `TARGET` 한 값만 본다. (실행 도중 master가 더 진행돼도 무시 — 그 부분은 다음 주 실행이 잡는다.)
- 대상 범위: `BASE = __meta.lastSyncedDashboardCommit` … `TARGET`. 즉 `git -C saleor-dashboard log BASE..$TARGET` 범위만 처리한다.
- **갱신은 반드시 "이번에 처리한 `TARGET`"으로 한다 — 커밋 시점의 라이브 origin/master로 갱신하지 않는다.** (라이브로 갱신하면 실행 도중 들어온 커밋을 영영 건너뛴다.)
- `BASE`가 origin/master의 조상이기만 하면 develop 계열 SHA여도 `BASE..origin/master` 범위는 유효하다. 단 매 실행의 갱신값은 origin/master 커밋이 되도록 한다.

## 주간 절차

1. **기준 고정 및 변경 감지**
   - `git -C saleor-dashboard fetch origin master` → `TARGET=$(git -C saleor-dashboard rev-parse origin/master)`, `BASE=__meta.lastSyncedDashboardCommit` 로 고정.
   - `git -C saleor-dashboard log BASE..$TARGET --oneline` 로 feature/fix 커밋 확인.
   - `git -C saleor-dashboard diff BASE $TARGET -- src/app/components/AppLayout/menuStructureStaff.ts` 로 메뉴 추가/삭제/변경 확인.
   - 현재 origin/master 메뉴의 URL+라벨 전체를 해석해 data/routes.source.json과 대조. 라벨이 변수 참조(`sectionNames.*`, `b2bTerm.*` 등)거나 합성 함수(`makeNameByOrderType` 등)면 **실제 문자열 값까지 해석**해서 비교한다. (git grep 미검출은 의심 목록일 뿐 — 주석 잔존/런타임 합성 라벨 오탐 주의.)
   - `git -C saleor-dashboard diff BASE $TARGET --name-only -- src/app/views/` 로 변경된 view 파일을 확인해, URL은 그대로지만 **동작이 바뀐 페이지**도 후보에 넣는다.

2. **분류**
   - 추가된 URL → 신규 가이드 생성
   - 삭제된 URL → docs 파일 정리(삭제), sidebars.ts·routes에서도 제거
   - 라벨만 바뀐 URL → 문서 title·sidebars 라벨·routes menuLabel 갱신(+본문 표현 점검)
   - 동작이 바뀐 URL → 본문 재검증·갱신

3. **페이지별 분석 (라우트 우선)**
   - 반드시 라우터(예: src/app/views/<area>/index.tsx 의 wrapper)부터 따라가 **실제 렌더링되는 컴포넌트**를 확정한다. 공유 컴포넌트의 status 분기 중 라우트가 도달하지 않는 데드코드를 근거로 쓰지 않는다.
   - 확정한 컴포넌트(+Page/TableSettings/모달)를 분석해 버튼 라벨·수행 단계·모달 제목/필드·성공 토스트·실패/제한 조건을 수집한다.
   - 수집한 모든 UI 문자열은 `git grep`으로 직접 확인하고, `${...}` 템플릿 보간은 실제 값으로 풀어서 확정한다.

4. **문서 작성 규칙 (개조식 템플릿 — 2026-07-30 전면 개편)**
   - 경로 규칙: 서비스 URL `/a/b/c` ↔ `docs/a/b/c/index.md`
   - frontmatter: `title: "<1뎁스> > <2뎁스> > <페이지명>"`(메뉴 라벨과 일치), `slug: <pathname>`, `sidebar_position: 20`
   - 구조: `> _최종 업데이트: <실행일(YYYY-MM-DD)>_` → `## 페이지 설명`(개조식 불릿 1~3줄, 여러 기능 공통 동작·전제는 여기로 승격) → `## 기능 요약`(표 `| 기능 | 내용 |`, 기능명은 섹션 앵커 링크) → 기능별 `## 기능명`(번호 단계 + 볼드 라벨 불릿 `- **완료**:` / `- **제한**:` / `- **⚠️ 유의**:`)
   - 문체(개조식): 단계는 체언 종결("발행할 항목 선택", "\"버튼명\" 클릭"), 상태·결과는 "~됨/임/있음/없음/불가/필수" 또는 명사 종결, 조건은 "~시 ~", 흐름은 "→", 병렬은 " / "
   - UI 문자열은 코드의 실제 문자열을 큰따옴표(또는 원문이 백틱이면 백틱)로 그대로 인용 — 존댓말이어도 변경 금지. 확인 못 한 문구는 생략(지어내지 않는다)
   - 자명한 공통 기능(엑셀 다운로드·표시 컬럼 설정)은 고유 정보(오류 문구·범위 설명) 없으면 기능 요약 표 한 줄로만 처리, 고유 정보 있으면 정식 섹션 유지
   - 완료/제한/유의 중 근거 없는 항목은 만들지 않음. 기능이 1개여도 기능 요약 표 포함
   - 앵커: 헤딩 텍스트에서 공백→'-', 괄호·특수문자 제거. 헤딩에 " / " 같은 특수문자 금지(가운뎃점 · 사용)
   - 본문에 리터럴 중괄호 `{...}` 금지 — MDX가 JS 표현식으로 해석해 빌드 실패(괄호로 대체)
   - 표준 예시: docs/b2b/settlement/confirmed/index.md(액션형), docs/stats/riu-minus-profit-bpvs/index.md(조회 전용), docs/purchases/boss/pending/index.md(복잡 모달형)
   - 변경한 문서는 "최종 업데이트"를 실행일로 갱신. 기존 문서 갱신 시에도 이 템플릿 구조 유지(구 H4 라벨 헤딩 양식으로 되돌리지 말 것)
   - 예외: docs/intro.md, docs/guides-by-manual/(수동 매뉴얼)은 이 템플릿 미적용

5. **동기화**
   - sidebars.ts: 카테고리/순서를 origin/master 메뉴 구조와 일치시킨다.
   - data/routes.source.json: menuLabel 배열은 한 줄 인라인 포맷 유지.
   - `__meta.lastUpdated`를 실행일로, `__meta.lastSyncedDashboardCommit`을 **이번에 고정한 `TARGET`(origin/master SHA)**으로 갱신한다.

6. **검증**
   - `npm run build` 성공 확인.
   - JSON 수정 시 `python3 -c "import json; json.load(open('data/routes.source.json'))"`로 파싱 확인.

7. **커밋 (push 금지)**
   - 가이드 저장소(boss-dashboard-guide)에서 변경을 모두 stage 후, 한국어로 요약한 커밋 메시지로 develop에 커밋한다.
     예: `feature: <영역> origin/master 코드 기준 가이드 생성/갱신/정리 (주간 동기화)`
   - **절대 push 하지 않는다.**

8. **변경 없음 처리**
   - `BASE..$TARGET`에 가이드 반영할 메뉴/동작 변경이 없으면 문서는 수정하지 않는다.
   - 이 경우에도 `__meta.lastSyncedDashboardCommit`은 `TARGET`으로 갱신해 다음 주 범위를 좁히고, 그 한 줄만 `chore: 주간 동기화 기준점 갱신(반영할 변경 없음)`으로 커밋한다(정책 일관 적용).

## 보고

실행 후: 고정한 `BASE → TARGET` 범위, 생성/수정/삭제한 문서 목록, 빌드 결과, 커밋 해시(또는 "변경 없음"), 갱신된 `lastSyncedDashboardCommit` 값을 요약 보고한다.
````

</details>

---

## 사전 요구사항 (로컬 확인·수동 작업 시)

- node 20 이상 (`package.json` engines 기준)
- `npm ci`로 모듈 설치

## 주요 명령어

| 목적 | 명령어 | 설명 |
| --- | --- | --- |
| 로컬 개발 서버 | `npm run start` | Docusaurus 개발 서버 실행 (localhost:3000) |
| 정적 빌드 | `npm run build` | 배포와 동일한 정적 빌드 생성 — 깨진 링크·MDX 오류 등 검증 (루틴도 커밋 전 실행) |
| 빌드 결과 확인 | `npm run serve` | `build` 결과물을 로컬에서 서빙 |
| 타입 체크 | `npm run typecheck` | tsc |

---

## 문서(페이지) 규칙

### 경로 매핑

| route path | 문서 파일 |
| --- | --- |
| `/vendors` | `docs/vendors/index.md` |
| `/purchase-order/lines/track-inventory/draft` | `docs/purchase-order/lines/track-inventory/draft/index.md` |

### front matter

- `title`: 메뉴 라벨을 `" > "`로 이어붙인 값 — 예) `재고 발주 관리 > 재고 발주`
- `slug`: route의 path
- `sidebar_position`: 사이드바 정렬용 (현재 `sidebars.ts`에서 수동 정의 중이므로 참고값)

### 본문 템플릿 (개조식)

`> _최종 업데이트: YYYY-MM-DD_` → `## 페이지 설명` (불릿 1~3줄) → `## 기능 요약` (표, 기능명은 섹션 앵커 링크) → 기능별 섹션 (번호 단계 + `- **완료**:` / `- **제한**:` / `- **⚠️ 유의**:` 불릿).

- UI 문자열(버튼·토스트·모달 문구)은 코드의 실제 문자열을 그대로 인용한다 — 추측으로 지어내지 않는다.
- 본문에 리터럴 중괄호 `{...}` 금지 — MDX가 JS 표현식으로 해석해 빌드가 실패한다 (괄호로 대체).
- 표준 예시: `docs/b2b/settlement/confirmed/`(액션형) · `docs/stats/riu-minus-profit-bpvs/`(조회 전용) · `docs/purchases/boss/pending/`(복잡 모달형)
- 예외: `docs/intro.md`, `docs/guides-by-manual/`(수동 매뉴얼)은 템플릿 미적용.

---

## 배포 방식 (GitHub Actions)

GitHub Pages Source가 GitHub Actions로 설정되어 있고, **PR이 main에 merge되면** 워크플로우가 실행되어 사이트가 배포된다.

- 워크플로우: `.github/workflows/deploy.yml`
- 배포 정책: `develop` 브랜치에 커밋(주간 루틴) → push → `develop` → `main` PR 생성·머지 → 자동 배포

---

## 수동 작업이 필요한 경우

- **특정 페이지를 즉시 수정하고 싶을 때**: `docs/<path>/index.md`를 위 템플릿에 맞게 직접 수정 → `npm run build` 검증 → develop 커밋·push → main PR 머지. (다음 주간 루틴이 기준점 이후 변경을 다시 대조하므로 충돌하지 않는다)
- **메뉴 구조(URL·라벨) 변경 반영**: 기본적으로 주간 루틴이 감지·처리한다. 수동으로 할 경우 `docs/` 폴더 구조, `sidebars.ts`, `data/routes.source.json`의 routes를 함께 맞춘다.
