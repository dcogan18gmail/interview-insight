import { BrowserRouter, Routes, Route } from 'react-router';
import { Toaster } from 'sonner';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { ProjectsProvider } from '@/contexts/ProjectsContext';
import { TranscriptionProvider } from '@/contexts/TranscriptionContext';
import Layout from './Layout';
import DashboardLayout from '@/features/dashboard/DashboardLayout';
import CenterPanel from '@/features/dashboard/components/CenterPanel';
import SettingsPage from '@/features/settings/SettingsPage';

export default function App() {
  return (
    <SettingsProvider>
      <ProjectsProvider>
        <TranscriptionProvider>
          <BrowserRouter>
            <Toaster position="bottom-right" richColors closeButton />
            <Routes>
              <Route element={<Layout />}>
                <Route element={<DashboardLayout />}>
                  <Route index element={<CenterPanel />} />
                  <Route path="project/:projectId" element={<CenterPanel />} />
                </Route>
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TranscriptionProvider>
      </ProjectsProvider>
    </SettingsProvider>
  );
}
