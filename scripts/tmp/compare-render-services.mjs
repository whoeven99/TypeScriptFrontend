import fs from "fs";

const envFile = fs.readFileSync(".env", "utf8");
const token = (
  envFile.match(/^RENDER_API_KEY=(.+)$/m)?.[1] ||
  process.env.RENDER_API_KEY ||
  process.env.RENDER_APIKEY ||
  ""
).trim();
if (!token) {
  console.error("No RENDER_API_KEY");
  process.exit(1);
}

const services = [
  { id: "srv-d93clkdckfvc73c84c3g", label: "new TSF worker" },
  { id: "srv-d8sqas4vikkc73f5nbog", label: "prod Spark worker" },
];

async function renderGet(path) {
  const res = await fetch(`https://api.render.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) return { _error: true, status: res.status, body };
  return body;
}

const SECRET_PATTERNS = /key|secret|token|password|pass|auth|credential|private|api_key|apikey/i;

function maskEnvVars(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const ev = row?.envVar || row;
      const key = ev?.key || "unknown";
      const val = ev?.value;
      const isSecret = ev?.isSecret || SECRET_PATTERNS.test(key);
      return {
        key,
        present: val !== undefined && val !== null && String(val).length > 0,
        isSecret,
        valuePreview: isSecret
          ? "[MASKED]"
          : val === ""
            ? "(empty)"
            : val?.length > 80
              ? `${val.slice(0, 80)}...`
              : val,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

async function fetchService(svc) {
  const [service, envVars, deploys, events] = await Promise.all([
    renderGet(`/services/${svc.id}`),
    renderGet(`/services/${svc.id}/env-vars?limit=100`),
    renderGet(`/services/${svc.id}/deploys?limit=3`),
    renderGet(`/services/${svc.id}/events?limit=5`),
  ]);

  const deployDetails = [];
  if (Array.isArray(deploys)) {
    for (const d of deploys.slice(0, 2)) {
      const deploy = d?.deploy || d;
      const deployId = deploy?.id;
      if (deployId) {
        deployDetails.push(await renderGet(`/services/${svc.id}/deploys/${deployId}`));
      }
    }
  }

  const logsAttempts = {};
  for (const ep of [
    `/services/${svc.id}/logs?limit=20`,
    `/services/${svc.id}/logs`,
  ]) {
    logsAttempts[ep] = await renderGet(ep);
  }

  return {
    label: svc.label,
    id: svc.id,
    service,
    envVars: maskEnvVars(envVars),
    envVarKeys: maskEnvVars(envVars).map((e) => e.key),
    deploys,
    deployDetails,
    events,
    logsAttempts,
  };
}

const results = {};
for (const svc of services) {
  results[svc.id] = await fetchService(svc);
}
console.log(JSON.stringify(results, null, 2));
