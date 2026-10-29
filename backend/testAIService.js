require('dotenv').config();

const { summarizeText } = require('./src/services/aiService');

const testAIService = async () => {
    const sampleText = `
        Researchers developed a machine learning system to classify
        plant leaf images. They evaluated it on a labeled dataset and
        compared its predictions with a baseline. The results showed
        improved classification accuracy on that dataset.`;

    try {
        console.log('Testing reusable AI summarization service...\n');

        const summary = await summarizeText(sampleText);

        console.log('Generated summary:\n');
        console.log(summary);

        console.log('\nAI service test passed.');
    } catch (error) {
        console.error('AI service test failed:', error.message);
        process.exitCode = 1;
    }
};

testAIService();
