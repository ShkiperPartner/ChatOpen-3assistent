import React from 'react';
import { Library, Briefcase, BookOpen } from 'lucide-react';

export type MemorySourceType = 'library' | 'desk' | 'diary';

interface MemorySourceBadgeProps {
  source: MemorySourceType;
  count?: number;
  onClick?: () => void;
  className?: string;
}

const SOURCE_CONFIG = {
  library: {
    icon: Library,
    label: 'Library',
    emoji: '📚',
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    hoverColor: 'hover:bg-blue-200 dark:hover:bg-blue-900/50'
  },
  desk: {
    icon: Briefcase,
    label: 'Desk',
    emoji: '💼',
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    hoverColor: 'hover:bg-purple-200 dark:hover:bg-purple-900/50'
  },
  diary: {
    icon: BookOpen,
    label: 'Diary',
    emoji: '📓',
    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    hoverColor: 'hover:bg-green-200 dark:hover:bg-green-900/50'
  }
};

export const MemorySourceBadge: React.FC<MemorySourceBadgeProps> = ({
  source,
  count,
  onClick,
  className = ''
}) => {
  const config = SOURCE_CONFIG[source];
  const Icon = config.icon;

  const baseClasses = `inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} ${className}`;
  const interactiveClasses = onClick ? `cursor-pointer ${config.hoverColor} transition-colors` : '';

  return (
    <span
      className={`${baseClasses} ${interactiveClasses}`}
      onClick={onClick}
      title={`${config.label}${count ? ` (${count} results)` : ''}`}
    >
      <Icon className="w-3 h-3" />
      <span>{config.emoji}</span>
      {count !== undefined && (
        <span className="font-semibold">{count}</span>
      )}
    </span>
  );
};

interface MemorySourcesListProps {
  sources: Array<{
    type: MemorySourceType;
    count: number;
  }>;
  onSourceClick?: (source: MemorySourceType) => void;
  className?: string;
}

export const MemorySourcesList: React.FC<MemorySourcesListProps> = ({
  sources,
  onSourceClick,
  className = ''
}) => {
  if (sources.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span className="text-xs text-gray-500 dark:text-gray-400">
        Memory sources:
      </span>
      {sources.map(({ type, count }) => (
        <MemorySourceBadge
          key={type}
          source={type}
          count={count}
          onClick={onSourceClick ? () => onSourceClick(type) : undefined}
        />
      ))}
    </div>
  );
};
