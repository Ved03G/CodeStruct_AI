const axios = require('axios');

async function testSecurityEndpoint() {
    try {
        // First, let's manually add some security issues to the database for testing
        const { PrismaService } = require('./dist/prisma/prisma.service.js');
        const prisma = new PrismaService();
        
        // Add a test security issue to project 1
        await prisma.issue.create({
            data: {
                projectId: 1,
                issueType: 'HardcodedCredentials',
                severity: 'Critical',
                description: 'Hardcoded password detected in configuration file',
                recommendation: 'Use environment variables for sensitive credentials',
                filePath: 'config/database.js',
                lineStart: 15,
                lineEnd: 15,
                confidence: 95,
                codeBlock: 'password: "admin123"'
            }
        });

        await prisma.issue.create({
            data: {
                projectId: 1,
                issueType: 'HardcodedSecrets',
                severity: 'Critical', 
                description: 'AWS access key found in source code',
                recommendation: 'Move AWS credentials to IAM roles or environment variables',
                filePath: 'src/aws-config.js',
                lineStart: 8,
                lineEnd: 8,
                confidence: 90,
                codeBlock: 'aws_access_key: "AKIAIOSFODNN7EXAMPLE"'
            }
        });

        await prisma.issue.create({
            data: {
                projectId: 1,
                issueType: 'SensitiveFile',
                severity: 'High',
                description: 'Environment configuration file detected',
                recommendation: 'Ensure .env files are not committed to version control',
                filePath: '.env',
                lineStart: 1,
                lineEnd: 1,
                confidence: 100,
                codeBlock: ''
            }
        });

        console.log('Added test security issues to database');
        
        // Test the security summary endpoint
        console.log('Testing security summary endpoint...');
        const summaryResponse = await axios.get('http://localhost:3000/api/analysis/security/1', {
            validateStatus: () => true // Accept any status code
        });
        
        console.log('Security Summary Response Status:', summaryResponse.status);
        if (summaryResponse.status === 200) {
            console.log('Security Summary Data:', JSON.stringify(summaryResponse.data, null, 2));
        } else {
            console.log('Security Summary Error:', summaryResponse.data);
        }
        
        await prisma.$disconnect();
        
    } catch (error) {
        console.error('Error testing security endpoint:', error.message);
    }
}

testSecurityEndpoint();