require('dotenv').config();

const { extractTopics } = require('./src/services/aiService');

async function runTest() {
    const sampleText = `
        Opera introduced WebAI, a proposed web standard intended to
        help developers run AI models locally in browsers and support
        interoperability across different model architectures.
    `;

    try {
        const topics = await extractTopics(sampleText);

        console.log('Extracted topics:');
        console.log(topics);
    } catch (error) {
        console.error('Topic extraction failed:', error.message);
        process.exitCode = 1;
    }
}

runTest();
