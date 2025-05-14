import Home from './pages/Home';
import Login from './pages/Login';
import NewWorkflow from './pages/NewWorkflow';
import NewRun from './pages/NewRun';
import Workflow from './pages/Workflow';
import Workflows from './pages/Workflows';
import Runs from './pages/Runs'; // Import the new Runs component
import Run from './pages/Run'; // Import the new Runs component
import Profile from './pages/Profile'; // Import the new Runs component

const routes = [
  { path: '/', element: <Home /> },
  { path: '/home', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/runs', element: <Runs /> }, // Add the new route
  { path: '/runs/run/:runId', element: <Run /> }, // Add the new route
  { path: '/runs/new/:workflowId', element: <NewRun /> },
  { path: '/workflows/new', element: <NewWorkflow /> },
  { path: '/workflows/workflow/:workflowId', element: <Workflow /> },
  { path: '/workflows', element: <Workflows /> },
  { path: '/profile', element: <Profile /> },


];

export default routes;