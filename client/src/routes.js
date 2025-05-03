import Home from './pages/Home';
import Login from './pages/Login';
import NewWorkflow from './pages/NewWorkflow';
import Workflow from './pages/Workflow';
import Workflows from './pages/Workflows';

const routes = [

  { path: '/home', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/new-workflow', element: <NewWorkflow /> },
  { path: '/', element: <Home /> },
  { path: '/workflow/:workflowId', element: <Workflow /> },
  { path: '/workflows', element: <Workflows /> },


];

export default routes;