import Home from './pages/Home';
import Login from './pages/Login';
import NewWorkflow from './pages/NewWorkflow';

const routes = [

  { path: '/home', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/new-workflow', element: <NewWorkflow /> },
  { path: '/', element: <Home /> },

];

export default routes;