require('dotenv').config();

const mongoose = require('mongoose');
const Item = require('./src/models/Item');
const { rankItems } = require('./src/services/rankingService');

const profiles = [
    { name: 'Browser AI', interests: ['browser', 'local inference'], projectDescription: 'AI running locally in browsers' },
    { name: 'AI Productivity', interests: ['productivity', 'office', 'AI assistants'], projectDescription: 'AI tools for office productivity' },
    { name: 'Healthcare AI', interests: ['healthcare', 'medical imaging', 'diagnosis'], projectDescription: 'Machine learning for medical diagnosis' },
    { name: 'AI Research', interests: ['machine learning', 'neural networks', 'deep learning'], projectDescription: 'New machine learning research and neural network architectures' },
    { name: 'Robotics', interests: ['robotics', 'autonomous systems'], projectDescription: 'Robots and autonomous intelligent systems' },
    { name: 'AI Safety', interests: ['AI safety', 'alignment', 'security'], projectDescription: 'Safety, alignment and security of artificial intelligence' },
    { name: 'Generative AI', interests: ['generative AI', 'LLM', 'language models'], projectDescription: 'Large language models and generative AI applications' },
    { name: 'Computer Vision', interests: ['computer vision', 'image recognition'], projectDescription: 'Computer vision and image understanding' },
    { name: 'AI Infrastructure', interests: ['infrastructure', 'GPU', 'cloud computing'], projectDescription: 'Computing infrastructure for AI workloads' },
    { name: 'AI Education', interests: ['education', 'learning', 'teaching'], projectDescription: 'Artificial intelligence in education and personalized learning' }
];

function tokens(text = '') {
    return text.toLowerCase().match(/[a-z0-9]+/g) || [];
}

function keywordBaseline(items, profile) {
    const terms = [
        ...(profile.interests || []),
        ...tokens(profile.projectDescription)
    ].map(term => term.toLowerCase()).filter(Boolean);

    return [...items].sort((a, b) => {
        const score = item => {
            const text = `${item.title || ''} ${item.summary || ''} ${(item.topicTags || []).join(' ')}`.toLowerCase();
            return terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
        };
        return score(b) - score(a);
    });
}

function relevant(item, profile) {
    const text = `${item.title || ''} ${item.summary || ''} ${(item.topicTags || []).join(' ')}`.toLowerCase();
    return (profile.interests || []).some(term => {
        const normalized = term.toLowerCase();
        return normalized.length >= 3 && text.includes(normalized);
    });
}

function precisionAt10(ranked, profile) {
    const top = ranked.slice(0, 10);
    if (!top.length) return 0;
    return top.filter(item => relevant(item, profile)).length / 10;
}

function ndcgAt10(ranked, profile) {
    const top = ranked.slice(0, 10);
    const dcg = top.reduce(
        (sum, item, index) =>
            sum + (relevant(item, profile) ? 1 / Math.log2(index + 2) : 0),
        0
    );
    const idealRelevant = Math.min(
        10,
        ranked.filter(item => relevant(item, profile)).length
    );
    const ideal = Array.from(
        { length: idealRelevant },
        (_, index) => 1 / Math.log2(index + 2)
    ).reduce((sum, value) => sum + value, 0);

    return ideal ? dcg / ideal : 0;
}

async function main() {
    if (!process.env.MONGODB_URI) {
        throw new Error('MONGODB_URI is not configured.');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    const items = await Item.find({ type: 'news' })
        .select('-embedding -rawText')
        .lean();

    if (!items.length) {
        throw new Error('No news items found. Run ingestion before evaluation.');
    }

    const results = [];

    for (const profile of profiles) {
        const personalized = rankItems(items, profile);
        const baseline = keywordBaseline(items, profile);

        const p = precisionAt10(personalized, profile);
        const n = ndcgAt10(personalized, profile);
        const bp = precisionAt10(baseline, profile);
        const bn = ndcgAt10(baseline, profile);

        results.push({ name: profile.name, p, n, bp, bn });

        console.log(
            `${profile.name.padEnd(20)} ` +
            `Personalized P@10=${p.toFixed(3)} nDCG@10=${n.toFixed(3)} | ` +
            `Keyword P@10=${bp.toFixed(3)} nDCG@10=${bn.toFixed(3)}`
        );
    }

    const average = key =>
        results.reduce((sum, result) => sum + result[key], 0) / results.length;

    console.log('\n--- AVERAGE ACROSS 10 PROFILES ---');
    console.log(`Personalized Precision@10: ${average('p').toFixed(3)}`);
    console.log(`Personalized nDCG@10:      ${average('n').toFixed(3)}`);
    console.log(`Keyword Precision@10:      ${average('bp').toFixed(3)}`);
    console.log(`Keyword nDCG@10:            ${average('bn').toFixed(3)}`);
    console.log(`News items evaluated:      ${items.length}`);
    console.log('\nNote: relevance labels are heuristic, not human-annotated.');

    await mongoose.disconnect();
}

main().catch(async error => {
    console.error('Ranking evaluation failed:', error.message);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
