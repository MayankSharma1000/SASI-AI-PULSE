const MODEL = process.env.OPENROUTER_MODEL;
const API_KEY = process.env.OPENROUTER_API_KEY;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestAI = async (messages, maxTokens = 300) => {
    if (!API_KEY || !MODEL) {
        throw new Error('AI service configuration is missing.');
    }

    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const controller = new AbortController();
        const timeout = setTimeout(
            () => controller.abort(),
            30000
        );

        try {
            const response = await fetch(
                'https://openrouter.ai/api/v1/chat/completions',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: MODEL,
                        messages,
                        temperature: 0.2,
                        max_tokens: maxTokens
                    }),
                    signal: controller.signal
                }
            );

            if (!response.ok) {
                const errorBody = await response.text();

                let providerError = {};

                try {
                    providerError = JSON.parse(errorBody);
                } catch {
                    // The provider did not return JSON.
                }

                const providerMessage =
                    providerError.error?.message ||
                    `HTTP ${response.status}`;

                const error = new Error(
                    `AI provider request failed with HTTP ${response.status}: ` +
                    providerMessage
                );

                error.status = response.status;
                error.providerCode = providerError.error?.code;
                error.limitSource =
                    providerError.error?.metadata?.limit_source;
                error.retryAfter = response.headers.get('retry-after');

                console.error('AI provider error:', {
                    status: error.status,
                    message: providerMessage,
                    limitSource: error.limitSource,
                    retryAfter: error.retryAfter
                });

                // A daily free-model quota cannot be fixed by retrying.
                if (
                    error.status === 429 &&
                    (
                        error.limitSource === 'openrouter_free_tier_daily' ||
                        providerMessage.includes('free-models-per-day')
                    )
                ) {
                    error.isQuotaExhausted = true;
                    throw error;
                }

                // Other client errors generally will not improve on retry.
                if (
                    error.status >= 400 &&
                    error.status < 500 &&
                    error.status !== 429
                ) {
                    throw error;
                }

                // Allow the catch block to retry transient HTTP errors.
                error.isRetryable = true;
                throw error;
            }

            const result = await response.json();
            const content = result.choices?.[0]?.message?.content;

            if (typeof content !== 'string' || !content.trim()) {
                throw new Error('AI provider returned empty content.');
            }

            return content.trim();

        }
        catch (error) {
            // Never retry an exhausted daily quota.
            if (error.isQuotaExhausted) {
                console.error(
                    'Daily free-model quota exhausted. ' +
                    'Stopping retries for this request.'
                );
                throw error;
            }

            // Do not retry non-transient HTTP errors.
            if (
                error.status >= 400 &&
                error.status < 500 &&
                error.status !== 429
            ) {
                throw error;
            }

            // Retry temporary HTTP errors, such as 429 or 5xx.
            const shouldRetry =
                error.isRetryable ||
                error.name === 'AbortError' ||
                !error.status;

            if (!shouldRetry || attempt === maxAttempts) {
                if (error.name === 'AbortError') {
                    throw new Error(
                        `AI provider request timed out after ${maxAttempts} attempts.`
                    );
                }

                throw error;
            }

            let delay = 1000 * (2 ** (attempt - 1));

            // Respect Retry-After for temporary rate limits when provided.
            if (error.status === 429 && error.retryAfter) {
                const retryAfterSeconds = Number(error.retryAfter);

                if (
                    Number.isFinite(retryAfterSeconds) &&
                    retryAfterSeconds > 0
                ) {
                    delay = retryAfterSeconds * 1000;
                }
            }

            console.warn(
                `AI request failed: ${error.message}. ` +
                `Retrying (${attempt + 1}/${maxAttempts}) in ` +
                `${Math.ceil(delay / 1000)}s.`
            );

            await sleep(delay);

        } finally {
            clearTimeout(timeout);
        }
    }
    throw new Error('AI provider request failed after all retry attempts.');
};

const summarizeText = async (text) => {
    if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Text to summarize must be a non-empty string.');
    }

    const summary = await requestAI(
        [
            {
                role: 'system',
                content: `You summarize AI research papers and industry news faithfully.

                    Requirements:
                    - Write 2-3 concise sentences, ideally 40-80 words.
                    - Include the main development, method, or finding when supported.
                    - Use only facts explicitly supported by the supplied source.
                    - Never invent names, dates, model versions, statistics, or results.
                    - Never discuss the instructions or explain your reasoning.
                    - If the source is insufficient, return exactly: INSUFFICIENT_SOURCE
                    - Return only the summary or INSUFFICIENT_SOURCE.`.trim()
            },
            {
                role: 'user',
                content: text.trim().slice(0, 15000)
            }
        ],
        300
    );

    const cleaned = summary.replace(/\s+/g, ' ').trim();
    const wordCount = cleaned.split(/\s+/).filter(Boolean).length;

    console.log('DEBUG: Generated summary:', cleaned);
    console.log('DEBUG: Word count:', wordCount);

    const invalidPatterns = [
        /the user gave/i,
        /the user wants/i,
        /we need to summarize/i,
        /let me think/i,
        /chain of thought/i,
        /here is the summary/i,
        /the supplied text/i
    ];

    if (wordCount < 12 || wordCount > 100) {
        throw new Error(
            `AI summary has an invalid word count (${wordCount}; expected 12-100).`
        );
    }

    if (cleaned.length > 1200) {
        throw new Error('AI summary exceeded the maximum length.');
    }

    if (/[,:;]\s*$/.test(cleaned) || !/[.!?]["')\]]?$/.test(cleaned)) {
        throw new Error('AI summary appears incomplete.');
    }

    if (invalidPatterns.some((pattern) => pattern.test(cleaned))) {
        throw new Error('AI returned instructions instead of a summary.');
    }

    return cleaned;
};

const extractTopics = async (text) => {
    if (typeof text !== 'string' || !text.trim()) {
        throw new Error('Text for topic extraction must be non-empty.');
    }

    // requestAI returns the generated text, so capture it here.
    const content = await requestAI(
        [
            {
                role: 'system',
                content:
                    'You are a topic-labeling API. Return only a valid JSON array ' +
                    'of 3 to 7 short, specific topic strings. Do not include ' +
                    'Markdown or explanations. Use only concepts supported by ' +
                    'the supplied text. Avoid generic labels when possible. ' +
                    'Example: ["browser-based AI", "local inference", ' +
                    '"model interoperability"].'
            },
            {
                role: 'user',
                content: text.trim().slice(0, 12000)
            }
        ],
        200
    );

    let topics;

    const cleaned = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();

    try {
        topics = JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('[');
        const end = cleaned.lastIndexOf(']');

        if (start === -1 || end <= start) {
            throw new Error('AI did not return a valid topic array.');
        }

        try {
            topics = JSON.parse(cleaned.slice(start, end + 1));
        } catch {
            throw new Error('AI returned invalid JSON for topics.');
        }
    }

    if (
        !Array.isArray(topics) ||
        topics.length < 1 ||
        topics.some(
            (topic) =>
                typeof topic !== 'string' ||
                !topic.trim() ||
                topic.trim().length > 60
        )
    ) {
        throw new Error('AI returned an invalid topic list.');
    }

    const normalizedTopics = [
        ...new Set(topics.map((topic) => topic.trim().toLowerCase()))
    ].slice(0, 7);

    if (normalizedTopics.length === 0) {
        throw new Error('AI did not return any usable topics.');
    }

    return normalizedTopics;
};

module.exports = { summarizeText, extractTopics };
