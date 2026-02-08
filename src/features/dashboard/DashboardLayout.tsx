import { Outlet, useParams } from 'react-router';
import Sidebar from './components/Sidebar';
import MetadataPanel from './components/MetadataPanel';

export default function DashboardLayout() {
  const { projectId } = useParams();
  const hasSelectedProject = projectId !== undefined && projectId !== 'new';

  return (
    <div className="flex h-[calc(100vh-65px)]">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
      {hasSelectedProject && <MetadataPanel projectId={projectId} />}
    </div>
  );
}
