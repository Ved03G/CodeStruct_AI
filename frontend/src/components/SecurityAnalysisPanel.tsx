import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Eye, Lock, FileText, Code, Zap, Bug } from 'lucide-react';

interface SecuritySummary {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  byType: Record<string, number>;
}

interface RawIssueApiShape {
  id?: number;
  issueType: string; // Backend field
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  description: string;
  recommendation: string;
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  confidence?: number;
}

interface SecurityIssueDisplay extends RawIssueApiShape {
  confidence: number;
  lineStart: number;
}

interface SecurityAnalysisPanelProps {
  projectId: number;
}

const SecurityAnalysisPanel: React.FC<SecurityAnalysisPanelProps> = ({ projectId }) => {
  const [summary, setSummary] = useState<SecuritySummary | null>(null);
  const [issues, setIssues] = useState<SecurityIssueDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    fetchSecurityAnalysis();
  }, [projectId]);

  const fetchSecurityAnalysis = async () => {
    try {
      // Fetch security summary and full project issues (project endpoint already returns all issues)
      const [summaryResponse, projectResponse] = await Promise.all([
        fetch(`/api/analysis/security/${projectId}`),
        fetch(`/api/projects/${projectId}`)
      ]);

      if (summaryResponse.ok) {
        try {
          const summaryData = await summaryResponse.json();
          setSummary(summaryData);
        } catch (e) {
          console.error('Failed to parse security summary', e);
        }
      }

      if (projectResponse.ok) {
        try {
          const projectData = await projectResponse.json();
          const rawIssues: RawIssueApiShape[] = projectData?.issues || [];
          const SECURITY_TYPES = new Set([
            'HardcodedCredentials',
            'HardcodedUrls',
            'HardcodedSecrets',
            'SensitiveFile',
            'UnsafeLogging',
            'WeakEncryption',
            'HardcodedValues'
          ]);
          const secIssues: SecurityIssueDisplay[] = rawIssues
            .filter(i => SECURITY_TYPES.has(i.issueType))
            .map(i => ({
              ...i,
              confidence: i.confidence ?? 70,
              lineStart: i.lineStart ?? 1
            }));
          setIssues(secIssues);
        } catch (e) {
          console.error('Failed to parse project issues', e);
        }
      }
    } catch (error) {
      console.error('Failed to fetch security analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSecurityIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'HardcodedCredentials': <Lock className="w-5 h-5 text-red-500" />,
      'HardcodedSecrets': <Eye className="w-5 h-5 text-red-500" />,
      'HardcodedUrls': <Code className="w-5 h-5 text-yellow-500" />,
      'HardcodedValues': <Code className="w-5 h-5 text-blue-500" />,
      'SensitiveFile': <FileText className="w-5 h-5 text-orange-500" />,
      'UnsafeLogging': <Bug className="w-5 h-5 text-purple-500" />,
      'WeakEncryption': <Zap className="w-5 h-5 text-red-500" />
    };
    return iconMap[type] || <Shield className="w-5 h-5 text-gray-500" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Critical': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'High': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800';
      case 'Medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'Low': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800';
      default: return 'text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700';
    }
  };

  const getTypeDisplayName = (type: string) => {
    const displayNames: Record<string, string> = {
      'HardcodedCredentials': 'Hardcoded Credentials',
      'HardcodedSecrets': 'Hardcoded Secrets',
      'HardcodedUrls': 'Hardcoded URLs',
      'HardcodedValues': 'Hardcoded Values',
      'SensitiveFile': 'Sensitive Files',
      'UnsafeLogging': 'Unsafe Logging',
      'WeakEncryption': 'Weak Encryption'
    };
    return displayNames[type] || type;
  };

  const filteredIssues = selectedType === 'all'
    ? issues
    : issues.filter(issue => issue.issueType === selectedType);

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
        <div className="animate-pulse">
          <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded-xl w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-xl"></div>
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-xl w-5/6"></div>
            <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded-xl w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Summary */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Security Analysis</h2>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800">
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{summary.totalIssues}</div>
              <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Issues</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-red-50 dark:bg-red-900/30">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.criticalIssues}</div>
              <div className="text-sm text-red-600 dark:text-red-400">Critical</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-orange-50 dark:bg-orange-900/30">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.highIssues}</div>
              <div className="text-sm text-orange-600 dark:text-orange-400">High</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-yellow-50 dark:bg-yellow-900/30">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{summary.mediumIssues}</div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">Medium</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{summary.lowIssues}</div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Low</div>
            </div>
          </div>
        )}

        {/* Issue Type Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            All Issues
          </button>
          {summary && Object.entries(summary.byType).map(([type, count]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                selectedType === type
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }`}
            >
              {getSecurityIcon(type)}
              {getTypeDisplayName(type)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Security Issues List */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Security Issues {selectedType !== 'all' && `- ${getTypeDisplayName(selectedType)}`}
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
            {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {filteredIssues.length === 0 ? (
            <div className="p-6 text-center text-neutral-500 dark:text-neutral-400">
              <Shield className="w-12 h-12 mx-auto text-green-500 dark:text-green-400 mb-3" />
              <p>No security issues found for the selected filter.</p>
            </div>
          ) : (
            filteredIssues.map((issue, index) => (
              <div key={index} className="p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {getSecurityIcon(issue.issueType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        Confidence: {issue.confidence}%
                      </span>
                    </div>
                    
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
                      {getTypeDisplayName(issue.issueType)}
                    </h4>
                    
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                      {issue.description}
                    </p>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3 mb-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">Recommendation:</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300">{issue.recommendation}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {issue.filePath}
                      </span>
                      <span>Line {issue.lineStart}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SecurityAnalysisPanel;