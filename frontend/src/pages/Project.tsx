import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import RefactoringView from '../components/RefactoringView';

const Project: React.FC = () => {
  const { projectId } = useParams();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const { data } = await api.get(`/projects/${projectId}`);
        setData(data);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [projectId]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">Not found</div>;

  return (
    <div className="p-6 grid grid-cols-12 gap-4">
      <div className="col-span-3">
        <div className="border rounded p-3 bg-white shadow-sm">
          <div className="font-semibold mb-2">Files</div>
          <ul className="text-sm space-y-1">
            {data.files.map((f: string) => (
              <li key={f} className="truncate">{f}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="col-span-9 space-y-4">
        {data.issues.map((issue: any) => (
          <RefactoringView key={issue.id} issue={issue} />
        ))}
      </div>
    </div>
  );
};

export default Project;
