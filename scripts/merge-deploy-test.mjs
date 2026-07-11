/**
 * merge-deploy-test.mjs
 *
 * 合入 PR 并触发测试环境部署（TSF Web + Worker）。
 * 供 Cursor Agent 非交互调用；等价于 scripts/merge-deploy-test.ps1，但无需人工确认。
 *
 * 用法：
 *   npm run merge:deploy:test
 *   node scripts/merge-deploy-test.mjs --pr 123
 *   node scripts/merge-deploy-test.mjs --branch feature/foo
 *   node scripts/merge-deploy-test.mjs --dry-run
 *
 * 成功时输出：
 *   MERGED_PR: 123
 *   MERGED_PR_URL: https://github.com/owner/repo/pull/123
 *   DEPLOY_RUN_URL: https://github.com/owner/repo/actions/runs/...
 */

import { execFileSync, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const WORKFLOW_FILE = "tsf-deploy.yml";
const DEFAULT_BASE = "master";

function parseArgs(argv) {
  const args = {
    pr: 0,
    branch: "",
    base: DEFAULT_BASE,
    mergeMethod: "squash",
    dryRun: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--pr") args.pr = Number(argv[++i] ?? 0);
    else if (a === "--branch") args.branch = argv[++i] ?? "";
    else if (a === "--base") args.base = argv[++i] ?? DEFAULT_BASE;
    else if (a === "--merge-method") args.mergeMethod = argv[++i] ?? "squash";
  }
  return args;
}

function printUsage() {
  console.log(`Usage: node scripts/merge-deploy-test.mjs [options]

Options:
      --pr <number>           指定要合并的 PR 号（默认自动查找当前分支 open PR）
      --branch <name>         查找 PR 时使用的分支（默认当前分支）
      --base <branch>         PR 目标分支（默认 master）
      --merge-method <method> squash | merge | rebase（默认 squash）
      --dry-run               只预览，不实际合并/部署
  -h, --help                  显示帮助
`);
}

function git(args, opts = {}) {
  try {
    return execFileSync("git", args, {
      cwd: opts.cwd ?? REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    const msg = [err.stdout, err.stderr].filter(Boolean).join("\n").trim() || err.message;
    throw new Error(msg);
  }
}

function gitAllowFail(args) {
  try {
    return { ok: true, out: git(args) };
  } catch (err) {
    return { ok: false, out: err.message };
  }
}

function resolveGhBin() {
  const candidates = [
    "gh",
    "C:\\Program Files\\GitHub CLI\\gh.exe",
    join(process.env.LOCALAPPDATA ?? "", "Programs", "GitHub CLI", "gh.exe"),
  ];
  for (const bin of candidates) {
    const r = spawnSync(bin, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return bin;
  }
  return null;
}

function gh(args) {
  const bin = resolveGhBin();
  if (!bin) throw new Error("未找到 gh CLI，请先安装并登录：gh auth login");
  try {
    return execFileSync(bin, args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    const msg = [err.stdout, err.stderr].filter(Boolean).join("\n").trim() || err.message;
    throw new Error(msg);
  }
}

function ghJson(args, fields) {
  const out = gh([...args, "--json", fields]);
  return JSON.parse(out || "null");
}

function ghJsonList(args, fields) {
  const out = gh([...args, "--json", fields]);
  return JSON.parse(out || "[]");
}

function getRemoteInfo() {
  const url = git(["remote", "get-url", "origin"]);
  const m = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
  if (!m) throw new Error(`无法解析 GitHub 仓库地址: ${url}`);
  return { owner: m[1], repo: m[2].replace(/\.git$/, ""), slug: `${m[1]}/${m[2].replace(/\.git$/, "")}` };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolvePrNumber({ pr, branch, base, owner, repo }) {
  if (pr > 0) return pr;

  const targetBranch = branch || git(["branch", "--show-current"]);
  const pulls = ghJsonList(
    [
      "pr",
      "list",
      "--repo",
      `${owner}/${repo}`,
      "--head",
      targetBranch,
      "--base",
      base,
      "--state",
      "open",
    ],
    "number,title,url",
  );

  if (!pulls.length) {
    throw new Error(
      `未找到分支 ${targetBranch} → ${base} 的 open PR。请先运行 npm run push:pr 创建 PR，或用 --pr 指定。`,
    );
  }
  if (pulls.length > 1) {
    const list = pulls.map((p) => `#${p.number} ${p.title}`).join("; ");
    throw new Error(`分支 ${targetBranch} 对应多个 open PR，请用 --pr 指定：${list}`);
  }

  return pulls[0].number;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  if (!resolveGhBin()) {
    console.error("ERROR: 需要安装 gh 并登录：gh auth login");
    process.exit(1);
  }

  const { owner, repo, slug } = getRemoteInfo();
  const prNumber = resolvePrNumber({
    pr: args.pr,
    branch: args.branch,
    base: args.base,
    owner,
    repo,
  });

  const prInfo = ghJson(
    ["pr", "view", String(prNumber), "--repo", slug],
    "number,title,url,headRefName,baseRefName",
  );
  if (!prInfo) throw new Error(`PR #${prNumber} 不存在`);

  console.log(`REPO: ${slug}`);
  console.log(`PR: #${prNumber}`);
  console.log(`TITLE: ${prInfo.title}`);
  console.log(`BRANCH: ${prInfo.headRefName} → ${prInfo.baseRefName}`);
  console.log(`MERGE_METHOD: ${args.mergeMethod}`);

  if (args.dryRun) {
    console.log("DRY_RUN: true");
    console.log(`WOULD_TRIGGER: ${WORKFLOW_FILE} render_service_test=true render_worker_test=true`);
    process.exit(0);
  }

  gh([
    "pr",
    "merge",
    String(prNumber),
    `--${args.mergeMethod}`,
    "--delete-branch",
    "--repo",
    slug,
  ]);
  console.log(`MERGED_PR: ${prNumber}`);
  console.log(`MERGED_PR_URL: ${prInfo.url}`);

  git(["checkout", args.base]);
  git(["pull", "origin", args.base]);
  console.log(`LOCAL_BRANCH: ${args.base}`);

  gh([
    "workflow",
    "run",
    WORKFLOW_FILE,
    "--repo",
    slug,
    "--ref",
    args.base,
    "-f",
    "render_service_test=true",
    "-f",
    "render_worker_test=true",
  ]);
  console.log("DEPLOY_TRIGGERED: true");

  await sleep(3000);

  const runs = ghJsonList(
    ["run", "list", "--repo", slug, "--workflow", WORKFLOW_FILE, "--limit", "1"],
    "url,status",
  );
  const latest = runs[0];
  if (latest?.url) {
    console.log(`DEPLOY_RUN_URL: ${latest.url}`);
    console.log(`DEPLOY_STATUS: ${latest.status ?? "unknown"}`);
  } else {
    console.log(`DEPLOY_ACTIONS_URL: https://github.com/${slug}/actions/workflows/${WORKFLOW_FILE}`);
  }

  console.log("DEPLOY_TARGETS: TSF Web (Test), TSF Worker (Test)");
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
