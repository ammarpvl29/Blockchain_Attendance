require('dotenv').config();

module.exports = {
    // Blockchain configuration
    blockchain: {
        networkId: process.env.NETWORK_ID || '5777', // Ganache default
        port: process.env.BLOCKCHAIN_PORT || 7545,
        host: process.env.BLOCKCHAIN_HOST || 'localhost',
        gasLimit: process.env.GAS_LIMIT || 6721975,
        gasPrice: process.env.GAS_PRICE || 20000000000
    },
    
    // Database configuration
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'attendance_system',
        port: process.env.DB_PORT || 3306,
        connectionLimit: 10
    },
    
    // Consensus configuration
    consensus: {
        difficulty: parseInt(process.env.DIFFICULTY) || 4,
        blockTime: parseInt(process.env.BLOCK_TIME) || 15000, // 15 seconds
        mineRate: 10000 // Target mining time
    },
    
    // Application configuration
    app: {
        port: process.env.APP_PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    
    // Security configuration
    security: {
        jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
        bcryptRounds: 10
    }
};