require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const startScheduler = require('./ingestion/scheduler');
const runIngestion = require('./ingestion/runIngestion');

const healthRoutes = require('./routes/healthRoutes');
const itemRoutes = require('./routes/itemRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const profileRoutes = require('./routes/profileRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:8080'], credentials: true }));
app.use(express.json());
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/profiles', profileRoutes);

app.get('/api/health', (req,res) => {
    res.status(200).json({
        status: "ok",
        service: "SASI AI Pulse"
    });
});

const startServer = async() => {
    try{
        await connectDB();
        startScheduler();
        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    }
    catch(error){
        console.log('Application startup failed: ', error.message);
        process.exit(1);
    };
};
startServer();
