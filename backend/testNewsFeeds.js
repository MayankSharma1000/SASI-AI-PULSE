const newsSources = require('./src/config/newsSources');

const testFeeds = async () => {
    for (const source of newsSources) {
        try {
            const response = await fetch(source.url, {
                headers: {
                    'User-Agent': 'SASI-AI-Pulse/1.0'
                },
                signal: AbortSignal.timeout(15000)
            });

            const content = await response.text();
            const isXml =
                content.includes('<rss') ||
                content.includes('<feed') ||
                content.includes('<rdf:RDF');
            console.log('\n------------------------------');
            console.log(`Source: ${source.name}`);
            console.log(`HTTP Status: ${response.status}`);
            console.log(`Content-Type: ${response.headers.get('content-type')}`);
            console.log(`XML-like feed: ${isXml}`);
            console.log(`Response length: ${content.length} characters`);

            if (!response.ok) {
                console.log('Issue: HTTP request was unsuccessful.');
            } else if (!isXml) {
                console.log('Issue: Response does not look like a standard RSS/Atom feed.');
            } else {
                console.log('Result: Feed appears accessible.');
            }
        }
        catch (error) {
            console.log('\n------------------------------');
            console.log(`Source: ${source.name}`);
            console.log(`Error: ${error.message}`);
        }
    }
};

testFeeds();
