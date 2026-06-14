#!/bin/bash
# 清除 AuthSession 表中的所有数据

cd "$(dirname "$0")/../apps/api"

COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.authSession.count().then(c => { console.log(c); return p.\$disconnect(); });
" 2>/dev/null)

echo "当前 AuthSession 条目数：$COUNT"

if [ "$COUNT" = "0" ]; then
  echo "表中无数据，无需清除"
  exit 0
fi

read -p "确认清除所有 AuthSession 数据？(y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "已取消"
  exit 0
fi

node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.authSession.deleteMany().then(r => {
  console.log('已清除 ' + r.count + ' 条 AuthSession 数据');
  return p.\$disconnect();
});
"
