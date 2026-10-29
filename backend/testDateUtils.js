const {
    getPublishedDate,
    isWithinLastDays
} = require('./src/utils/dateUtils');

const examples = [
    {
        name: 'RSS date',
        article: {
            pubDate: 'Mon, 26 Oct 2026 22:00:00 GMT'
        }
    },
    {
        name: 'Atom date',
        article: {
            published: '2026-10-27T06:00:00-04:00'
        }
    },
    {
        name: 'Missing date',
        article: {
            title: 'Article without a date'
        }
    },
    {
        name: 'Invalid date',
        article: {
            pubDate: 'not-a-real-date'
        }
    }
];

for (const example of examples) {
    const date = getPublishedDate(example.article);

    console.log(`\n${example.name}`);
    console.log('Normalized date:', date?.toISOString() ?? null);
    console.log('Within 14 days:', isWithinLastDays(date));
}
