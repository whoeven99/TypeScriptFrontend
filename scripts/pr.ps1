<#
.SYNOPSIS
  推送当前分支并创建 PR 到 master
.DESCRIPTION
  用法: .\scripts\pr.ps1 [-Title "PR标题"] [-Base "master"] [-Draft]
  触发词: "提个pr" / "提pr" / "创建PR"
#>
param(
    [string]$Title = "",
    [string]$Base = "master",
    [switch]$Draft,
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"

# ── 获取当前分支 ──
$currentBranch = git rev-parse --abbrev-ref HEAD
if (-not $currentBranch) {
    Write-Error "无法获取当前分支名"
    exit 1
}

Write-Host "当前分支: $currentBranch" -ForegroundColor Cyan

# ── 检查是否有未提交的更改 ──
$status = git status --porcelain
if ($status) {
    Write-Host ""
    Write-Host "⚠ 有未提交的更改:" -ForegroundColor Yellow
    git status --short
    Write-Host ""
    $commitMsg = Read-Host "输入 commit message (留空跳过，直接 push 已有 commit)"
    if ($commitMsg) {
        git add -A
        git commit -m $commitMsg
        if ($LASTEXITCODE -ne 0) {
            Write-Error "git commit 失败"
            exit 1
        }
        Write-Host "✓ 已提交" -ForegroundColor Green
    }
}

# ── 推送 ──
if (-not $NoPush) {
    Write-Host ""
    Write-Host "推送分支 $currentBranch ..." -ForegroundColor Cyan
    git push -u origin $currentBranch 2>&1
    if ($LASTEXITCODE -ne 0) {
        # 可能已经推送过，尝试普通 push
        git push origin $currentBranch 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "git push 失败"
            exit 1
        }
    }
    Write-Host "✓ 推送完成" -ForegroundColor Green
}

# ── 检查是否已有 PR ──
Write-Host ""
Write-Host "检查是否已有 PR..." -ForegroundColor Cyan
$existingPR = gh pr list --head $currentBranch --base $Base --state open --json number,url | ConvertFrom-Json
if ($existingPR -and $existingPR.Count -gt 0) {
    Write-Host "⚠ 已存在 PR: $($existingPR[0].url)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "PR 链接: $($existingPR[0].url)" -ForegroundColor Green
    exit 0
}

# ── 生成默认标题 ──
if (-not $Title) {
    # 从最近一次 commit message 生成标题
    $lastCommit = git log -1 --pretty=%B
    $Title = ($lastCommit -split "`n")[0].Trim()
    if (-not $Title) {
        $Title = $currentBranch
    }
}

# ── 默认 body ──
$body = @"
## 变更说明

<!-- 请在此描述本次 PR 的变更内容 -->

## 测试

- [ ] 本地测试通过
- [ ] 关联 Issue: #

## 部署

合并后通过 GitHub Actions 发布测试环境。
"@

# ── 创建 PR ──
Write-Host ""
Write-Host "创建 PR: $currentBranch → $Base" -ForegroundColor Cyan

$draftFlag = if ($Draft) { "--draft" } else { "" }
$prUrl = gh pr create `
    --base $Base `
    --head $currentBranch `
    --title $Title `
    --body $body `
    $draftFlag 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Error "PR 创建失败: $prUrl"
    exit 1
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "✓ PR 已创建!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "PR 链接: $prUrl" -ForegroundColor Cyan
Write-Host ""

# ── 可选：在浏览器中打开 ──
$open = Read-Host "在浏览器中打开? (y/n)"
if ($open -eq "y") {
    Start-Process $prUrl
}
