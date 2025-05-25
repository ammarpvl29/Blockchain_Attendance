const AttendanceSystem = artifacts.require("AttendanceSystem");

module.exports = async function(callback) {
  try {
    console.log("Starting verification...");
    
    // Get network info
    const networkId = await web3.eth.net.getId();
    const networkType = await web3.eth.net.getNetworkType();
    console.log("Network ID:", networkId);
    console.log("Network Type:", networkType);
    
    // Get deployment info
    const instance = await AttendanceSystem.deployed();
    console.log("Contract deployed at:", instance.address);
    
    // Verify contract has code
    const code = await web3.eth.getCode(instance.address);
    if (code.length > 2) {
      console.log("✅ Contract code verified");
    } else {
      console.log("❌ No contract code found at address");
    }
    
    // Get admin account
    const accounts = await web3.eth.getAccounts();
    console.log("Admin account:", accounts[0]);
    
    // Try to call a contract method
    const teacherCount = await instance.getTeacherCount();
    console.log("Number of teachers:", teacherCount.toString());
    
    console.log("✅ Deployment verified successfully!");
    callback();
  } catch (error) {
    console.error("Verification failed:", error);
    callback(error);
  }
};