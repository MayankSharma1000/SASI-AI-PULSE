const STOP_WORDS = new Set([
    'about', 'after', 'also', 'been', 'from', 'have',
    'into', 'more', 'most', 'that', 'their', 'there',
    'these', 'this', 'those', 'using', 'with', 'your',
    'they', 'them', 'than', 'then', 'will', 'would',
    'could', 'should', 'what', 'when', 'where', 'which',
    'while', 'were', 'were', 'company', 'companies',
    'research', 'assistant', 'artificial', 'intelligence',
    'news', 'latest'
]);
const tokenize = (text = '') =>
    text.toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(word => word.length >= 3 && !STOP_WORDS.has(word));
const rankItems = (items, profile = {}) => {
    const interests = (profile.interests || [])
        .map(topic => topic.toLowerCase().trim())
        .filter(Boolean);
    const likedTopics = (profile.likedTopics || [])
        .map(topic => topic.toLowerCase().trim())
        .filter(Boolean);
    const projectWords = [
        ...new Set(tokenize(profile.projectDescription || ''))
    ];
    const likedItemIds = new Set(
        (profile.likedItems || []).map(id => String(id))
    );

    const dismissedItemIds = new Set(
        (profile.dismissedItems || []).map(id => String(id))
    );

    return items
        .map(item => {
            let relevanceScore = 0;
            const itemId = String(item._id || item.id || '');

            if (likedItemIds.has(itemId)) {
                relevanceScore += 8;
            }

            if (dismissedItemIds.has(itemId)) {
                relevanceScore -= 100;
            }
            const title = (item.title || '').toLowerCase();
            const summary = (item.summary || '').toLowerCase();
            const tags = (item.topicTags || [])
                .map(tag => tag.toLowerCase());
            for (const interest of interests) {
                const GENERIC_TAGS = new Set([
                    'ai',
                    'industry-news',
                    'technology',
                    'news'
                ]);

                if (
                    tags.some(tag =>
                        !GENERIC_TAGS.has(tag) &&
                        (
                            tag === interest ||
                            (
                                tag.length >= 5 &&
                                interest.length >= 5 &&
                                (
                                    tag.includes(interest) ||
                                    interest.includes(tag)
                                )
                            )
                        )
                    )
                ) {
                    relevanceScore += 5;
                }

                if (title.includes(interest)) relevanceScore += 4;
                if (summary.includes(interest)) relevanceScore += 2;
            }
            for (const topic of likedTopics) {
                if (tags.includes(topic)) relevanceScore += 4;
            }
            for (const word of projectWords) {
                if (title.includes(word)) {
                    relevanceScore += 1;
                } else if (summary.includes(word)) {
                    relevanceScore += 0.5;
                }
            }
            const publishedAt = item.publishedAt
                ? new Date(item.publishedAt).getTime()
                : 0;
            const ageInDays = publishedAt > 0
                ? Math.max(0, (Date.now() - publishedAt) / 86400000)
                : 365;
            // Freshness is a small tie-breaker, not the main ranking signal.
            const freshnessScore = Math.max(0, 0.5 - ageInDays * 0.025);
            const rankingScore = relevanceScore + freshnessScore;
            return {
                ...(item.toObject ? item.toObject() : item),
                relevanceScore: Number(relevanceScore.toFixed(2)),
                freshnessScore: Number(freshnessScore.toFixed(2)),
                rankingScore: Number(rankingScore.toFixed(2))
            };
        })
        .sort((a, b) => {
            if (b.rankingScore !== a.rankingScore) {
                return b.rankingScore - a.rankingScore;
            }
            return new Date(b.publishedAt || 0)
                - new Date(a.publishedAt || 0);
        });
};
module.exports = { rankItems };
