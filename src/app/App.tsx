import { BrowserRouter, Routes, Route } from 'react-router';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';
import Layout from './Layout';
import DashboardPage from '@/features/dashboard/DashboardPage';
import ProjectPage from '@/features/project/ProjectPage';
import SettingsPage from '@/features/settings/SettingsPage';

export default function App() {
  return (
    <SettingsProvider>
      <ProjectsProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="project/:projectId" element={<ProjectPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ProjectsProvider>
    </SettingsProvider>
  );
}
