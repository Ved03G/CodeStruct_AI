const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    // Check projects
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, gitUrl: true }
    });
    console.log('Projects:', projects.length);
    projects.forEach(p => console.log(`  ${p.id}: ${p.name || 'Unnamed'} (${p.gitUrl})`));
    
    // Check security issues
    const securityIssues = await prisma.issue.findMany({
      where: {
        issueType: {
          in: ['HardcodedCredentials', 'HardcodedSecrets', 'SensitiveFile', 'UnsafeLogging', 'WeakEncryption', 'HardcodedValues']
        }
      }
    });
    console.log('\nSecurity Issues:', securityIssues.length);
    
    // Check all issues by type
    const allIssues = await prisma.issue.groupBy({
      by: ['issueType'],
      _count: { id: true }
    });
    console.log('\nAll Issues by Type:');
    allIssues.forEach(group => console.log(`  ${group.issueType}: ${group._count.id}`));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();