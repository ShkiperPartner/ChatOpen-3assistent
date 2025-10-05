import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fcsxnsjnetrtcxprcpur.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjc3huc2puZXRydGN4cHJjcHVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMjEyODUsImV4cCI6MjA3NDc5NzI4NX0.MmIqCxAobuvYAYrFHBsQnglOofs1sXtAb4yiOyB9_Rk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createTestData() {
  try {
    console.log('🚀 Создание тестовых данных для MaaS...\n');

    // Шаг 1: Создаём проект
    console.log('📋 Шаг 1: Создание тестового проекта...');
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: 'student-test-user',
        name: 'My First MaaS Project',
        mission: 'Изучить архитектуру MaaS и построить собственный AI ассистент с памятью',
        goals: ['Создать БД структуру', 'Интегрировать с Claude Code', 'Протестировать n8n workflow'],
        is_default: true,
        status: 'active'
      })
      .select()
      .single();

    if (projectError) {
      // Если проект уже существует, получаем его
      if (projectError.code === '23505') {
        console.log('⚠️  Проект уже существует, получаем...');
        const { data: existingProject } = await supabase
          .from('projects')
          .select()
          .eq('user_id', 'student-test-user')
          .single();

        if (!existingProject) throw projectError;

        console.log('✅ Найден проект:', existingProject.id);
        console.log(`   Название: ${existingProject.name}\n`);

        return existingProject.id;
      }
      throw projectError;
    }

    const projectId = project.id;
    console.log('✅ Проект создан:', projectId);
    console.log(`   Название: ${project.name}\n`);

    // Шаг 2: Добавляем факты
    console.log('📊 Шаг 2: Добавление фактов...');
    const { data: facts, error: factsError } = await supabase
      .from('facts')
      .insert([
        {
          project_id: projectId,
          session_id: 'learning-session-1',
          user_id: 'student-test-user',
          subject: 'MaaS Components',
          value: {
            components: ['projects', 'facts', 'decisions', 'links', 'sources', 'metrics', 'snapshots'],
            purpose: 'AI memory management'
          },
          level: 'fact',
          source_type: 'user_stated',
          confidence: 1.0,
          importance: 8
        },
        {
          project_id: projectId,
          session_id: 'learning-session-1',
          user_id: 'student-test-user',
          subject: 'User Learning Goal',
          value: {
            goal: 'Understand MaaS architecture',
            progress: '50%',
            next_step: 'Test with n8n'
          },
          level: 'insight',
          source_type: 'inferred',
          confidence: 0.85,
          importance: 7
        }
      ])
      .select();

    if (factsError) throw factsError;
    console.log(`✅ Создано ${facts.length} фактов\n`);

    // Шаг 3: Добавляем саммари треда
    console.log('📝 Шаг 3: Создание thread summary...');
    const { data: summary, error: summaryError } = await supabase
      .from('thread_summaries')
      .insert({
        project_id: projectId,
        session_id: 'learning-session-1',
        thread_id: 'thread-123',
        summary_text: 'Студент изучает архитектуру MaaS и создал 7 таблиц для хранения памяти AI ассистента. Основные компоненты: facts, decisions, links, sources.',
        summary_type: 'auto',
        message_count: 12,
        token_count: 1500,
        keywords: ['MaaS', 'architecture', 'database', 'AI memory'],
        topics: [
          { topic: 'Database Design', relevance: 0.9 },
          { topic: 'AI Systems', relevance: 0.85 },
          { topic: 'Learning Process', relevance: 0.7 }
        ]
      })
      .select()
      .single();

    if (summaryError) throw summaryError;
    console.log('✅ Thread summary создан\n');

    // Шаг 4: Добавляем решение
    console.log('💡 Шаг 4: Создание решения...');
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .insert({
        project_id: projectId,
        session_id: 'learning-session-1',
        decision_text: 'Использовать Supabase для хранения MaaS данных вместо собственного PostgreSQL',
        decision_type: 'preference',
        status: 'completed',
        priority: 'high',
        outcome: 'Успешно развернута БД в Supabase, все 7 таблиц работают',
        tags: ['database', 'infrastructure']
      })
      .select()
      .single();

    if (decisionError) throw decisionError;
    console.log('✅ Решение создано\n');

    // Шаг 5: Создаём связи между сущностями
    console.log('🔗 Шаг 5: Создание связей...');
    const { data: links, error: linksError } = await supabase
      .from('links')
      .insert([
        {
          project_id: projectId,
          source_type: 'fact',
          source_id: facts[0].id,
          target_type: 'summary',
          target_id: summary.id,
          link_type: 'related_to',
          strength: 0.9
        },
        {
          project_id: projectId,
          source_type: 'decision',
          source_id: decision.id,
          target_type: 'fact',
          target_id: facts[0].id,
          link_type: 'supports',
          strength: 0.85
        }
      ])
      .select();

    if (linksError) throw linksError;
    console.log(`✅ Создано ${links.length} связей\n`);

    // Шаг 6: Добавляем источник
    console.log('📚 Шаг 6: Добавление источника...');
    const { data: source, error: sourceError } = await supabase
      .from('sources')
      .insert({
        project_id: projectId,
        source_type: 'web',
        source_url: 'https://docs.claude.com/en/docs/claude-code',
        source_title: 'Claude Code Documentation',
        source_excerpt: 'Memory as a Service (MaaS) architecture for AI assistants',
        author: 'Anthropic',
        credibility_score: 0.95,
        tags: ['documentation', 'AI', 'MaaS']
      })
      .select()
      .single();

    if (sourceError) throw sourceError;
    console.log('✅ Источник добавлен\n');

    // Шаг 7: Добавляем метрики
    console.log('📈 Шаг 7: Добавление метрик...');
    const { data: metrics, error: metricsError } = await supabase
      .from('maas_metrics')
      .insert([
        {
          project_id: projectId,
          metric_type: 'fact_created',
          metric_value: 2,
          metric_unit: 'count'
        },
        {
          project_id: projectId,
          metric_type: 'summary_generated',
          metric_value: 1,
          metric_unit: 'count'
        }
      ])
      .select();

    if (metricsError) throw metricsError;
    console.log(`✅ Создано ${metrics.length} метрик\n`);

    // Шаг 8: Создаём снапшот
    console.log('💾 Шаг 8: Создание снапшота...');
    const { data: snapshot, error: snapshotError } = await supabase
      .from('snapshot_cache')
      .insert({
        project_id: projectId,
        session_id: 'learning-session-1',
        snapshot_type: 'context',
        snapshot_data: {
          mission: project.mission,
          recent_facts: facts.map(f => f.subject),
          recent_decisions: [decision.decision_text],
          summary: summary.summary_text
        },
        version: 1,
        size_bytes: 512
      })
      .select()
      .single();

    if (snapshotError) throw snapshotError;
    console.log('✅ Снапшот создан\n');

    // Финальная статистика
    console.log('=' .repeat(60));
    console.log('🎉 Тестовые данные успешно созданы!\n');
    console.log('📊 Статистика:');
    console.log(`   • Проект ID: ${projectId}`);
    console.log(`   • Фактов: ${facts.length}`);
    console.log(`   • Саммари: 1`);
    console.log(`   • Решений: 1`);
    console.log(`   • Связей: ${links.length}`);
    console.log(`   • Источников: 1`);
    console.log(`   • Метрик: ${metrics.length}`);
    console.log(`   • Снапшотов: 1\n`);

    console.log('🔍 Проверочные запросы:');
    console.log(`   SELECT * FROM facts WHERE project_id = '${projectId}';`);
    console.log(`   SELECT * FROM links WHERE project_id = '${projectId}';`);
    console.log(`   SELECT * FROM thread_summaries WHERE session_id = 'learning-session-1';\n`);

    return projectId;

  } catch (error) {
    console.error('\n❌ Ошибка создания тестовых данных:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createTestData();
