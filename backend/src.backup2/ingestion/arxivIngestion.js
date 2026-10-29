const { XMLParser } = require('fast-xml-parser');
const Item = require('../models/Item');

const ARXIV_API_URL = 'https://export.arxiv.org/api/query';
const MAX_RESULTS = 50;

const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
});

const formatDate = (date) => {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
};

const ingestArxivPapers = async (category) => {
    try {
        // Calculate the date range: the last 14 days.
        const endDate = new Date();
        const startDate = new Date();

        startDate.setDate(startDate.getDate() - 14);

        const startDateFormatted = formatDate(startDate);
        const endDateFormatted = formatDate(endDate);

        // Fetch results in batches until all matching papers are retrieved.
        for (let start = 0; ; start += MAX_RESULTS) {
            const params = {
                search_query:
                    `cat:${category} AND submittedDate:[${startDateFormatted}0000 TO ${endDateFormatted}2359]`,
                start,
                max_results: MAX_RESULTS,
                sortBy: 'submittedDate',
                sortOrder: 'descending'
            };

            const queryParams = new URLSearchParams(params);
            console.log('Actual arXiv query:', queryParams.toString());

            console.log(
                `Requesting ${category} papers starting at ${start}...`
            );

            const response = await fetch(
                `${ARXIV_API_URL}?${queryParams.toString()}`
            );

            if (!response.ok) {
                throw new Error(
                    `arXiv API request failed with status ${response.status}`
                );
            }

            const xml = await response.text();
            const result = parser.parse(xml);
            const entries = result.feed?.entry;

            if (!entries) {
                console.log(`No more papers found for ${category}.`);
                break;
            }

            const papers = Array.isArray(entries)
                ? entries
                : [entries];

            console.log(
                `Fetched ${papers.length} papers from ${category}.`
            );

            // Normalize each paper and save it to MongoDB.
            for (const paper of papers) {
                const arxivId = paper.id.split('/abs/')[1];

                if (!arxivId) {
                    console.warn('Skipping paper with an invalid arXiv ID.');
                    continue;
                }

                const externalId = arxivId.replace(/v\d+$/, '');

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
                    link => link['@_type'] === 'text/html'
                );

                const normalizedPaper = {
                    type: 'paper',
                    source: 'arXiv',
                    externalId,
                    title: paper.title?.trim(),
                    rawText: paper.summary?.trim(),
                    publishedAt: paper.published,
                    authors: authors
                        .map(author => author.name)
                        .filter(Boolean),
                    topicTags: categories
                        .map(category => category['@_term'])
                        .filter(Boolean),
                    url: htmlLink
                        ? htmlLink['@_href']
                        : paper.id
                };

                const saveResult = await Item.updateOne(
                    {
                        source: normalizedPaper.source,
                        externalId: normalizedPaper.externalId
                    },
                    {
                        $set: normalizedPaper,
                        $setOnInsert: {
                            summary: ''
                        }
                    },
                    {
                        upsert: true,
                        runValidators: true
                    }
                );

                if (saveResult.upsertedCount === 1) {
                    console.log(`Inserted ${externalId}`);
                } else if (saveResult.modifiedCount === 1) {
                    console.log(`Updated ${externalId}`);
                } else {
                    console.log(`Unchanged ${externalId}`);
                }
            }

            // A short batch means we've reached the final page.
            if (papers.length < MAX_RESULTS) {
                console.log(`Finished ingestion for ${category}.`);
                break;
            }

            // Wait before making another request to arXiv.
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
    } catch (error) {
        console.error(
            `Error ingesting papers for ${category}:`,
            error.message
        );

        throw error;
    }
};

module.exports = ingestArxivPapers;
