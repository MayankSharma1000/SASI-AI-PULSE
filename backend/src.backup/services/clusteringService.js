const STOP_WORDS = new Set([
    'about', 'after', 'also', 'been', 'between', 'both',
    'could', 'does', 'each', 'from', 'have', 'into',
    'more', 'most', 'other', 'over', 'same', 'such',
    'than', 'that', 'their', 'them', 'then', 'there',
    'these', 'they', 'this', 'those', 'through', 'under',
    'using', 'very', 'was', 'were', 'what', 'when',
    'where', 'which', 'while', 'with', 'would', 'your',
    'research', 'study', 'approach', 'method', 'methods',
    'model', 'models', 'learning', 'based', 'using',
    'new', 'novel', 'framework', 'system', 'systems',
    'data', 'results', 'analysis', 'towards', 'efficient',
    'improving', 'enhancing', 'benchmark', 'benchmarking',
    'artificial', 'intelligence', 'deep', 'neural',
    'network', 'networks', 'machine', 'task', 'tasks',
    'proposed', 'performance', 'evaluation', 'experiments'
]);

const GENERIC_TAGS = new Set([
    'ai',
    'industry-news',
    'technology',
    'news',
    'artificial intelligence',
    'machine learning'
]);

const tokenize = (text = '') => {
    return text
        .toLowerCase()
        .replace(/https?:\/\/\S+/g, ' ')
        .split(/[^a-z0-9]+/)
        .filter(word =>
            word.length >= 3 &&
            !STOP_WORDS.has(word)
        );
};

const buildVector = text => {
    const vector = new Map();

    for (const token of tokenize(text)) {
        vector.set(token, (vector.get(token) || 0) + 1);
    }

    return vector;
};

const cosineSimilarity = (textA, textB) => {
    const vectorA = buildVector(textA);
    const vectorB = buildVector(textB);

    if (!vectorA.size || !vectorB.size) {
        return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (const value of vectorA.values()) {
        magnitudeA += value * value;
    }

    for (const value of vectorB.values()) {
        magnitudeB += value * value;
    }

    for (const [word, valueA] of vectorA.entries()) {
        dotProduct += valueA * (vectorB.get(word) || 0);
    }

    if (!magnitudeA || !magnitudeB) {
        return 0;
    }

    return dotProduct /
        (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
};

const getItemText = item => {
    const title = item.title || '';
    const summary = item.summary || '';

    const specificTags = (item.topicTags || [])
        .filter(tag =>
            !GENERIC_TAGS.has(String(tag).toLowerCase().trim())
        );

    // Give titles more weight, especially when summaries are unavailable.
    return [
        title,
        title,
        title,
        summary,
        summary,
        ...specificTags
    ].join(' ');
};

const findSimilarItems = (
    candidate,
    existingItems,
    threshold = 0.75
) => {
    return existingItems
        .filter(item => item.type === candidate.type)
        .map(item => ({
            item,
            similarity: cosineSimilarity(
                getItemText(candidate),
                getItemText(item)
            )
        }))
        .filter(result => result.similarity >= threshold)
        .sort((a, b) => b.similarity - a.similarity);
};

module.exports = {
    tokenize,
    cosineSimilarity,
    getItemText,
    findSimilarItems
};
