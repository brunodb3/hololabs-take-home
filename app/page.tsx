import VrmViewer from "./components/vrm_viewer/vrm_viewer";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between">
      <div className="w-full h-screen">
        <h1 className="text-4xl text-primary font-title p-4">
          VRM Face Tracking Demo
        </h1>
        <VrmViewer />
      </div>
    </main>
  );
}
