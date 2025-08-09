import React, { useState, useEffect } from 'react';
import { Github, Loader2, AlertCircle } from 'lucide-react';
import CustomTooltip from './CustomTooltip';

const GitHubDagLink = ({
  dagPath,
  repoOwner = process.env.REACT_APP_GITHUB_REPO_OWNER || 'seanjnugent',
  repoName = process.env.REACT_APP_GITHUB_REPO_NAME || 'DataWorkflowTool-Workflows',
  setVersionControl,
  branch = 'main',
}) => {
  const [dagInfo, setDagInfo] = useState({
    authorized: false,
    error: null,
    last_updated: null,
    author: null,
    commit_message: null,
    version: null,
  });
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

  const extractJobName = (path) => {
    if (!path) return 'unknown';
    const match = path.match(/workflow_job_(\d+)/);
    if (match) return match[0];
    const segments = [...path.split('.'), ...path.replace(/\\/g, '/').split('/')];
    for (let seg of segments.reverse()) {
      const jobMatch = seg.match(/workflow_job_\d+/);
      if (jobMatch) return jobMatch[0];
    }
    return 'unknown';
  };

  const dagJobName = extractJobName(dagPath);
  const filePath = encodeURIComponent(dagJobName);
  const githubUrl = `https://github.com/${repoOwner}/${repoName}/blob/${branch}/DAGs/${dagJobName}.py`;

  const fetchDagInfo = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) throw new Error('No access token found');

      const response = await fetch(
        `${API_BASE_URL}/workflows/github-dag-info?dag_path=${filePath}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP Error: ${response.status}`);
      }

      const data = await response.json();

      // Handle "no commit history" case
      const isNoHistory = data.message?.includes('no commit history');

      setDagInfo({
        authorized: data.authorized || false,
        last_updated: isNoHistory ? null : data.last_updated,
        author: isNoHistory ? 'N/A' : data.author || 'Unknown',
        commit_message: isNoHistory ? 'No commit history available' : data.commit_message || '',
        version: isNoHistory ? 'N/A' : data.version || '1.0.0',
        error: isNoHistory ? 'DAG file exists, but no commit history available.' : null,
      });

      if (setVersionControl) {
        setVersionControl({
          version: isNoHistory ? 'N/A' : 'v' + (data.version || '1.0.0'),
          lastModified: isNoHistory ? 'N/A' : data.last_updated ? new Date(data.last_updated).toLocaleDateString('en-GB') : 'Unknown',
          modifiedBy: isNoHistory ? 'N/A' : data.author || 'Unknown',
        });
      }
    } catch (error) {
      console.error('Error fetching GitHub DAG info:', error);
      setDagInfo((prev) => ({
        ...prev,
        authorized: false,
        error: error.message || 'Failed to fetch DAG info',
      }));

      if (retryCount < 3 && !error.message.includes('no commit history')) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
        }, delay);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dagPath) {
      fetchDagInfo();
    }
  }, [dagPath, repoOwner, repoName, retryCount]);

  const renderTooltipContent = () => {
    if (loading) {
      return <div className="space-y-1 text-xs">Loading DAG information...</div>;
    }

    if (dagInfo.error) {
      return (
        <div className="space-y-1 text-xs text-red-500">
          <p>{dagInfo.error.includes('no commit history') ? 'No Commit History' : 'Error fetching DAG info'}</p>
          <p>{dagInfo.error}</p>
          {retryCount < 3 && !dagInfo.error.includes('no commit history') && <p>Retrying... ({retryCount + 1}/3)</p>}
        </div>
      );
    }

    if (!dagInfo.authorized) {
      return (
        <div className="space-y-1 text-xs text-yellow-600">
          <p>No access to GitHub repository</p>
          <p>Please check your permissions</p>
        </div>
      );
    }

    return (
      <div className="space-y-1 text-xs">
        <p className="font-semibold">View DAG in GitHub</p>
        <p>Last updated: {dagInfo.last_updated ? new Date(dagInfo.last_updated).toLocaleString('en-GB') : 'N/A'}</p>
        <p>Author: {dagInfo.author}</p>
        <p>Version: {dagInfo.version}</p>
        {dagInfo.commit_message && (
          <p className="max-w-xs truncate">Commit: {dagInfo.commit_message.split('\n')[0]}</p>
        )}
      </div>
    );
  };

  return (
    <CustomTooltip content={renderTooltipContent()}>
      <a
        href={dagInfo.authorized ? githubUrl : '#'}
        target={dagInfo.authorized ? '_blank' : undefined}
        rel={dagInfo.authorized ? 'noopener noreferrer' : undefined}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
          loading
            ? 'text-gray-500 bg-gray-100 border border-gray-200'
            : dagInfo.error && retryCount >= 3 && !dagInfo.error.includes('no commit history')
            ? 'text-red-500 bg-red-50 border border-red-200'
            : !dagInfo.authorized
            ? 'text-gray-500 bg-gray-50 border border-gray-200 cursor-not-allowed'
            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
        }`}
        onClick={(e) => {
          if (!dagInfo.authorized || loading) e.preventDefault();
        }}
        aria-disabled={!dagInfo.authorized || loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : dagInfo.error && retryCount >= 3 && !dagInfo.error.includes('no commit history') ? (
          <>
            <AlertCircle className="h-4 w-4 text-red-500" />
            Connection Failed
          </>
        ) : (
          <>
            <Github className="h-4 w-4" />
            View on GitHub
          </>
        )}
      </a>
    </CustomTooltip>
  );
};

export default GitHubDagLink;