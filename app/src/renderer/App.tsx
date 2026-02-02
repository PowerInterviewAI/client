import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import Providers from './components/providers';
import MainFrame from './components/main-frame';

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
