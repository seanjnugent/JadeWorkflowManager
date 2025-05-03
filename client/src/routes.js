import Home from './pages/Home';
import Login from './pages/Login';
import NewWorkflow from './pages/NewWorkflow';
import Workflow from './pages/Workflow';
import Workflows from './pages/Workflows';
import Runs from './pages/Runs'; // Import the new Runs component

const routes = [
  { path: '/', element: <Home /> },
  { path: '/home', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/new-workflow', element: <NewWorkflow /> },
  { path: '/runs', element: <Runs /> }, // Add the new route
  { path: '/workflow/:workflowId', element: <Workflow /> },
  { path: '/workflows', element: <Workflows /> },


];

export default routes;