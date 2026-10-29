const { XMLParser } = require('fast-xml-parser');
const newsSources = require('./src/config/newsSources');

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true
});

const getText = (value) => {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (value && typeof value === 'object') return value['#text'] ?? '';
    return '';
};

const testNewsParser = async () => {
    for (const source of newsSources) {
        try {
            const response = await fetch(source.url, {
                headers: {
                    'User-Agent': 'SASI-AI-Pulse/1.0'
                },
                signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const xml = await response.text();
            const parsed = parser.parse(xml);
            // RSS feeds usually contain channel.item.
            // Atom feeds usually contain feed.entry.
            const entries =
                parsed.rss?.channel?.item ??
                parsed.feed?.entry ??
                parsed['rdf:RDF']?.item ??
                [];
            const articles = Array.isArray(entries)
                ? entries
                : entries
                    ? [entries]
                    : [];
            console.log('\n------------------------------');
            console.log(`Source: ${source.name}`);
            console.log(`Articles found: ${articles.length}`);

            if (articles.length > 0) {
                const first = articles[0];
                const title = getText(first.title);
                const link =
                    typeof first.link === 'string'
                        ? first.link
                        : first.link?.['@_href'] ??
                        first.link?.[0]?.['@_href'] ??
                        '';
                const description = getText(
                    first.description ??
                    first.summary ??
                    first.content
                );
                console.log('First article title:', title);
                console.log('First article link:', link);
                console.log('Raw publication date:',
                    first.pubDate ??
                    first.published ??
                    first.updated ??
                    first['dc:date'] ??
                    'No publication date found'
                );
                console.log(
                    'Description preview:',
                    description.slice(0, 180)
                );
            }

            else {
                console.log('No entries detected. We may need to adjust the parser for this feed.');
            }
        }
        catch (error) {
            console.log('\n------------------------------');
            console.log(`Source: ${source.name}`);
            console.log('Parsing failed:', error.message);
        }
    }
};

testNewsParser();
