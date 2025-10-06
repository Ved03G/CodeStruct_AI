# Security and Hardcoded Values Analysis Features

## Overview

CodeStruct.AI now includes comprehensive security analysis and hardcoded values detection to help identify potential security vulnerabilities and code quality issues in your projects.

## New Features

### 🔒 Security Analysis

The Security Analysis Service detects various security-related issues in your codebase:

#### 1. **Hardcoded Credentials Detection**
- Passwords, API keys, tokens, and secrets in source code
- Database connection strings with embedded credentials
- Authentication tokens and access keys
- **Severity**: Critical
- **Example**: `password = "mySecretPassword123"`

#### 2. **Hardcoded URLs and Endpoints**
- Production URLs, API endpoints, and server addresses
- Database hosts and service endpoints
- **Severity**: Medium to High
- **Example**: `apiUrl = "https://api.production.com/v1"`

#### 3. **Sensitive File Detection**
- Environment files (.env, .env.local, etc.)
- Private keys (.key, .pem, id_rsa)
- Configuration files with sensitive data
- Certificate files and keystores
- **Severity**: Critical to High

#### 4. **Unsafe Logging Practices**
- Logging of passwords, tokens, or API keys
- Sensitive data in console.log statements
- **Severity**: High
- **Example**: `console.log("User password:", userPassword)`

#### 5. **Weak Encryption Detection**
- Usage of deprecated algorithms (MD5, SHA1, DES, RC4)
- Weak random number generation (Math.random())
- **Severity**: Medium to High
- **Example**: `crypto.createHash('md5')`

### 🔍 Advanced Hardcoded Values Analysis

The Hardcoded Values Analyzer provides sophisticated detection of configuration values that should be externalized:

#### 1. **Business Logic Constants**
- Tax rates, interest rates, commission percentages
- Retry counts, timeout values, rate limits
- **Category**: BusinessLogic
- **Example**: `taxRate = 0.08`, `maxRetries = 3`

#### 2. **Infrastructure Configuration**
- Server ports, database hosts, cache settings
- Service URLs and connection parameters
- **Category**: Infrastructure
- **Example**: `port = 3000`, `dbHost = "localhost"`

#### 3. **Application Configuration**
- Default languages, timezones, versions
- Feature flags and debug settings
- **Category**: Configuration
- **Example**: `defaultLanguage = "en"`, `debugMode = true`

#### 4. **Magic Numbers and Technical Constants**
- Significant numeric values in business logic
- Buffer sizes and technical limits
- **Category**: BusinessLogic/Configuration
- **Example**: `pageSize = 25`, `cacheTimeout = 3600`

## Analysis Categories

### Security Issues
- **Critical**: Hardcoded secrets, private keys, credentials
- **High**: Unsafe logging, weak encryption, sensitive files
- **Medium**: Hardcoded URLs, configuration values
- **Low**: General configuration that could be externalized

### Hardcoded Values
- **Configuration**: Settings that should be in config files
- **BusinessLogic**: Business rules that should be configurable
- **Security**: Sensitive values requiring secure storage
- **Infrastructure**: Deployment-specific settings

## API Endpoints

### Get Security Summary
```
GET /api/analysis/security/:projectId
```
Returns a summary of security issues by type and severity.

### Security Analysis Integration
Security analysis is automatically integrated into the standard code analysis flow and appears alongside other code quality issues.

## Frontend Components

### SecurityAnalysisPanel
A comprehensive React component that displays:
- Security issue summary with counts by severity
- Filterable list of security issues by type
- Detailed recommendations for each issue
- Visual indicators for different issue types

## Recommendations

### For Hardcoded Credentials
- Move to environment variables
- Use secure secret management systems (AWS Secrets Manager, Azure Key Vault, HashiCorp Vault)
- Implement proper credential rotation

### For Hardcoded Configuration
- Create configuration files (config.json, .env)
- Use environment-specific configurations
- Implement configuration management systems

### For Infrastructure Settings
- Use deployment-specific configuration
- Implement Infrastructure as Code (IaC)
- Use container orchestration configuration

### For Business Logic Constants
- Create a constants module
- Implement feature flags systems
- Use database-driven configuration for dynamic values

## Best Practices

1. **Never commit secrets**: Use .gitignore for sensitive files
2. **Environment variables**: Use for environment-specific settings
3. **Configuration hierarchy**: Local → Environment → Default
4. **Validation**: Validate configuration values at startup
5. **Documentation**: Document all configuration options
6. **Rotation**: Implement secret rotation where possible

## Integration with Existing Features

The security analysis seamlessly integrates with:
- **Project Analysis**: Security issues appear in project reports
- **CI/CD Pipeline**: Security issues are flagged in pull requests
- **Refactoring Suggestions**: AI-powered recommendations for fixing security issues
- **Issue Tracking**: Security issues are tracked alongside code quality issues

## Configuration

Security analysis can be configured through environment variables:
- `SECURITY_ANALYSIS_ENABLED`: Enable/disable security analysis
- `HARDCODED_VALUES_THRESHOLD`: Sensitivity threshold for hardcoded values detection
- `SECURITY_ISSUE_SEVERITY_FILTER`: Filter issues by minimum severity level

This comprehensive security analysis helps teams identify and remediate security vulnerabilities and improve code quality by ensuring proper separation of configuration from code.