export interface EmptyStateProps {
  icon: string;
  title: string;
  desc: string;
}

export function EmptyState({ icon, title, desc }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl mb-4 shadow-sm">{icon}</div>
      <p className="font-bold text-gray-700 mb-1">{title}</p>
      {desc && <p className="text-gray-400 text-sm max-w-xs">{desc}</p>}
    </div>
  );
}
