import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";

/**
 * v4 翻译内容 Blob 访问（与 worker blobV4 指向同一个容器）。
 * 目前只用于删除任务时清理 `tasks/v4/{shop}/{jobId}` 前缀下的所有 chunk。
 * 未配置 AZURE_BLOB_CONNECTION_STRING 时降级为 no-op（不阻断删除其它数据）。
 */
let _container: ContainerClient | null = null;

function getContainer(): ContainerClient | null {
  if (_container) return _container;
  const conn = process.env.AZURE_BLOB_CONNECTION_STRING?.trim();
  if (!conn) return null;
  const containerName =
    process.env.AZURE_BLOB_TRANSLATION_CONTAINER?.trim() || "translation-content";
  _container = BlobServiceClient.fromConnectionString(conn).getContainerClient(containerName);
  return _container;
}

/** 读取单个 JSON blob；未配置/不存在/解析失败时返回 null。 */
export async function readV4Blob<T = unknown>(path: string): Promise<T | null> {
  if (!path) return null;
  const container = getContainer();
  if (!container) return null;
  try {
    const client = container.getBlockBlobClient(path);
    if (!(await client.exists())) return null;
    const buf = await client.downloadToBuffer();
    return JSON.parse(buf.toString("utf8")) as T;
  } catch (err) {
    console.error(`[blob] 读取失败 ${path}:`, err);
    return null;
  }
}

/** 删除某 blobPrefix 下的所有 blob。返回删除数量；未配置/出错时返回 0（不抛）。 */
export async function deleteV4JobBlobs(blobPrefix: string): Promise<number> {
  if (!blobPrefix) return 0;
  const container = getContainer();
  if (!container) return 0;
  let deleted = 0;
  try {
    const prefix = blobPrefix.endsWith("/") ? blobPrefix : `${blobPrefix}/`;
    for await (const blob of container.listBlobsFlat({ prefix })) {
      try {
        await container.deleteBlob(blob.name, { deleteSnapshots: "include" });
        deleted++;
      } catch (err) {
        console.error(`[blob] 删除失败 ${blob.name}:`, err);
      }
    }
    // 兼容前缀本身就是一个 blob（无尾斜杠）的情况
    try {
      await container.getBlockBlobClient(blobPrefix).deleteIfExists();
    } catch {
      /* ignore */
    }
  } catch (err) {
    console.error(`[blob] 列举/删除前缀失败 ${blobPrefix}:`, err);
  }
  return deleted;
}
