const getPublishedDate = (article) => {
    const rawDate =
        article.pubDate ??
        article.published ??
        article.updated ??
        article['dc:date'] ?? null;
    if (!rawDate) {
        return null;
    }

    const date = new Date(rawDate);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date;
};

const isWithinLastDays = (date, days = 14) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime()))    return false;

    const now = Date.now();
    const cutoff = now - days * 24 * 60 * 60 * 1000;

    return date.getTime() >= cutoff && date.getTime() <= now;
};

module.exports = {
    getPublishedDate,
    isWithinLastDays
};
