const { XMLParser } = require('fast-xml-parser');

const Item = require('../models/Item');
const newsSources = require('../config/newsSources');
const { extractTopics } = require('../services/aiService');
const { assignCluster } = require('../services/clusterAssignmentService');
const {
    getPublishedDate,
    isWithinLastDays
} = require('../utils/dateUtils');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true
});

const getText = (value) => {
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }

    if (value && typeof value === 'object') {
        return String(value['#text'] ?? '');
    }

    return '';
};

const getEntries = (parsed) => {
    const entries =
        parsed.rss?.channel?.item ??
        parsed.feed?.entry ??
        parsed['rdf:RDF']?.item ??
        [];

    return Array.isArray(entries) ? entries : entries ? [entries] : [];
};

const getArticleLink = (article) => {
    if (typeof article.link === 'string') {
        return article.link;
    }

    if (Array.isArray(article.link)) {
        const alternate = article.link.find(
            link => link['@_rel'] === 'alternate'
        );

        return alternate?.['@_href'] ??
            article.link[0]?.['@_href'] ??
            '';
    }

    return article.link?.['@_href'] ?? '';
};

const decodeHtmlEntities = (text) => {
    return text
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#039;|&apos;/gi, "'")
        .replace(/&#x0*27;/gi, "'")
        .replace(/&#(\d+);/g, (_, code) => {
            try {
                return String.fromCodePoint(Number(code));
            } catch {
                return '';
            }
        })
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
            try {
                return String.fromCodePoint(parseInt(code, 16));
            } catch {
                return '';
            }
        });
};

const cleanHtml = (value) => {
    return decodeHtmlEntities(
        getText(value)
            .replace(/<[^>]*>/g, ' ')
    )
        .replace(/\s+/g, ' ')
        .trim();
};

const getBestArticleText = (article) => {
    const candidates = [
        article['content:encoded'],
        article.content,
        article.description,
        article.summary
    ];

    const texts = candidates
        .map(value => cleanHtml(value))
        .filter(Boolean);

    if (texts.length === 0) {
        return '';
    }
    // Prefer the richest available feed content.
    return texts.reduce((best, current) =>
        current.length > best.length ? current : best
    );
};

const getArticleImage = (article) => {
    const candidates = [
        article.enclosure?.['@_url'],
        article['media:content']?.['@_url'],
        article['media:thumbnail']?.['@_url'],
        article['itunes:image']?.['@_href'],
        article.image?.['@_url'],
        article.image?.['@_href'],
        article.image,
    ];

    for (const candidate of candidates) {
        const value = typeof candidate === 'string'
            ? candidate
            : candidate?.['@_url'] || candidate?.['@_href'] || '';

        if (!value) continue;

        try {
            const url = new URL(value);

            if (
                (url.protocol === 'https:' || url.protocol === 'http:') &&
                !/\.(mp4|webm|mov|avi|m4v)$/i.test(url.pathname)
            ) {
                return url.href;
            }
        } catch {
            continue;
        }
    }

    const html = [
        getText(article['content:encoded']),
        getText(article.content),
        getText(article.description),
        getText(article.summary)
    ].join(' ');

    const match = html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);

    if (match) {
        try {
            const url = new URL(
                decodeHtmlEntities(match[1]),
                getArticleLink(article)
            );

            if (
                (url.protocol === 'https:' || url.protocol === 'http:') &&
                !/\.(mp4|webm|mov|avi|m4v)$/i.test(url.pathname)
            ) {
                return url.href;
            }
        } catch {
            // Ignore malformed image URLs.
        }
    }

    return '';
};
const MIN_ARTICLE_WORDS = 40;

const countWords = (text = '') =>
    text.trim().split(/\s+/).filter(Boolean).length;

