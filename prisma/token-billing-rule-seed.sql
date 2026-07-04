-- TokenBillingRule 种子：翻译任务（feature=translation）
DELETE FROM "TokenBillingRule" WHERE "ruleKey" LIKE 'tsf:translation:%';

INSERT OR IGNORE INTO "TokenBillingRule" (
    "ruleKey",
    "feature",
    "modelKey",
    "displayName",
    "multiplier",
    "baseTokenCost",
    "enabled",
    "createdAt",
    "updatedAt"
) VALUES
    (
        'tsf:translation:_default',
        'translation',
        '_default',
        '翻译 · 默认模型',
        1.5,
        NULL,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    ),
    (
        'tsf:translation:deepseek-chat',
        'translation',
        'deepseek-chat',
        '翻译 · deepseek-chat',
        1.5,
        NULL,
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
