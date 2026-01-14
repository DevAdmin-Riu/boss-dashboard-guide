#!/bin/bash

# NOTE: 각 저장소 코드 경로는 개인 환경에 따라 다르므로 필요 시 수정하여 이용
BE_DIR="../saleor-boss/saleor"
# FE_MALL_DIR="../saleor-boss/saleor-storefront"
FE_DASHBOARD_DIR="../saleor-boss/saleor-dashboard"
REPOMIX_OUTPUT_DIR="./generated/repomix-outputs"

echo "백엔드 추출 중..."
npx repomix $BE_DIR --output $REPOMIX_OUTPUT_DIR/be.xml --include "saleor/**/*,requirements.txt" --ignore "**/migrations/**,**/core/firebase/**,**/settings.py"

# echo "프론트엔드 - 보스몰 추출 중..."
# npx repomix $FE_MALL_DIR --output $REPOMIX_OUTPUT_DIR/fe-mall.xml --include "src/**/*,package.json" --ignore "**/gqlTypes/**,**/types/**,**/*.css,**/*.scss"

echo "프론트엔드 - 대시보드 추출 중..."
npx repomix $FE_DASHBOARD_DIR --output $REPOMIX_OUTPUT_DIR/fe-dashboard.xml --include "src/**/*,package.json" --ignore "**/gqlTypes/**,**/types/**,**/*.css,**/*.scss"
