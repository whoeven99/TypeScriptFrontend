<#
.SYNOPSIS
  合并 PR 并触发测试环境部署（TSF + Worker）
.DESCRIPTION
  用法: .\scripts\merge-deploy-test.ps1 [-PRNumber <number>] [-Branch <branch>]
  如果不提供 PR 号，自动查找当前分支对应的 PR。
  触发词: "合入PR然后发布测试环境" / "合入pr发布测试" / "merge and deploy test"
#>
param(
    [int]$PRNumber = 0,
    [string]$Branch = "",
    [ValidateSet("merge", "squash", "rebase")]
    [string]$MergeMethod = "squash"
)

$ErrorActionPreference = "Stop"
$repo = "whoeven99/TypeScriptFrontend"

# ── 确定 PR ──
if ($PRNumber -eq 0) {
    $targetBranch = if ($Branch) { $Branch } else { git rev-parse --abbrev-ref HEAD }
    Write-Host "查找分支 $targetBranch 对应的 PR..." -ForegroundColor Cyan
    
    $prs = gh pr list --head $targetBranch --base master --state open --json number,title,url | ConvertFrom-Json
    if (-not $prs -or $prs.Count -eq 0) {
        Write-Error "未找到分支 $targetBranch 的 open PR。请先执行 scripts/pr.ps1 创建 PR，或手动指定 -PRNumber。"
        exit 1
    }
    if ($prs.Count -gt 1) {
        Write-Host "⚠ 找到多个 PR:" -ForegroundColor Yellow
        $prs | ForEach-Object { Write-Host "  #$($_.number) - $($_.title)" }
        $PRNumber = [int](Read-Host "输入要合并的 PR 号")
    } else {
        $PRNumber = $prs[0].number
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "即将合并 PR #$PRNumber" -ForegroundColor Cyan

# 显示 PR 信息
$prInfo = gh pr view $PRNumber --json number,title,headRefName,baseRefName,url | ConvertFrom-Json
Write-Host "  标题 : $($prInfo.title)" -ForegroundColor White
Write-Host "  分支 : $($prInfo.headRefName) → $($prInfo.baseRefName)" -ForegroundColor White
Write-Host "  链接 : $($prInfo.url)" -ForegroundColor White
Write-Host "  方式 : $MergeMethod" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "确认合并? (y/n)"
if ($confirm -ne "y") {
    Write-Host "已取消" -ForegroundColor Yellow
    exit 0
}

# ── Step 1: 合并 PR ──
Write-Host ""
Write-Host "[1/3] 合并 PR #$PRNumber ..." -ForegroundColor Cyan

gh pr merge $PRNumber --$MergeMethod --delete-branch 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "PR 合并失败"
    exit 1
}
Write-Host "✓ PR #$PRNumber 已合并" -ForegroundColor Green

# ── Step 2: 切换到 master 并拉取 ──
Write-Host ""
Write-Host "[2/3] 切换到 master 并拉取最新代码..." -ForegroundColor Cyan

git checkout master 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "切换分支失败"
    exit 1
}

git pull origin master 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "拉取最新代码失败"
    exit 1
}
Write-Host "✓ 已在 master 最新提交" -ForegroundColor Green

# ── Step 3: 触发测试环境部署 ──
Write-Host ""
Write-Host "[3/3] 触发测试环境部署 (TSF App + Worker)..." -ForegroundColor Cyan

# 触发 tsf-deploy.yml workflow, 只部署测试环境
$runUrl = gh workflow run "tsf-deploy.yml" `
    --repo $repo `
    --ref master `
    -f render_service_test=true `
    -f render_worker_test=true 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠ 触发部署可能失败: $runUrl" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "请手动触发: https://github.com/$repo/actions/workflows/tsf-deploy.yml" -ForegroundColor Yellow
} else {
    Write-Host "✓ 测试环境部署已触发" -ForegroundColor Green
    
    # 等几秒让 workflow run 创建出来
    Start-Sleep -Seconds 3
    
    # 获取最新的 workflow run URL
    $runs = gh run list --repo $repo --workflow "tsf-deploy.yml" --limit 1 --json url,databaseId,status | ConvertFrom-Json
    if ($runs -and $runs.Count -gt 0) {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "✓ 全部完成!" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        Write-Host "部署运行链接: $($runs[0].url)" -ForegroundColor Cyan
        Write-Host "状态: $($runs[0].status)" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "已部署的服务:" -ForegroundColor White
Write-Host "  • TSF Web (Remix app) → Test" -ForegroundColor White
Write-Host "  • TSF Worker           → Test" -ForegroundColor White
Write-Host ""
