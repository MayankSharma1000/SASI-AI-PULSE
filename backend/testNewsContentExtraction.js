const { XMLParser } = require('fast-xml-parser');

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true
});

const getText = (value) => {
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }
    if (value && typeof value === 'object') {
        return String(value['#text'] ?? '');
    }
    return '';
};

const decodeHtmlEntities = (text) => {
    return text
    .replace(/ /gi, ' ')
    .replace(/&/gi, '&')
    .replace(/"/gi, '”')
    .replace(/'|'/gi, "’")
    .replace(/&#x0*27;/gi, "’")
    .replace(/&#(\d+);/g, (_, code) => {
        try {
            return String.fromCodePoint(Number(code));
        }
        catch {
            return '';
        }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
        try {
            return String.fromCodePoint(parseInt(code, 16));
        }
        catch {
            return '';
        }
    });
};

const cleanHtml = (value) => {
    return decodeHtmlEntities(
        getText(value).replace(/<[^>]*>/g, '')
    )
    .replace(/\s+/g, ' ')
    .trim();
};

const getBestArticleText = (article) => {
    const candidates = [
        article['content:encoded'],
        article.content,
        article.description,
        article.summary
    ];

    const texts = candidates
        .map(value => cleanHtml(value))
        .filter(Boolean);
    return texts.reduce(
        (best, current) =>
            current.length > best.length ? current : best,
        ''
    );
};

const xml = `
<rss>
    <channel>
        <item>
            <title>Example AI Article</title>
            <description>
                A short twelve-word excerpt about an AI announcement and its
                initial capabilities for businesses.
            </description>
            <content:encoded><![CDATA[
                <p>This longer article description provides more context about
                the AI announcement.</p>
                <p>It includes details about the intended application, system
                capabilities, deployment considerations, and limitations.</p>
                <p>These additional paragraphs give the summarization service
                more source material to work with.</p>
            ]]></content:encoded>
        </item>
    </channel>
</rss>
`;

const parsed = parser.parse(xml);
const article = parsed.rss.channel.item;
const selectedText = getBestArticleText(article);

console.log('Title:', article.title);
console.log('Selected source text:', selectedText);
console.log(
    'Word count:',
    selectedText.split(/\s+/).filter(Boolean).length
);

if (!selectedText.includes('deployment considerations')) {
    throw new Error('The richer article content was not selected.');
}

console.log('\nNews content extraction test passed.');
