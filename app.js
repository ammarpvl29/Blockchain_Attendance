if (typeof globalThis.ReadableStream === 'undefined') {
    const { ReadableStream } = require('stream/web');
    globalThis.ReadableStream = ReadableStream;
}

const Web3 = require('web3');
const BlockchainService = require('./services/blockchainService');
const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config/config');
const { testConnection } = require('./database/config');

// Import routes
const attendanceRoutes = require('./routes/attendance');

const app = express();
const PORT = config.app.port || 3000;

// Add blockchain service instance
const blockchainService = new BlockchainService();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files
app.use('/static', express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Wait for Ganache function
async function waitForGanache(maxRetries = 5) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const web3 = new Web3('http://127.0.0.1:7545');
            await web3.eth.net.isListening();
            const networkId = await web3.eth.net.getId();
            console.log('✅ Connected to Ganache (Network ID:', networkId, ')');
            return true;
        } catch (error) {
            retries++;
            console.log(`⏳ Waiting for Ganache... (attempt ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    throw new Error('Could not connect to Ganache');
}

// Routes
app.use('/api/attendance', attendanceRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbConnected = await testConnection();
        let blockchainStatus = 'Not initialized';
        
        try {
            const web3 = new Web3('http://127.0.0.1:7545');
            await web3.eth.net.isListening();
            blockchainStatus = 'Connected';
        } catch (error) {
            blockchainStatus = 'Disconnected';
        }

        res.json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: dbConnected ? 'Connected' : 'Disconnected',
            blockchain: blockchainStatus,
            environment: config.app.env
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: error.message
        });
    }
});

// Default route
app.get('/', (req, res) => {
    res.json({
        message: 'Blockchain Attendance System API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            networkInfo: '/api/attendance/network-info',
            addTeacher: 'POST /api/attendance/add-teacher',
            markAttendance: 'POST /api/attendance/mark-attendance',
            getAttendance: 'GET /api/attendance/attendance/:id',
            getRecords: 'GET /api/attendance/records'
        }
    });
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: config.app.env === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// Start server with blockchain initialization
async function startServer() {
    try {
        console.log('Starting Blockchain Attendance System...');
        
        // Wait for Ganache
        console.log('Checking blockchain connection...');
        await waitForGanache();
        
        // Initialize blockchain service
        console.log('Initializing blockchain service...');
        await blockchainService.initialize();
        
        // Test database connection
        console.log('Testing database connection...');
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.warn('⚠️ Warning: Database connection failed');
        }
        
        // Start Express server
        app.listen(PORT, () => {
            console.log('\n=== Blockchain Attendance System ===');
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📊 Environment: ${config.app.env}`);
            console.log(`🗄️  Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
            console.log(`⛓️  Blockchain: Connected (${blockchainService.contract.address})`);
            console.log(`🌐 API available at: http://localhost:${PORT}`);
            console.log('=====================================\n');
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        console.error('Details:', error.message);
        process.exit(1);
    }
}

// Make blockchain service available globally
app.locals.blockchainService = blockchainService;

startServer();

module.exports = app;