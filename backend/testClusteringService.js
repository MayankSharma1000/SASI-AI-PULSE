const {
    cosineSimilarity,
    findSimilarItems
} = require('./src/services/clusteringService');

const SIMILARITY_THRESHOLDS = {
    news: 0.50,
    paper: 0.75
};

const articleA = {
    type: 'news',
    title: 'OpenAI models are coming to Google Cloud',
    summary: 'Google Cloud will offer OpenAI models to customers.',
    topicTags: ['industry-news']
};

const articleB = {
    type: 'news',
    title: "OpenAI's latest AI models are coming to Google Cloud",
    summary: 'OpenAI models will be available through Google Cloud.',
    topicTags: ['industry-news']
};

const articleC = {
    type: 'news',
    title: 'Nvidia invests in efficient AI hardware',
    summary: 'A company develops chips for machine learning workloads.',
    topicTags: ['industry-news']
};

const paperA = {
    type: 'paper',
    title: 'Benchmarking causal discovery in agentic systems',
    summary: 'We evaluate algorithms for discovering causal relationships.',
    topicTags: ['cs.LG']
};

const paperB = {
    type: 'paper',
    title: 'CNN detection of radio signals in astronomy',
    summary: 'A convolutional neural network detects signals in telescope data.',
    topicTags: ['cs.CV']
};

const runTest = (description, condition) => {
    console.log(`${condition ? 'PASS' : 'FAIL'}: ${description}`);
};

const newsSimilarity = cosineSimilarity(
    articleA.title + ' ' + articleA.summary,
    articleB.title + ' ' + articleB.summary
);

const relatedNewsMatches = findSimilarItems(
    articleA,
    [articleB, articleC],
    SIMILARITY_THRESHOLDS.news
);

const unrelatedPaperMatches = findSimilarItems(
    paperA,
    [paperB],
    SIMILARITY_THRESHOLDS.paper
);

const crossTypeMatches = findSimilarItems(
    articleA,
    [paperA],
    SIMILARITY_THRESHOLDS.news
);

const unrelatedNewsMatches = findSimilarItems(
    articleA,
    [articleC],
    SIMILARITY_THRESHOLDS.news
);

console.log('\n--- Clustering Tests ---\n');

console.log(
    'Related news similarity:',
    newsSimilarity.toFixed(3)
);

runTest(
    'Related news stories match at threshold 0.50',
    relatedNewsMatches.some(match => match.item === articleB)
);

runTest(
    'Unrelated news stories remain separate',
    !unrelatedNewsMatches.some(match => match.item === articleC)
);

runTest(
    'Unrelated research papers remain separate at threshold 0.75',
    unrelatedPaperMatches.length === 0
);

runTest(
    'News and research papers cannot match',
    crossTypeMatches.length === 0
);

console.log('\n--- Test Summary ---');
