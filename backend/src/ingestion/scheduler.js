const cron = require('node-cron');
const runIngestion = require('./runIngestion');

const startScheduler = () => {
    // Run every day at 2:00 AM in the machine's local timezone.
    const task = cron.schedule(
        '0 2 * * *',
        async () => {
            console.log('Scheduled ingestion triggered.');

            try {
                await runIngestion();
            } catch (error) {
                console.error(
                    'Scheduled ingestion failed:',
                    error.message
                );
            }
        },
        {
            name: 'sasi-ai-pulse-ingestion',
            noOverlap: true
        }
    );

    console.log('Daily ingestion scheduled for 2:00 AM local time.');

    return task;
};

module.exports = startScheduler;
