const Web3 = require('web3');
const contract = require('@truffle/contract');
const ProofOfWork = require('../consensus/pow');
const { pool } = require('../database/config');

// Import compiled contract
const AttendanceSystemArtifact = require('../build/contracts/AttendanceSystem.json');

class BlockchainService {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.pow = new ProofOfWork(4); // Difficulty level 4
        this.accounts = [];
        this.adminAccount = null;
    }

    async initialize() {
        try {
            // Try to connect multiple times
            let retries = 3;
            while (retries > 0) {
                try {
                    // Connect to local blockchain (Ganache)
                    const provider = new Web3.providers.HttpProvider('http://127.0.0.1:7545');
                    this.web3 = new Web3(provider);
                    
                    // Test connection
                    await this.web3.eth.net.isListening();
                    
                    // Get network details
                    const networkId = await this.web3.eth.net.getId();
                    console.log('Connected to network ID:', networkId);
                    
                    // Get accounts
                    this.accounts = await this.web3.eth.getAccounts();
                    this.adminAccount = this.accounts[0];
                    console.log('Connected to blockchain');
                    console.log('Admin account:', this.adminAccount);
                    
                    // Set up contract
                    const AttendanceContract = contract(AttendanceSystemArtifact);
                    AttendanceContract.setProvider(this.web3.currentProvider);
                    
                    // Check network deployment
                    if (!AttendanceSystemArtifact.networks[networkId]) {
                        throw new Error(`Contract not deployed to network ${networkId}`);
                    }
                    
                    // Get deployed instance using the network-specific address
                    const contractAddress = AttendanceSystemArtifact.networks[networkId].address;
                    this.contract = await AttendanceContract.at(contractAddress);
                    
                    console.log('Contract connected at:', this.contract.address);
                    return true;
                } catch (error) {
                    retries--;
                    if (retries === 0) throw error;
                    console.log(`Connection attempt failed, retrying... (${retries} attempts left)`);
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between retries
                }
            }
        } catch (error) {
            console.error('Blockchain initialization failed:', error);
            throw error;
        }
    }

    // Add teacher to blockchain
    async addTeacher(teacherAddress, teacherName) {
        try {
            const result = await this.contract.addTeacher(
                teacherAddress, 
                teacherName, 
                { from: this.adminAccount, gas: 500000 }
            );
            
            console.log('Teacher added to blockchain:', result.tx);
            
            // Also store in database
            await this.storeTeacherInDB(teacherAddress, teacherName, result.tx);
            
            return {
                success: true,
                transactionHash: result.tx,
                teacherAddress: teacherAddress
            };
        } catch (error) {
            console.error('Error adding teacher:', error);
            throw error;
        }
    }

    async markAttendance(teacherAddress, studentId, subject, isPresent) {
        try {
            // Verify teacher exists and is active
            console.log('Verifying teacher:', teacherAddress);
            const teacher = await this.contract.teachers(teacherAddress);
            if (!teacher.isActive) {
                throw new Error(`Teacher ${teacherAddress} is not active`);
            }

            // Create attendance data
            const attendanceData = {
                teacherAddress,
                studentName: studentId, // Using student ID as name for now
                subject,
                isPresent,
                timestamp: Math.floor(Date.now() / 1000)
            };

            // Mine the block
            console.log('Mining attendance block...');
            const block = await this.mineAttendanceBlock(attendanceData);
            console.log('Block mined successfully!');

            // Record on blockchain
            console.log('Recording attendance on blockchain...');
            const result = await this.contract.methods.markAttendance(
                studentId,
                subject,
                isPresent
            ).send({ 
                from: teacherAddress,
                gas: 500000,
                gasPrice: await this.web3.eth.getGasPrice()
            });

            // Store in database
            const blockchainId = result.events.AttendanceMarked.returnValues.id;
            await this.storeAttendanceInDB(
                blockchainId,
                attendanceData,
                result.transactionHash,
                block
            );

            return {
                success: true,
                transactionHash: result.transactionHash,
                blockchainId,
                blockHash: block.hash,
                nonce: block.nonce,
                blockNumber: result.blockNumber
            };

        } catch (error) {
            console.error('Error in markAttendance:', error);
            throw error;
        }
    }

    async verifyConnection() {
        try {
            // Check web3 connection
            await this.web3.eth.net.isListening();
            
            // Check contract
            const code = await this.web3.eth.getCode(this.contract.address);
            if (code.length <= 2) {
                throw new Error('Contract not found at address');
            }
            
            // Get network ID
            const networkId = await this.web3.eth.net.getId();
            
            return {
                connected: true,
                networkId: networkId,
                contractAddress: this.contract.address
            };
        } catch (error) {
            console.error('Blockchain connection check failed:', error);
            return {
                connected: false,
                error: error.message
            };
        }
    }

    async verifyTeacher(teacherAddress) {
        try {
            const teacher = await this.contract.teachers(teacherAddress);
            return {
                exists: true,
                isActive: teacher.isActive,
                name: teacher.name
            };
        } catch (error) {
            return {
                exists: false,
                isActive: false,
                name: null
            };
        }
    }

    async ensureTeacherExists(teacherAddress, teacherName) {
        try {
            const teacher = await this.verifyTeacher(teacherAddress);
            if (!teacher.exists || !teacher.isActive) {
                console.log('Adding new teacher:', teacherAddress);
                await this.addTeacher(teacherAddress, teacherName);
                return true;
            }
            return teacher.isActive;
        } catch (error) {
            console.error('Error ensuring teacher exists:', error);
            throw error;
        }
    }

    // Mine attendance block using PoW
    async mineAttendanceBlock(attendanceData) {
        const block = {
            index: Date.now(), // Simple index based on timestamp
            timestamp: attendanceData.timestamp,
            data: attendanceData,
            previousHash: '0', // In a real implementation, this would be the previous block hash
            nonce: 0
        };

        console.log('Mining attendance block...');
        const minedBlock = this.pow.mineBlock(block);
        console.log('Block mined successfully!');
        
        return minedBlock;
    }

    // Get attendance record from blockchain
    async getAttendance(attendanceId, teacherAddress) {
        try {
            const attendance = await this.contract.getAttendance(
                attendanceId,
                { from: teacherAddress }
            );

            return {
                timestamp: new Date(attendance.timestamp.toNumber() * 1000),
                student: attendance.student,
                subject: attendance.subject,
                present: attendance.present
            };
        } catch (error) {
            console.error('Error getting attendance:', error);
            throw error;
        }
    }

    async storeTeacherInDB(address, name, txHash) {
        const connection = await pool.getConnection();
        try {
            // Check if teacher exists
            const [rows] = await connection.execute(
                'SELECT * FROM teachers WHERE ethereum_address = ?',
                [address]
            );

            if (rows.length > 0) {
                // Update existing teacher
                await connection.execute(
                    'UPDATE teachers SET name = ?, is_active = ? WHERE ethereum_address = ?',
                    [name, true, address]
                );
                console.log('Teacher record updated in database');
            } else {
                // Insert new teacher
                await connection.execute(
                    'INSERT INTO teachers (ethereum_address, name, is_active) VALUES (?, ?, ?)',
                    [address, name, true]
                );
                console.log('Teacher stored in database');
            }
        } catch (error) {
            console.error('Database operation failed:', error);
            // If it's not a duplicate entry error, throw it
            if (error.code !== 'ER_DUP_ENTRY') {
                throw error;
            } else {
                console.log('Teacher already exists in database');
            }
        } finally {
            connection.release();
        }
    }

    // Store attendance in database
    async storeAttendanceInDB(blockchainId, attendanceData, txHash, block) {
        const connection = await pool.getConnection();
        try {
            await connection.execute(`
                INSERT INTO attendance_records (
                    blockchain_id, 
                    student_name, 
                    subject_name, 
                    teacher_address, 
                    is_present, 
                    blockchain_timestamp,
                    transaction_hash
                ) VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?), ?)
            `, [
                blockchainId,
                attendanceData.studentName,
                attendanceData.subject,
                attendanceData.teacherAddress,
                attendanceData.isPresent,
                attendanceData.timestamp,
                txHash
            ]);
            console.log('Attendance stored in database');
        } catch (error) {
            console.error('Error storing attendance in DB:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get blockchain network info
    async getNetworkInfo() {
        try {
            const networkId = await this.web3.eth.net.getId();
            const blockNumber = await this.web3.eth.getBlockNumber();
            const accounts = await this.web3.eth.getAccounts();
            
            return {
                networkId,
                blockNumber,
                accountsCount: accounts.length,
                contractAddress: this.contract.address
            };
        } catch (error) {
            console.error('Error getting network info:', error);
            throw error;
        }
    }
}

module.exports = BlockchainService;