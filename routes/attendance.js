const express = require('express');
const router = express.Router();
const BlockchainService = require('../services/blockchainService');

// Initialize blockchain service
const blockchainService = new BlockchainService();
let isInitialized = false;

// Middleware to ensure blockchain is initialized
async function ensureBlockchainInitialized(req, res, next) {
    if (!isInitialized) {
        try {
            await blockchainService.initialize();
            isInitialized = true;
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Failed to initialize blockchain',
                error: error.message
            });
        }
    }
    next();
}

// Get blockchain network information
router.get('/network-info', ensureBlockchainInitialized, async (req, res) => {
    try {
        const networkInfo = await blockchainService.getNetworkInfo();
        res.json({
            success: true,
            data: networkInfo
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get network info',
            error: error.message
        });
    }
});

// Add teacher
router.post('/add-teacher', ensureBlockchainInitialized, async (req, res) => {
    try {
        const { teacherAddress, teacherName } = req.body;
        
        if (!teacherAddress || !teacherName) {
            return res.status(400).json({
                success: false,
                message: 'Teacher address and name are required'
            });
        }

        const result = await blockchainService.addTeacher(teacherAddress, teacherName);
        
        res.json({
            success: true,
            message: 'Teacher added successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to add teacher',
            error: error.message
        });
    }
});

// Mark attendance
router.post('/mark-attendance', ensureBlockchainInitialized, async (req, res) => {
    try {
        const { teacherAddress, studentName, subject, isPresent } = req.body;
        
        if (!teacherAddress || !studentName || !subject || isPresent === undefined) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required: teacherAddress, studentName, subject, isPresent'
            });
        }

        const result = await blockchainService.markAttendance(
            teacherAddress,
            studentName,
            subject,
            Boolean(isPresent)
        );
        
        res.json({
            success: true,
            message: 'Attendance marked successfully',
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to mark attendance',
            error: error.message
        });
    }
});

router.post('/mark-attendance', async (req, res) => {
    try {
        const { teacherAddress, course, class: className, students } = req.body;
        
        if (!teacherAddress || !course || !className || !students) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const blockchainService = req.app.locals.blockchainService;

        // Verify teacher
        const teacherStatus = await blockchainService.verifyTeacher(teacherAddress);
        if (!teacherStatus.exists || !teacherStatus.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Teacher not authorized'
            });
        }

        // Process students in batches
        const batchSize = 5;
        const results = {
            successful: [],
            failed: []
        };

        for (let i = 0; i < students.length; i += batchSize) {
            const batch = students.slice(i, i + batchSize);
            
            // Process batch
            const batchPromises = batch.map(async student => {
                const studentId = `${course}-${className}-${student.number.toString().padStart(2, '0')}`;
                try {
                    const result = await blockchainService.markAttendance(
                        teacherAddress,
                        studentId,
                        course,
                        student.status === 'P'
                    );
                    return {
                        studentId,
                        success: true,
                        ...result
                    };
                } catch (error) {
                    console.error(`Failed to mark attendance for ${studentId}:`, error);
                    return {
                        studentId,
                        success: false,
                        error: error.message
                    };
                }
            });

            const batchResults = await Promise.all(batchPromises);
            
            // Sort results
            batchResults.forEach(result => {
                if (result.success) {
                    results.successful.push(result);
                } else {
                    results.failed.push(result);
                }
            });

            // Small delay between batches
            if (i + batchSize < students.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Return formatted response
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            course,
            class: className,
            summary: {
                total: students.length,
                successful: results.successful.length,
                failed: results.failed.length
            },
            message: `Block #${results.successful[0]?.blockNumber || 'N/A'} has been added to the blockchain!`,
            results: {
                successful: results.successful.map(r => ({ 
                    studentId: r.studentId,
                    transactionHash: r.transactionHash 
                })),
                failed: results.failed.map(r => ({ 
                    studentId: r.studentId,
                    error: r.error 
                }))
            }
        });

    } catch (error) {
        console.error('Error processing attendance:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing attendance',
            error: error.message
        });
    }
});

// Get attendance record
router.get('/attendance/:id', ensureBlockchainInitialized, async (req, res) => {
    try {
        const { id } = req.params;
        const { teacherAddress } = req.query;
        
        if (!teacherAddress) {
            return res.status(400).json({
                success: false,
                message: 'Teacher address is required'
            });
        }

        const attendance = await blockchainService.getAttendance(
            parseInt(id),
            teacherAddress
        );
        
        res.json({
            success: true,
            data: attendance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get attendance record',
            error: error.message
        });
    }
});

// Get attendance records from database (with pagination)
router.get('/records', async (req, res) => {
    try {
        const { page = 1, limit = 10, teacherAddress, studentName, subject } = req.query;
        const offset = (page - 1) * limit;
        
        let query = 'SELECT * FROM attendance_records WHERE 1=1';
        let params = [];
        
        if (teacherAddress) {
            query += ' AND teacher_address = ?';
            params.push(teacherAddress);
        }
        
        if (studentName) {
            query += ' AND student_name LIKE ?';
            params.push(`%${studentName}%`);
        }
        
        if (subject) {
            query += ' AND subject_name LIKE ?';
            params.push(`%${subject}%`);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const connection = await require('../database/config').pool.getConnection();
        const [rows] = await connection.execute(query, params);
        connection.release();
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: rows.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get attendance records',
            error: error.message
        });
    }
});

module.exports = router;