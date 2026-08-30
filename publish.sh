#!/usr/bin/env bash
# =========================================================
# 一键发布到 GitHub Pages
# 用法：在 Git Bash 中执行
#   ./publish.sh <你的GitHub用户名> [仓库名，默认 personal-workbench]
# 首次运行会弹出浏览器要求登录 GitHub 授权，完成一次即可。
# =========================================================
set -e
cd "$(dirname "$0")"

USER_NAME="$1"
REPO="${2:-personal-workbench}"
if [ -z "$USER_NAME" ]; then
  echo "用法: ./publish.sh <GitHub用户名> [仓库名]"
  exit 1
fi

echo "==> 1/4 获取 GitHub 授权（首次会弹出浏览器登录窗口）"
CREDS=$(printf "protocol=https\nhost=github.com\n" | git credential fill)
TOKEN=$(echo "$CREDS" | grep '^password=' | cut -d= -f2-)
if [ -z "$TOKEN" ]; then echo "未获取到凭据，请重试"; exit 1; fi

echo "==> 2/4 创建仓库 $USER_NAME/$REPO（若已存在则跳过）"
curl -s -o /dev/null -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO\",\"private\":false,\"description\":\"个人计划执行总结工作台\"}"

echo "==> 3/4 推送代码"
git config user.name  >/dev/null 2>&1 || git config user.name  "$USER_NAME"
git config user.email >/dev/null 2>&1 || git config user.email "$USER_NAME@users.noreply.github.com"
git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$USER_NAME/$REPO.git"
git push -u origin main

echo "==> 4/4 开启 GitHub Pages"
curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$USER_NAME/$REPO/pages" \
  -d '{"source":{"branch":"main","path":"/"}}' | grep -E '"html_url"|"message"' | head -2

echo ""
echo "✅ 完成！约 1-2 分钟后访问："
echo "   仓库: https://github.com/$USER_NAME/$REPO"
echo "   网页: https://$USER_NAME.github.io/$REPO/"
