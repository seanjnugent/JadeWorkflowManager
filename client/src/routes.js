import Home from './pages/Home';
import Login from './pages/Login';
import Connections from './pages/Connections';
import Contact from './pages/Contact';
import NewWorkflow from './pages/NewWorkflow';
import NewRun from './pages/NewRun';
import NewUser from './pages/NewUser';
import Workflow from './pages/Workflow';
import Workflows from './pages/Workflows';
import EditWorkflow from './pages/EditWorkflow';
import Runs from './pages/Runs';
import Run from './pages/Run';
import Profile from './pages/Profile';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Help from './pages/Help';
import HealthCheck from './pages/HealthCheck';
import ManageUsers from './pages/ManageUsers';
import ManagePermissions from './pages/ManagePermissions';

const routes = [
  { path: '/', element: <Home />, protected: true },
  { path: '/connections', element: <Connections />, protected: true },
  { path: '/contact', element: <Contact />, protected: true },
  { path: '/home', element: <Home />, protected: true },
  { path: '/login', element: <Login />, protected: false },
  { path: '/runs', element: <Runs />, protected: true },
  { path: '/runs/run/:runId', element: <Run />, protected: true },
  { path: '/runs/new/:workflowId', element: <NewRun />, protected: true },
  { path: '/workflows/new', element: <NewWorkflow />, protected: true },
  { path: '/workflows/workflow/:workflowId', element: <Workflow />, protected: true },
  { path: '/workflows/workflow/:workflowId/edit', element: <EditWorkflow />, protected: true },
  { path: '/workflows', element: <Workflows />, protected: true },
  { path: '/profile/:userId', element: <Profile />, protected: true },
  { path: '/analytics', element: <Analytics />, protected: true },
  { path: '/help', element: <Help />, protected: true },
  { path: '/health-check', element: <HealthCheck />, protected: true },
  { path: '/settings', element: <Settings />, protected: true },
  { path: '/manage-users', element: <ManageUsers />, protected: true },
  { path: '/users/new', element: <NewUser />, protected: true },
  { path: '/manage-permissions', element: <ManagePermissions />, protected: true },
];

export default routes;