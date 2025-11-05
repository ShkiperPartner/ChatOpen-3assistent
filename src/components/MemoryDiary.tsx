import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, BookOpen, Tag, Clock, TrendingUp, CheckCircle2, Circle, XCircle, Pause, Calendar, AlertCircle } from 'lucide-react';
import { supabase, Fact, Decision } from '../lib/supabase';

type TabType = 'facts' | 'decisions';

export const MemoryDiary: React.FC = () => {
  const { toggleMemoryDiary, settings } = useStore();
  const [activeTab, setActiveTab] = useState<TabType>('facts');
  const [facts, setFacts] = useState<Fact[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('User not authenticated');
        return;
      }

      if (activeTab === 'facts') {
        const { data, error: fetchError } = await supabase
          .from('facts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;
        setFacts(data || []);
      } else {
        const { data, error: fetchError } = await supabase
          .from('decisions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;
        setDecisions(data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getLevelColor = (level: string) => {
    const colors = {
      fact: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      insight: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      pattern: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      hypothesis: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
    };
    return colors[level as keyof typeof colors] || colors.fact;
  };

  const getStatusIcon = (status: string) => {
    const icons = {
      pending: <Circle className="w-4 h-4 text-gray-500" />,
      in_progress: <Clock className="w-4 h-4 text-blue-500" />,
      completed: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      cancelled: <XCircle className="w-4 h-4 text-red-500" />,
      deferred: <Pause className="w-4 h-4 text-orange-500" />
    };
    return icons[status as keyof typeof icons] || icons.pending;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-gray-500 dark:text-gray-400',
      medium: 'text-blue-600 dark:text-blue-400',
      high: 'text-orange-600 dark:text-orange-400',
      urgent: 'text-red-600 dark:text-red-400'
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-green-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Memory Diary 📓
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Facts and decisions from your conversations
              </p>
            </div>
          </div>
          <button
            onClick={toggleMemoryDiary}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('facts')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'facts'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Facts ({facts.length})
          </button>
          <button
            onClick={() => setActiveTab('decisions')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'decisions'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Decisions ({decisions.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 text-red-600">
              <AlertCircle className="w-5 h-5 mr-2" />
              {error}
            </div>
          ) : activeTab === 'facts' ? (
            <div className="space-y-3">
              {facts.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No facts recorded yet
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Facts will be automatically extracted from your conversations
                  </p>
                </div>
              ) : (
                facts.map((fact) => (
                  <div
                    key={fact.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getLevelColor(fact.level)}`}>
                          {fact.level}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {fact.source_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {Math.round(fact.confidence * 100)}%
                        </div>
                        <div className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          {fact.importance}/10
                        </div>
                      </div>
                    </div>

                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {fact.subject}
                    </h3>

                    {fact.value && typeof fact.value === 'object' && (
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        {JSON.stringify(fact.value, null, 2)}
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {fact.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-2">
                      <Clock className="w-3 h-3" />
                      {formatDate(fact.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {decisions.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No decisions recorded yet
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Decisions will be automatically tracked from your conversations
                  </p>
                </div>
              ) : (
                decisions.map((decision) => (
                  <div
                    key={decision.id}
                    className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(decision.status)}
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {decision.decision_type}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${getPriorityColor(decision.priority)}`}>
                        {decision.priority}
                      </span>
                    </div>

                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      {decision.decision_text}
                    </h3>

                    {decision.outcome && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                        Outcome: {decision.outcome}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {decision.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {formatDate(decision.due_date)}
                        </div>
                      )}
                      {decision.completed_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed: {formatDate(decision.completed_at)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {decision.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-2">
                      <Clock className="w-3 h-3" />
                      Created: {formatDate(decision.created_at)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-start gap-2 text-sm">
            <AlertCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-green-700 dark:text-green-300">
              <p className="font-medium mb-1">Memory Diary tracks:</p>
              <ul className="list-disc list-inside space-y-1 text-xs text-green-600 dark:text-green-400">
                <li>Facts learned from conversations (confidence & importance)</li>
                <li>Decisions made during chats (status & priority tracking)</li>
                <li>Automatic extraction and categorization</li>
                <li>Cross-reference between facts and decisions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
