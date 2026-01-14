#!/bin/bash

# 변수 설정
START=$(date +%s)
PROMPT_FILE="./scripts/prompts/routes.txt"
CODEX_INPUT_DIR="."
CODEX_OUTPUT_DIR="./generated"

# 2. 가이드 생성 단계 (Codex 스크립트 호출)
echo ">>> routes.json 파일 생성 시작..."

# 결과 전달
echo "$PROMPT_FILE" | codex exec -C $CODEX_INPUT_DIR --add-dir $CODEX_OUTPUT_DIR --sandbox workspace-write --skip-git-repo-check

# 종료 시간 및 계산
END=$(date +%s)
DIFF=$(( END - START ))

echo ">>> routes.json 파일 생성 종료: ${DIFF}s"