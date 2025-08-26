import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v2 } from '@google-cloud/translate';
import dotenv from 'dotenv'; // 添加 dotenv 支持
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 初始化 Google Cloud Translation 客户端
const { Translate } = v2;
// 优先使用环境变量，如果未设置则抛出错误
const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
if (!apiKey) {
    throw new Error('GOOGLE_CLOUD_API_KEY environment variable is not set.');
}
const translateClient = new Translate({
    key: apiKey,
});

async function getLanguageDirs(sourceDir) {
    try {
        const dirs = await fs.readdir(sourceDir, { withFileTypes: true });
        return dirs
            .filter((dirent) => dirent.isDirectory() && dirent.name !== 'en')
            .map((dirent) => dirent.name);
    } catch (error) {
        console.error('Error reading language directories:', error);
        return [];
    }
}

async function translateFiles(sourceLang, targetLang, sourceDir) {
    const sourcePath = path.join(sourceDir, sourceLang, 'translation.json');
    let sourceData;
    try {
        sourceData = JSON.parse(await fs.readFile(sourcePath, 'utf8'));
    } catch (error) {
        console.error(`Error reading source file ${sourcePath}:`, error);
        return;
    }

    const targetPath = path.join(sourceDir, targetLang, 'translation.json');
    let targetData = {};

    try {
        targetData = JSON.parse(await fs.readFile(targetPath, 'utf8'));
    } catch (e) {
        console.log(`Target file for ${targetLang} not found, creating new.`);
    }

    for (const key in sourceData) {
        if (!targetData[key]) {
            try {
                const [translation] = await translateClient.translate(sourceData[key], {
                    from: sourceLang,
                    to: targetLang,
                });
                targetData[key] = translation;
                console.log(`Translated "${key}" to ${targetLang}: ${translation}`);
            } catch (error) {
                if (error instanceof Error && error.code === 403) {
                    console.error(`Authentication error for "${key}" to ${targetLang}:`, error.message);
                    console.error('Please check your API Key or service account credentials.');
                } else {
                    console.error(`Error translating "${key}" to ${targetLang}:`, error);
                }
            }
        }
    }

    try {
        await fs.writeFile(targetPath, JSON.stringify(targetData, null, 2));
        console.log(`Translation completed for ${targetLang}`);
    } catch (error) {
        console.error(`Error writing target file ${targetPath}:`, error);
    }
}

async function main() {
    const sourceDir = path.join(__dirname, '../public/locales');
    const sourceLang = 'en';
    const targetLangs = await getLanguageDirs(sourceDir);

    if (targetLangs.length === 0) {
        console.log('No target language directories found in public/locales.');
        return;
    }

    console.log(`Found languages: ${targetLangs.join(', ')}`);

    for (const targetLang of targetLangs) {
        await translateFiles(sourceLang, targetLang, sourceDir);
    }
}

main().catch(console.error);