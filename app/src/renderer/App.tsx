import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import Providers from './components/custom/providers';
import MainFrame from './components/custom/main-frame';

function App() {
  return (
    <Providers>
      <MainFrame>
        <RouterProvider router={router} />
      </MainFrame>
    </Providers>
  );
}

export default App;
