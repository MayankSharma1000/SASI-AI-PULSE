require('dotenv').config();

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
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

const STOP_WORDS = new Set([
  'about', 'after', 'also', 'been', 'from', 'have', 'into', 'more',
  'most', 'that', 'their', 'there', 'these', 'this', 'those', 'using',
  'with', 'your', 'they', 'them', 'than', 'then', 'will', 'would',
  'could', 'should', 'what', 'when', 'where', 'which', 'while',
  'were', 'company', 'companies', 'research', 'assistant',
  'artificial', 'intelligence', 'news', 'latest'
]);

function tokens(text = '') {
  return text.toLowerCase().split(/[^a-z0-9]+/)
    .filter(word => word.length >= 3 && !STOP_WORDS.has(word));
}

function textFor(item) {
  return [
    item.title || '',
    item.summary || '',
    ...(item.topicTags || [])
  ].join(' ').toLowerCase();
}

function keywordBaseline(items, profile) {
  const keywords = [...new Set([...profile.interests.flatMap(tokens), ...tokens(profile.projectDescription)])];
  return [...items].map(item => {
    const titleWords = new Set(tokens(item.title || ""));
    let score = 0;
    for (const keyword of keywords) {
      if (titleWords.has(keyword)) score += 1;
    }
    return { ...item, baselineScore: score };
  }).sort((a, b) =>
    b.baselineScore - a.baselineScore ||
    new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
  );
}

function csvCell(value) {
  return '"' + String(value ?? '').replace(/"/g, '""') + '"';
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured.');
  }

  const uri = new URL(process.env.MONGODB_URI);
  if (uri.hostname === 'host.docker.internal') {
    uri.hostname = '127.0.0.1';
  }

  await mongoose.connect(uri.toString());

  try {
    const end = new Date();
    const start = new Date(end.getTime() - 7 * 86400000);

    const papers = await Item.find({
      type: 'paper',
      publishedAt: { $gte: start, $lte: end }
    }).select('_id title source publishedAt summary topicTags url')
      .sort({ publishedAt: -1, _id: 1 }).lean();

    if (!papers.length) throw new Error('No papers found in the seven-day window.');

    const outputDir = path.join(__dirname, 'evaluation-results');
    fs.mkdirSync(outputDir, { recursive: true });

    const reviewRows = [];
    const summaryRows = [];

    for (const profile of profiles) {
      const personalized = rankItems(papers, profile).slice(0, 10);
      const baseline = keywordBaseline(papers, profile).slice(0, 10);

      for (const [method, list] of [
        ['personalized', personalized],
        ['keyword_baseline', baseline]
      ]) {
        list.forEach((item, index) => {
          reviewRows.push([
            profile.name,
            method,
            index + 1,
            String(item._id),
            item.title,
            item.source,
            item.publishedAt?.toISOString(),
            item.url,
            (item.topicTags || []).join(';'),
            '', // Fill manually: 1 = relevant, 0 = not relevant
            ''  // Optional reviewer notes
          ]);
        });
      }

      summaryRows.push([profile.name, papers.length, 10, 10]);
    }

    fs.writeFileSync(
      path.join(outputDir, 'paper-ranking-review.csv'),
      [
        ['profile', 'method', 'rank', 'itemId', 'title', 'source',
          'publishedAt', 'url', 'topicTags', 'relevance_label', 'review_notes'],
        ...reviewRows
      ].map(row => row.map(csvCell).join(',')).join('\n') + '\n'
    );

    fs.writeFileSync(
      path.join(outputDir, 'paper-ranking-results.csv'),
      [
        ['profile', 'candidate_papers', 'personalized_top10', 'keyword_baseline_top10'],
        ...summaryRows
      ].map(row => row.map(csvCell).join(',')).join('\n') + '\n'
    );

    console.log('Seven-day paper ranking review dataset generated.');
    console.log(`Papers in window: ${papers.length}`);
    console.log(`Profiles: ${profiles.length}`);
    console.log(`Recommendation rows for review: ${reviewRows.length}`);
    console.log('Files saved under backend/evaluation-results/:');
    console.log('- paper-ranking-review.csv');
    console.log('- paper-ranking-results.csv');
    console.log('');
    console.log('Relevance labels are intentionally blank.');
    console.log('After manual review, enter 1 for relevant and 0 for not relevant.');
    console.log('Do not report Precision@10 or nDCG@10 until labels are reviewed.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(error => {
  console.error('Paper ranking evaluation failed:', error.message);
  process.exitCode = 1;
});
