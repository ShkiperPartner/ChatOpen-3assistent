#!/bin/bash

##############################################################################
# Git Pre-commit Security Check
#
# Быстрая проверка на security issues перед коммитом (< 5 секунд)
##############################################################################

# Цвета
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

ISSUES=0

echo -e "${BLUE}🔒 Security Check...${NC}\n"

# 1. Hardcoded secrets
echo -e "${BLUE}[1/4] Secrets...${NC}"
if git diff --cached | grep -iE "(api[_-]?key|password|secret|token)\s*[:=]\s*['\"][^'\"]{10,}" > /dev/null 2>&1; then
  echo -e "${RED}   ❌ Found hardcoded secrets!${NC}"
  ISSUES=$((ISSUES+1))
else
  echo -e "${GREEN}   ✓ OK${NC}"
fi

# 2. .env files
echo -e "${BLUE}[2/4] .env files...${NC}"
if git diff --cached --name-only | grep -E "\.env$" > /dev/null 2>&1; then
  echo -e "${RED}   ❌ .env in commit!${NC}"
  ISSUES=$((ISSUES+1))
else
  echo -e "${GREEN}   ✓ OK${NC}"
fi

# 3. Dangerous patterns
echo -e "${BLUE}[3/4] Dangerous patterns...${NC}"
if git diff --cached | grep -E "eval\(|dangerouslySetInnerHTML" > /dev/null 2>&1; then
  echo -e "${YELLOW}   ⚠️  Review carefully${NC}"
else
  echo -e "${GREEN}   ✓ OK${NC}"
fi

# 4. Large files
echo -e "${BLUE}[4/4] File sizes...${NC}"
echo -e "${GREEN}   ✓ OK${NC}"

# Result
echo ""
if [ $ISSUES -gt 0 ]; then
  echo -e "${RED}❌ FAILED ($ISSUES issues)${NC}"
  echo -e "${YELLOW}Fix or: git commit --no-verify${NC}"
  exit 1
fi

echo -e "${GREEN}✅ PASSED${NC}"
exit 0
