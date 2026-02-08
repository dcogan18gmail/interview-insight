import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import type {
  ProjectMetadata,
  FileInfo,
} from '@/services/storageService.types';
import {
  initializeStorage,
  getProjects,
  createProject as storageCreateProject,
  saveProject as storageSaveProject,
  deleteProject as storageDeleteProject,
} from '@/services/storageService';

// --- State ---

interface ProjectsState {
  projects: ProjectMetadata[];
  initialized: boolean;
}

const initialState: ProjectsState = {
  projects: [],
  initialized: false,
};

// --- Actions ---

type ProjectsAction =
  | { type: 'PROJECTS_LOADED'; projects: ProjectMetadata[] }
  | { type: 'PROJECT_CREATED'; project: ProjectMetadata }
  | { type: 'PROJECT_UPDATED'; project: ProjectMetadata }
  | { type: 'PROJECT_DELETED'; id: string };

// --- Reducer ---

function projectsReducer(
  state: ProjectsState,
  action: ProjectsAction
): ProjectsState {
  switch (action.type) {
    case 'PROJECTS_LOADED':
      return { ...state, projects: action.projects, initialized: true };
    case 'PROJECT_CREATED':
      return { ...state, projects: [...state.projects, action.project] };
    case 'PROJECT_UPDATED':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.project.id ? action.project : p
        ),
      };
    case 'PROJECT_DELETED':
      return {
        ...state,
        projects: state.projects.filter((p) => p.id !== action.id),
      };
    default:
      return state;
  }
}

// --- Context ---

interface ProjectsContextValue {
  state: ProjectsState;
  dispatch: React.Dispatch<ProjectsAction>;
  createProject: (
    name: string,
    fileInfo: FileInfo
  ) => { project: ProjectMetadata; ok: boolean };
  updateProject: (project: ProjectMetadata) => void;
  removeProject: (id: string) => void;
}

const ProjectsContext = createContext<ProjectsContextValue | undefined>(
  undefined
);

// --- Provider ---

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(projectsReducer, initialState);

  useEffect(() => {
    initializeStorage();
    const projects = getProjects();
    dispatch({ type: 'PROJECTS_LOADED', projects });
  }, []);

  const createProject = useCallback(
    (
      name: string,
      fileInfo: FileInfo
    ): { project: ProjectMetadata; ok: boolean } => {
      const { project, result } = storageCreateProject(name, fileInfo);
      if (result.ok) {
        dispatch({ type: 'PROJECT_CREATED', project });
      }
      return { project, ok: result.ok };
    },
    []
  );

  const updateProject = useCallback((project: ProjectMetadata) => {
    storageSaveProject(project, true);
    dispatch({ type: 'PROJECT_UPDATED', project });
  }, []);

  const removeProject = useCallback((id: string) => {
    storageDeleteProject(id);
    dispatch({ type: 'PROJECT_DELETED', id });
  }, []);

  return (
    <ProjectsContext.Provider
      value={{ state, dispatch, createProject, updateProject, removeProject }}
    >
      {children}
    </ProjectsContext.Provider>
  );
}

// --- Hook ---

export function useProjects(): ProjectsContextValue {
  const context = useContext(ProjectsContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  return context;
}
