const { SecurityAnalysisService } = require('./dist/analysis/security-analysis.service.js');
const { HardcodedValuesAnalyzer } = require('./dist/analysis/hardcoded-values-analyzer.service.js');
const { PrismaService } = require('./dist/prisma/prisma.service.js');
const fs = require('fs');

async function testSecurityAnalysis() {
    try {
        const prisma = new PrismaService();
        const hardcodedAnalyzer = new HardcodedValuesAnalyzer();
        const securityService = new SecurityAnalysisService(prisma, hardcodedAnalyzer);
        
        // Read our test file
        const testFilePath = './test-security.js';
        const fileContent = fs.readFileSync(testFilePath, 'utf8');
        
        console.log('Testing security analysis on test file...');
        console.log('File content:');
        console.log('='.repeat(50));
        console.log(fileContent);
        console.log('='.repeat(50));
        
        // Test the security analysis - call the method directly with string content
        const issues = await securityService.analyzeSecurityIssues(fileContent, testFilePath, 1);
        
        console.log(`\nFound ${issues.length} security issues:`);
        issues.forEach((issue, index) => {
            console.log(`\n${index + 1}. ${issue.type} (${issue.severity})`);
            console.log(`   Description: ${issue.description}`);
            console.log(`   File: ${issue.filePath}`);
            console.log(`   Line: ${issue.lineStart}`);
            console.log(`   Confidence: ${issue.confidence}%`);
        });
        
        await prisma.$disconnect();
        
    } catch (error) {
        console.error('Error testing security analysis:', error);
    }
}

testSecurityAnalysis();