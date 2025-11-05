import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, Brain, Search, Library, Briefcase, BookOpen, TrendingUp, Clock, FileText, AlertCircle } from 'lucide-react';
import { MemorySourceBadge, MemorySourceType } from './MemorySourceBadge';
import { searchMemory } from '../api/memory-service';

interface MemoryResult {
  id: string;
  content: string;
  source: MemorySourceType;
  similarity?: number;
  metadata?: {
    file_name?: string;
    created_at?: string;
    subject?: string;
    level?: string;
    tags?: string[];
  };
}

export const MemoryExplorer: React.FC = () => {
  const { toggleMemoryExplorer, settings, activePersonality } = useStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemoryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<MemorySourceType | 'all'>('all');

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const user = await (async () => {
        const { data: { user } } = await (await import('../lib/supabase')).supabase.auth.getUser();
        return user;
      })();

      if (!user) {
        setError('User not authenticated');
        return;
      }

      // Get current project ID (for now, we'll use null)
      const projectId = null;

      const searchResults = await searchMemory({
        query: query.trim(),
        user_id: user.id,
        personality_id: activePersonality?.id || null,
        project_id: projectId,
        limit: 20
      });

      // Transform results to our format
      const transformedResults: MemoryResult[] = [
        ...searchResults.library.map(r => ({
          id: r.id,
          content: r.content,
          source: 'library' as MemorySourceType,
          similarity: r.similarity,
          metadata: {
            file_name: r.file_name,
            created_at: r.created_at
          }
        })),
        ...searchResults.desk.map(r => ({
          id: r.id,
          content: r.chunk_text,
          source: 'desk' as MemorySourceType,
          similarity: r.similarity,
          metadata: {
            created_at: r.created_at
          }
        })),
        ...searchResults.diary.map(r => ({
          id: r.id,
          content: r.subject,
          source: 'diary' as MemorySourceType,
          metadata: {
            subject: r.subject,
            level: r.level,
            tags: r.tags,
            created_at: r.created_at
          }
        }))
      ];

      // Sort by similarity if available
      transformedResults.sort((a, b) => {
        if (a.similarity && b.similarity) {
          return b.similarity - a.similarity;
        }
        return 0;
      });

      setResults(transformedResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredResults = selectedSource === 'all'
    ? results
    : results.filter(r => r.source === selectedSource);

  const sourceCounts = {
    library: results.filter(r => r.source === 'library').length,
    desk: results.filter(r => r.source === 'desk').length,
    diary: results.filter(r => r.source === 'diary').length
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Memory Explorer 🧠
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Search across all memory sources
              </p>
            </div>
          </div>
          <button
            onClick={toggleMemoryExplorer}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search across library, desk, and diary..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </div>

          {/* Source Filters */}
          {results.length > 0 && (
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">Filter:</span>
              <button
                onClick={() => setSelectedSource('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedSource === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                All ({results.length})
              </button>
              <button
                onClick={() => setSelectedSource('library')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedSource === 'library'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                📚 Library ({sourceCounts.library})
              </button>
              <button
                onClick={() => setSelectedSource('desk')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedSource === 'desk'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                💼 Desk ({sourceCounts.desk})
              </button>
              <button
                onClick={() => setSelectedSource('diary')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedSource === 'diary'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                📓 Diary ({sourceCounts.diary})
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Search Memory Sources
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Enter a query to search across all three memory types:
              </p>
              <div className="flex justify-center gap-4">
                <div className="text-center">
                  <Library className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Library</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Documents</p>
                </div>
                <div className="text-center">
                  <Briefcase className="w-8 h-8 mx-auto text-purple-600 mb-2" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Desk</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Files</p>
                </div>
                <div className="text-center">
                  <BookOpen className="w-8 h-8 mx-auto text-green-600 mb-2" />
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Diary</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Facts</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((result) => (
                <div
                  key={`${result.source}-${result.id}`}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MemorySourceBadge source={result.source} />
                      {result.metadata?.level && (
                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
                          {result.metadata.level}
                        </span>
                      )}
                    </div>
                    {result.similarity !== undefined && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <TrendingUp className="w-3 h-3" />
                        {Math.round(result.similarity * 100)}% match
                      </div>
                    )}
                  </div>

                  {result.metadata?.file_name && (
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <FileText className="w-4 h-4" />
                      {result.metadata.file_name}
                    </div>
                  )}

                  {result.metadata?.subject && (
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                      {result.metadata.subject}
                    </h3>
                  )}

                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 mb-2">
                    {result.content}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {result.metadata?.tags?.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Clock className="w-3 h-3" />
                      {formatDate(result.metadata?.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="text-purple-700 dark:text-purple-300">
              <p className="font-medium mb-1">Memory Explorer uses:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-purple-600 dark:text-purple-400">
                <li>Semantic search with OpenAI embeddings (1536 dimensions)</li>
                <li>Results ranked by relevance across all sources</li>
                <li>Context from Library, Desk, and Diary combined</li>
                <li>Real-time search across vectorized content</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
