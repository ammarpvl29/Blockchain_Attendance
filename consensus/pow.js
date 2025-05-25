const crypto = require('crypto');

class ProofOfWork {
    constructor(difficulty = 4) {
        this.difficulty = difficulty;
        this.target = '0'.repeat(difficulty);
    }

    // Calculate block hash
    calculateHash(block) {
        return crypto
            .createHash('sha256')
            .update(
                block.index + 
                block.previousHash + 
                block.timestamp + 
                JSON.stringify(block.data) + 
                block.nonce
            )
            .digest('hex');
    }

    // Mine block
    mineBlock(block) {
        const startTime = Date.now();
        let hashCount = 0;
        
        // Initialize nonce if not present
        if (block.nonce === undefined) {
            block.nonce = 0;
        }
        
        // Calculate initial hash
        block.hash = this.calculateHash(block);
        
        while (block.hash.substring(0, this.difficulty) !== this.target) {
            block.nonce++;
            block.hash = this.calculateHash(block);
            hashCount++;
        }
        
        const endTime = Date.now();
        const timeTaken = (endTime - startTime) / 1000;
        
        console.log(`Block mined: ${block.hash}`);
        console.log(`Mining took: ${timeTaken}s, Hashes: ${hashCount}`);
        
        return block;
    }

    // Validate block
    validateBlock(block) {
        // Validate block structure
        if (!block || !block.hash || block.nonce === undefined) {
            return false;
        }
        
        return (
            block.hash.substring(0, this.difficulty) === this.target &&
            block.hash === this.calculateHash(block)
        );
    }

    // Adjust difficulty based on mining time
    adjustDifficulty(lastBlock, currentTime) {
        const MINE_RATE = 10000; // 10 seconds target
        const timeTaken = currentTime - lastBlock.timestamp;
        
        if (timeTaken < MINE_RATE) {
            return lastBlock.difficulty + 1;
        } else if (timeTaken > MINE_RATE) {
            return lastBlock.difficulty - 1 > 0 ? lastBlock.difficulty - 1 : 1;
        }
        
        return lastBlock.difficulty;
    }
}

module.exports = ProofOfWork;