const fetchFullArticleText = async (url) => {
    let parsedUrl;

    try {
        parsedUrl = new URL(url);
    } catch {
        return '';
    }

    // Only fetch public HTTP(S) pages.
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return '';
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(parsedUrl.href, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': 'SASI-AI-Pulse/1.0',
                'Accept': 'text/html,application/xhtml+xml'
            }
        });

        if (!response.ok) {
            console.warn(
                `Article fetch returned HTTP ${response.status}: ${url}`
            );
            return '';
        }

        const contentType = response.headers.get('content-type') || '';

        if (!contentType.includes('text/html') &&
            !contentType.includes('application/xhtml+xml')) {
            return '';
        }

        // Avoid downloading unexpectedly large pages.
        const contentLength = Number(
            response.headers.get('content-length') || 0
        );

        if (contentLength > 3_000_000) {
            console.warn(`Article page too large; skipping: ${url}`);
            return '';
        }

        const html = await response.text();

        if (Buffer.byteLength(html, 'utf8') > 3_000_000) {
            console.warn(`Article page too large; skipping: ${url}`);
            return '';
        }

        const finalUrl = new URL(response.url || parsedUrl.href);

        if (!['http:', 'https:'].includes(finalUrl.protocol)) {
            return '';
        }

        const dom = new JSDOM(html, {
            url: finalUrl.href
        });

        try {
            const article = new Readability(dom.window.document).parse();

            if (!article?.textContent) {
                return '';
            }

            return article.textContent
                .replace(/\s+/g, ' ')
                .trim();
        } finally {
            dom.window.close();
        }
    } catch (error) {
        console.warn(
            `Could not extract article page (${url}): ${error.message}`
        );
        return '';
    } finally {
        clearTimeout(timeout);
    }
};


const isAiRelevant = (title, description) => {
    const text = `${title} ${description}`.toLowerCase();

    const aiKeywords = [
        'artificial intelligence',
        'machine learning',
        'deep learning',
        'large language model',
        'language model',
        'generative ai',
        'computer vision',
        'neural network',
        'robotics',
        'ai model',
        'ai research',
        'ai agent',
        'ai agents',
        'llm',
        'llms',
        'chatgpt',
        'transformer model',
        'text-to-image',
        'text to image',
        'image generation',
        'video generation',
        'speech recognition',
        'natural language processing',
        'reinforcement learning',
        'multimodal ai',
        'inference',
        'model training'
    ];
    return aiKeywords.some(keyword => text.includes(keyword));
};

const normalizeArticle = (article, source) => {
    const title = cleanHtml(article.title);
    const url = getArticleLink(article).trim();

    const rawText = getBestArticleText(article);
    if (rawText.split(/\s+/).filter(Boolean).length < 40) {
        console.log(
            `[Short source] ${title}: ` +
            `${rawText.split(/\s+/).filter(Boolean).length} words`
        );
    }

    if (!title || !url || !isAiRelevant(title, rawText)) {
        return null;
    }

    const publishedAt = getPublishedDate(article);

    if (!publishedAt || !isWithinLastDays(publishedAt, 14)) {
        return null;
    }

    return {
        type: 'news',
        source: source.name,
        externalId: url,
        title,
        url,
        imageUrl: getArticleImage(article),
        publishedAt,
        rawText,
        summary: '',
        authors: [],
        topicTags: ['AI', 'industry-news']
    };
};

const sleep = (ms) =>
    new Promise(resolve => setTimeout(resolve, ms));

const withRetries = async (operation, maxAttempts = 3) => {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            console.error(
                `Operation failed (attempt ${attempt}/${maxAttempts}):`,
                error.message
            );

            if (attempt < maxAttempts) {
                await sleep(500 * attempt);
            }
        }
    }

    throw lastError;
};

