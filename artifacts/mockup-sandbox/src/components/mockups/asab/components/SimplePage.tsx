export interface SimplePageProps {
  title: string;
  icon: string;
  desc: string;
}

export function SimplePage({ title, icon, desc }: SimplePageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-xl font-bold text-gray-700 mb-2">{title}</h2>
      {desc && <p className="text-gray-400 text-sm">{desc}</p>}
    </div>
  );
}
