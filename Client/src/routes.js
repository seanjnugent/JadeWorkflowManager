import About from './pages/About';
import Contact from './pages/Contact';
import Dataset from './pages/Dataset';
import Datasets from './pages/Datasets';
import Help from './pages/Help';
import Home from './pages/Home';
import NewWorkflow from './pages/NewWorkflow';

const routes = [

  { path: '/about', element: <About /> },
  { path: '/contact', element: <Contact /> },
  { path: '/datasets', element: <Datasets /> },
  { path: '/dataset/:id', element: <Dataset /> },
  { path: '/help', element: <Help /> },
  { path: '/home', element: <Home /> },
  { path: '/new-workflow', element: <NewWorkflow /> },
  { path: '/', element: <Home /> },

];

export default routes;