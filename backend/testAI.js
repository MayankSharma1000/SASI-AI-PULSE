require('dotenv').config();

const MODEL = process.env.OPENROUTER_MODEL;
const API_KEY = process.env.OPENROUTER_API_KEY;

const testAI = async () => {
    if (!API_KEY || !MODEL) {
        throw new Error(
            'Missing OPENROUTER_API_KEY or OPENROUTER_MODEL in .env'
        );
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 30000);

    try {
        console.log('Connecting to OpenRouter...');
        console.log(`Model: ${MODEL}`);

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
                    messages: [
                        {
                            role: 'system',
                            content:
                                'You summarize research text faithfully. ' +
                                'Use only information supported by the text. ' +
                                'Never invent findings.'
                        },
                        {
                            role: 'user',
                            content:
                                'Summarize this example in two sentences:\n\n' +
                                'Researchers developed a machine learning ' +
                                'system to classify plant leaf images. ' +
                                'They evaluated it on a labeled dataset and ' +
                                'compared its predictions with a baseline. ' +
                                'The results showed improved classification ' +
                                'accuracy on that dataset.'
                        }
                    ],
                    temperature: 0.2,
                    max_tokens: 150
                }),
                signal: controller.signal
            }
        );

        const result = await response.json();

        if (!response.ok) {
            console.error(
                `OpenRouter request failed: HTTP ${response.status}`
            );

            console.error(
                result.error?.message || 'No additional error details'
            );

            return;
        }

        const summary = result.choices?.[0]?.message?.content;

        if (!summary) {
            console.error('The model returned no summary.');
            return;
        }

        console.log('\nAI summary:\n');
        console.log(summary);

        if (result.usage) {
            console.log('\nToken usage:', result.usage);
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('Request timed out after 30 seconds.');
        } else {
            console.error('AI test failed:', error.message);
        }
    } finally {
        clearTimeout(timeout);
    }
};

testAI();
