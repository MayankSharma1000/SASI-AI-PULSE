const { XMLParser } = require(`fast-xml-parser`);
const url = "https://export.arxiv.org/api/query";
const params={
    search_query: "cat:cs.AI",
    start: 0,
    max_results: 5,
    sortBy: "submittedDate",
    sortOrder: "descending"
}

async function testArxiv(){
    const queryParams = new URLSearchParams(params);
    try{
        const response = await fetch(`${url}?${queryParams.toString()}`);
        if(!response.ok){
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const xml = await response.text();

        const parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: '@_'
        });
        const result = parser.parse(xml);
        const entries = result.feed.entry;
        if(!entries){
            console.log("No papers found.");
            return;
        }

        const papers = Array.isArray(entries) ? entries : [entries];
        const paper = papers[0];

        const arxiv = paper.id.split('/abs/')[1];
        const externalId = arxiv.replace(/v\d+$/, '');

        const authors = paper.author
            ? Array.isArray(paper.author)
                ? paper.author
                : [paper.author]
            : [];

        const categories = paper.category
            ? Array.isArray(paper.category)
                ? paper.category
                : [paper.category]
            : [];

        const links = paper.link
            ? Array.isArray(paper.link)
                ? paper.link
                : [paper.link]
            : [];

        const htmlLink = links.find(
            link => link['@type'] === 'text/html'
        );

        const paperUrl = htmlLink ? htmlLink['@_href'] : paper.id;

        const normalizedPaper ={
            externalId,
            title: paper.title,
            summary: paper.summary,
            publishedAt: paper.published,
            authors: authors.map(author => author.name).filter(Boolean),
            topicTags: categories.map(category => category['@_term']).filter(Boolean),
            url: paperUrl
        }
        console.log(JSON.stringify(normalizedPaper, null, 2));
    }
    catch(error){
        console.error("Retrieval failed!", error.message);
    }
};

testArxiv();
