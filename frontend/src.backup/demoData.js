export const demoPapers = [
  {
    id: 'paper-1',
    type: 'paper',
    title: 'A Survey of Large Language Model Agents',
    source: 'arXiv',
    authors: ['Wen et al.'],
    publishedAt: '2026-10-27T08:30:00.000Z',
    url: 'https://arxiv.org/',
    summary: 'This survey explores how language models can plan, use tools, remember context, and collaborate with other agents. It maps common architectures, practical applications, and the challenges that remain before these systems can be trusted in complex environments.',
    topicTags: ['AI Agents', 'Language Models', 'Multi-Agent Systems'],
    relevanceReason: 'Matches your interest in AI agents and language models.',
    readingMinutes: 12
  },
  {
    id: 'paper-2',
    type: 'paper',
    title: 'Improving Reasoning in Language Models through Self-Reflection',
    source: 'arXiv',
    authors: ['Zhang et al.'],
    publishedAt: '2026-10-26T14:00:00.000Z',
    url: 'https://arxiv.org/',
    summary: 'The authors study a framework in which a model reviews its own intermediate reasoning and revises its answers. The work examines when this approach improves accuracy, where it fails, and how evaluation can distinguish genuine improvements from longer responses.',
    topicTags: ['Reasoning', 'Language Models', 'Evaluation'],
    relevanceReason: 'Related to your interest in language models and evaluation.',
    readingMinutes: 9
  },
  {
    id: 'paper-3',
    type: 'paper',
    title: 'Reliable Evaluation of Retrieval-Augmented Generation',
    source: 'arXiv',
    authors: ['Patel et al.'],
    publishedAt: '2026-10-25T10:15:00.000Z',
    url: 'https://arxiv.org/',
    summary: 'This paper looks at ways to evaluate systems that answer questions using retrieved documents. It separates retrieval quality from answer quality and discusses practical tests for grounding, completeness, and unsupported claims.',
    topicTags: ['RAG', 'Evaluation', 'Trustworthy AI'],
    relevanceReason: 'Useful for building more reliable AI applications.',
    readingMinutes: 8
  }
];

export const demoStories = [
  {
    id: 'story-1',
    type: 'news',
    title: 'AI labs are putting more emphasis on agent reliability',
    source: 'Industry briefing',
    sources: [
      { name: 'Official research blog', url: 'https://openai.com/' },
      { name: 'Technology coverage', url: 'https://techcrunch.com/' },
      { name: 'Research commentary', url: 'https://huggingface.co/blog' }
    ],
    publishedAt: '2026-10-29T07:30:00.000Z',
    url: 'https://openai.com/',
    summary: 'Recent announcements and commentary increasingly focus on whether AI agents can complete multi-step tasks consistently, not just produce impressive single answers. Reliability, tool use, and clear evaluation are becoming central questions for teams building practical AI products.',
    topicTags: ['AI Agents', 'Industry'],
    clusterCount: 3
  },
  {
    id: 'story-2',
    type: 'news',
    title: 'Open research tools make it easier to compare model behaviour',
    source: 'Research & tools',
    sources: [
      { name: 'Hugging Face', url: 'https://huggingface.co/' },
      { name: 'Research updates', url: 'https://arxiv.org/' }
    ],
    publishedAt: '2026-10-28T12:00:00.000Z',
    url: 'https://huggingface.co/',
    summary: 'Open datasets and evaluation tools help researchers compare models under more consistent conditions. The challenge is ensuring that benchmark results reflect useful real-world performance rather than only success on a narrow test set.',
    topicTags: ['Open Source', 'Evaluation'],
    clusterCount: 2
  }
];

export const topics = [
  'Artificial Intelligence', 'Machine Learning', 'AI Agents',
  'Language Models', 'Computer Vision', 'Robotics',
  'AI Safety', 'Natural Language Processing', 'Generative AI',
  'Data Science', 'Multi-Agent Systems', 'RAG'
];
