-- Update teachers table
ALTER TABLE teachers
ADD UNIQUE KEY `unique_ethereum_address` (`ethereum_address`);