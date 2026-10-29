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
        'llm',
        'llms',
        'chatgpt',
        'openai',
        'anthropic',
        'deepmind',
        'nvidia',
        'transformer model'
    ];

    return aiKeywords.some((keyword) => text.includes(keyword));
};

const examples = [
    {
        title: 'New machine learning model improves image recognition',
        description: 'Researchers present a computer vision technique.'
    },
    {
        title: 'Disney announces a new gaming partnership',
        description: 'The agreement focuses on game licensing.'
    },
    {
        title: 'OpenAI releases a new model',
        description: 'The company introduces a language model.'
    }
];

for (const example of examples) {
    console.log({
        title: example.title,
        relevant: isAiRelevant(example.title, example.description)
    });
}
