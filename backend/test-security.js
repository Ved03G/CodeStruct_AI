// Test file to verify security analysis is working
const config = {
    password: "admin123",
    api_key: "sk-1234567890abcdef",
    database_url: "mysql://user:secretpassword@localhost:3306/mydb",
    jwt_secret: "myverysecretjwtkey",
    aws_access_key: "AKIAIOSFODNN7EXAMPLE"
};

// This should trigger unsafe logging
console.log("User password:", config.password);

// This should trigger hardcoded URL detection
const API_ENDPOINT = "https://api.example.com/v1/data";

// This should trigger weak encryption
const crypto = require('crypto');
const weakHash = crypto.createHash('md5').update('data').digest('hex');

module.exports = config;