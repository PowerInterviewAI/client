import Titlebar from './titlebar';
import WindowResizer from './window-resizer';

export default function MainFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex flex-col h-screen">
        <Titlebar />
        <div className="flex-1 flex flex-col overflow-auto">{children}</div>
      </div>
      <WindowResizer />
    </div>
  );
}