const ingestNews = async () => {
    const stats = {
        sources: 0,
        fetched: 0,
        eligible: 0,
        upserted: 0,
        clustered: 0,
        failed: 0
    };

    for (const source of newsSources) {
        stats.sources++;

        try {
            console.log(`Fetching news from ${source.name}...`);

            const response = await withRetries(async () => {
                const controller = new AbortController();
                const timeout = setTimeout(
                    () => controller.abort(),
                    20000
                );

                try {
                    const result = await fetch(source.url, {
                        signal: controller.signal,
                        headers: {
                            'User-Agent': 'SASI-AI-Pulse/1.0'
                        }
                    });

                    if (!result.ok) {
                        throw new Error(
                            `HTTP ${result.status} from ${source.name}`
                        );
                    }

                    return await result.text();
                } finally {
                    clearTimeout(timeout);
                }
            });

            const parsed = parser.parse(response);
            const entries = getEntries(parsed);

            stats.fetched += entries.length;

            for (const entry of entries) {
                let item = normalizeArticle(entry, source);

                if (!item) {
                    continue;
                }

                stats.eligible++;

                const feedWordCount = countWords(item.rawText);

                if (feedWordCount < MIN_ARTICLE_WORDS) {
                    console.log(
                        `[Article fallback] "${item.title}" has only ` +
                        `${feedWordCount} feed words. Fetching article page...`
                    );

                    const fullText = await fetchFullArticleText(item.url);
                    const fullWordCount = countWords(fullText);

                    if (fullWordCount > feedWordCount) {
                        item.rawText = fullText;

                        console.log(
                            `[Article fallback] Extracted ${fullWordCount} words ` +
                            `for "${item.title}".`
                        );
                    } else {
                        console.log(
                            `[Article fallback] No longer article text available ` +
                            `for "${item.title}".`
                        );
                    }
                }

                try {
                    const existingItem = await Item.findOne({
                        source: item.source,
                        externalId: item.externalId
                    }).select('rawText topicTags summary clusterId');

                    let topicTags = item.topicTags;

                    const needsTopicExtraction =
                        !existingItem ||
                        existingItem.rawText !== item.rawText ||
                        !existingItem.topicTags ||
                        existingItem.topicTags.length <= 2;

                    if (needsTopicExtraction) {
                        try {
                            const extractedTopics = await extractTopics(
                                `${item.title}\n${item.rawText || ''}`
                            );

                            topicTags = [
                                ...new Set([
                                    ...topicTags,
                                    ...extractedTopics
                                ])
                            ];

                            console.log(
                                `Topics extracted for "${item.title}":`,
                                extractedTopics
                            );
                        } catch (error) {
                            console.error(
                                `Topic extraction failed for "${item.title}":`,
                                error.message
                            );

                            topicTags = existingItem?.topicTags?.length
                                ? existingItem.topicTags
                                : topicTags;
                        }
                    } else {
                        topicTags = existingItem.topicTags;
                    }

                    const updateFields = {
                        ...item,
                        topicTags
                    };

                    // Preserve existing generated summaries and cluster IDs.
                    const sourceTextChanged =
                        Boolean(existingItem) && existingItem.rawText !== item.rawText;

                    if (existingItem?.summary && !sourceTextChanged) {
                        updateFields.summary = existingItem.summary;
                    }
                    else {
                        updateFields.summary = '';
                    }

                    if (existingItem?.clusterId) {
                        updateFields.clusterId = existingItem.clusterId;
                    }

                    // Retry-safe upsert using the unique source/externalId key.
                    const savedItem = await withRetries(async () => {
                        await Item.updateOne(
                            {
                                source: item.source,
                                externalId: item.externalId
                            },
                            {
                                $set: updateFields
                            },
                            {
                                upsert: true,
                                runValidators: true
                            }
                        );

                        return Item.findOne({
                            source: item.source,
                            externalId: item.externalId
                        });
                    });

                    if (!savedItem) {
                        throw new Error(
                            `Could not retrieve saved item: ${item.externalId}`
                        );
                    }

                    stats.upserted++;

                    // Assign a cluster only when the item is not already assigned.
                    if (!savedItem.clusterId) {
                        await withRetries(
                            () => assignCluster(savedItem._id)
                        );

                        stats.clustered++;
                    }
                } catch (error) {
                    stats.failed++;

                    console.error(
                        `Failed processing "${item.title}":`,
                        error.message
                    );
                }
            }
        } catch (error) {
            stats.failed++;

            console.error(
                `Failed ingesting source "${source.name}":`,
                error.message
            );
        }
    }

    console.log('News ingestion finished:', stats);

    return stats;
};

module.exports = ingestNews;
