import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase, Database, PersonalityFile, DocumentChunk } from '../lib/supabase';
import { OpenAIService, TokenUsage } from '../lib/openai';
import { AssistantService } from '../lib/assistantService';
import { VectorStoreService } from '../lib/vectorStoreService';
import { IntegrationService } from '../lib/integrationService';
import { MemoryService } from '../api/memory-service';
import { encryption } from '../lib/encryption';

type Chat = Database['public']['Tables']['chats']['Row'] & {
  token_usage?: TokenUsage;
};
type Message = Database['public']['Tables']['messages']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type Personality = Database['public']['Tables']['personalities']['Row'];

interface AppState {
  // Auth
  user: User | null;
  isLoading: boolean;
  
  // Chats
  chats: Chat[];
  currentChatId: string | null;
  messages: Message[];
  totalTokens: number;
  
  // Settings
  settings: UserSettings | null;
  
  // Personalities
  personalities: Personality[];
  activePersonality: Personality | null;

  // Memory Library
  libraryDocuments: DocumentChunk[];

  // UI
  isGenerating: boolean;
  sidebarOpen: boolean;
  showSettings: boolean;
  showPersonalities: boolean;
  showMemoryLibrary: boolean;
  showMemoryDiary: boolean;
  showMemoryExplorer: boolean;
  uploading: boolean;
  error: string | null;
  
  // Services
  openaiService: OpenAIService;
  assistantService: AssistantService;
  vectorStoreService: VectorStoreService;
  integrationService: IntegrationService;
  memoryService: MemoryService;
  
  // Actions
  setUser: (user: User | null) => void;
  loadChats: () => Promise<void>;
  createChat: () => Promise<string>;
  selectChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  toggleSidebar: () => void;
  toggleSettings: () => void;
  togglePersonalities: () => void;
  toggleMemoryLibrary: () => void;
  toggleMemoryDiary: () => void;
  toggleMemoryExplorer: () => void;
  loadPersonalities: () => Promise<void>;
  createPersonality: (name: string, prompt: string, hasMemory?: boolean) => Promise<Personality | null>;
  updatePersonality: (id: string, updates: Partial<Personality>) => Promise<void>;
  deletePersonality: (id: string) => Promise<void>;
  setActivePersonality: (id: string) => Promise<void>;
  uploadPersonalityFile: (personalityId: string, file: File) => Promise<PersonalityFile>;
  deletePersonalityFile: (personalityId: string, fileId: string) => Promise<void>;
  loadLibraryDocuments: () => Promise<void>;
  uploadDocumentToLibrary: (file: File, isPublic: boolean, projectId?: string) => Promise<DocumentChunk>;
  deleteLibraryDocument: (id: string) => Promise<void>;
  setIsGenerating: (generating: boolean) => void;
  
  // Helper methods (private-like)
  _handleChatCompletionsAPI: (chatId: string, content: string, activePersonality: Personality | null, messages: Message[], settings: UserSettings) => Promise<{ response: string; usage: any }>;
  _handleAssistantsAPIMessage: (chatId: string, content: string, personality: Personality) => Promise<string>;

  // Facts management (for Function Calling)
  _saveFact: (projectId: string, chatId: string, subject: string, value: any, confidence?: number, importance?: number, tags?: string[]) => Promise<{ success: boolean; message: string; factId?: string }>;
  _updateFact: (factId: string, updates: { subject?: string; value?: any; confidence?: number; importance?: number; tags?: string[] }) => Promise<{ success: boolean; message: string }>;
  _deleteFact: (factId: string) => Promise<{ success: boolean; message: string }>;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isLoading: true,
  chats: [],
  currentChatId: null,
  messages: [],
  totalTokens: 0,
  settings: null,
  personalities: [],
  activePersonality: null,
  libraryDocuments: [],
  isGenerating: false,
  sidebarOpen: true,
  showSettings: false,
  showPersonalities: false,
  showMemoryLibrary: false,
  showMemoryDiary: false,
  showMemoryExplorer: false,
  uploading: false,
  error: null,
  openaiService: new OpenAIService(),
  assistantService: new AssistantService(),
  vectorStoreService: new VectorStoreService(),
  integrationService: new IntegrationService(),
  memoryService: new MemoryService(),

  // Actions
  setUser: (user) => {
    set({ user });
    if (user) {
      get().loadChats();
      get().loadSettings();
      get().loadPersonalities();
    } else {
      set({ chats: [], currentChatId: null, messages: [], settings: null, personalities: [], activePersonality: null });
    }
  },

  loadChats: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      set({ chats: data });
    }
  },

  createChat: async () => {
    const { user } = get();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chats')
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        title: 'New Chat'
      })
      .select()
      .single();

    if (error) throw error;

    set(state => ({ chats: [data, ...state.chats] }));
    return data.id;
  },

  selectChat: async (chatId) => {
    set({ currentChatId: chatId });

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      set({ messages: data });
    }
  },

  deleteChat: async (chatId) => {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (!error) {
      set(state => ({
        chats: state.chats.filter(chat => chat.id !== chatId),
        currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
        messages: state.currentChatId === chatId ? [] : state.messages
      }));
    }
  },

  updateChatTitle: async (chatId, title) => {
    const { error } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId);

    if (!error) {
      set(state => ({
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, title } : chat
        )
      }));
    }
  },

  sendMessage: async (content) => {
    // Prevent double execution
    if (get().isGenerating) {
      console.log('Message already in progress, skipping...');
      return;
    }
    
    const { user, currentChatId, settings, openaiService, messages, activePersonality } = get();
    if (!user || !settings?.openai_api_key) {
      console.error('Missing user or API key');
      return;
    }

    let chatId = currentChatId;
    
    // Create new chat if none selected
    if (!chatId) {
      chatId = await get().createChat();
      set({ currentChatId: chatId });
    }

    set({ isGenerating: true });

    try {
      openaiService.setApiKey(settings.openai_api_key.trim());

      // Add user message to UI
      const userMessage: Message = {
        id: crypto.randomUUID(),
        chat_id: chatId,
        role: 'user',
        content,
        created_at: new Date().toISOString()
      };

      set(state => ({ messages: [...state.messages, userMessage] }));

      // Save user message to DB
      await supabase.from('messages').insert({
        chat_id: chatId,
        role: 'user',
        content
      });

      // === MEMORY SERVICE: Enrich context with unified memory ===
      let enrichedContent = content;
      try {
        const { memoryService } = get();

        // Search memory if service is initialized
        if (memoryService) {
          console.log('🧠 Searching unified memory...');

          const memoryResults = await memoryService.searchMemory({
            query: content,
            user_id: user.id,
            personality_id: activePersonality?.id,
            limit: 5,
            similarity_threshold: 0.6
          });

          // Build enriched context if results found
          if (memoryResults.results.length > 0) {
            console.log(`✅ Found ${memoryResults.total_results} memory results`);

            const contextParts = ['[Relevant context from memory:]'];

            memoryResults.results.forEach(result => {
              const sourceEmoji = result.source === 'library' ? '📚' :
                                 result.source === 'desk' ? '💼' : '📓';
              contextParts.push(`\n${sourceEmoji} ${result.source.toUpperCase()}: ${result.content.substring(0, 300)}`);
            });

            // Prepend memory context to user message
            enrichedContent = `${contextParts.join('\n')}\n\n[User Question]: ${content}`;

            console.log('🚀 Context enriched with memory');
          } else {
            console.log('ℹ️ No relevant memory found');
          }
        }
      } catch (memoryError) {
        console.warn('Memory search failed (non-critical):', memoryError);
        // Continue with original content if memory search fails
      }

      // Check if we should use Assistants API (when personality has files and OpenAI assistant)
      const shouldUseAssistantsAPI = activePersonality?.files &&
        activePersonality.files.length > 0 &&
        activePersonality.openai_assistant_id;

      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        chat_id: chatId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      };

      set(state => ({ messages: [...state.messages, assistantMessage] }));

      let assistantResponse = '';
      let tokenUsage = null;

      if (shouldUseAssistantsAPI) {
        console.log('Using Assistants API for chat with files');
        // Use Assistants API for personalities with files
        assistantResponse = await get()._handleAssistantsAPIMessage(chatId, enrichedContent, activePersonality!);
      } else {
        console.log('Using Chat Completions API');
        // Use regular Chat Completions API
        const result = await get()._handleChatCompletionsAPI(chatId, enrichedContent, activePersonality, messages, settings);
        assistantResponse = result.response;
        tokenUsage = result.usage;
      }

      if (tokenUsage) {
        console.log('Tokens:', tokenUsage.total_tokens, '(prompt:', tokenUsage.prompt_tokens, 'completion:', tokenUsage.completion_tokens + ')');
        set(state => ({ totalTokens: state.totalTokens + tokenUsage.total_tokens }));
      }

      // Update the assistant message in UI
      set(state => ({
        messages: state.messages.map(msg =>
          msg.id === assistantMessage.id
            ? { ...msg, content: assistantResponse }
            : msg
        )
      }));

      // Save assistant message to DB
      const { error: saveError } = await supabase.from('messages').insert({
        chat_id: chatId,
        role: 'assistant',
        content: assistantResponse
      });

      if (saveError) {
        console.error('Error saving to DB:', saveError);
      }

      // Note: Facts are now saved automatically via Function Calling (save_fact)
      // AI decides when to save facts based on user input

      // Update chat title if it's the first message
      const currentMessages = get().messages;
      if (currentMessages.length === 2) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await get().updateChatTitle(chatId, title);
      }

    } catch (error) {
      console.error('Error with OpenAI API:', error);
      // Remove the empty assistant message on error
      set(state => ({
        messages: state.messages.filter(msg => msg.id !== assistantMessage.id)
      }));
    } finally {
      set({ isGenerating: false });
    }
  },

  loadSettings: async () => {
    const { user } = get();
    if (!user) return;

    const { data: settingsData } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    let data = null;
    if (settingsData && settingsData.length > 0) {
      data = settingsData[0];
    }

    if (!data) {
      // Create default settings if none exist
      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id
        })
        .select()
        .single();

      if (!insertError) {
        data = newSettings;
      }
    }

    if (data) {
      // Decrypt API key when loading from database
      if (data.openai_api_key) {
        data.openai_api_key = encryption.decrypt(data.openai_api_key);
      }
      
      set({ settings: data });
      if (data.openai_api_key) {
        get().openaiService.setApiKey(data.openai_api_key);
        get().assistantService.setApiKey(data.openai_api_key);
        get().vectorStoreService.setApiKey(data.openai_api_key);
        get().integrationService.setApiKey(data.openai_api_key);
        get().memoryService.initOpenAI(data.openai_api_key);
      }
    }
  },

  updateSettings: async (newSettings) => {
    const { user, settings } = get();
    if (!user || !settings) return;

    // Encrypt API key before saving to database
    const settingsToSave = { ...newSettings };
    if (settingsToSave.openai_api_key) {
      settingsToSave.openai_api_key = encryption.encrypt(settingsToSave.openai_api_key);
    }

    const { error } = await supabase
      .from('user_settings')
      .update(settingsToSave)
      .eq('user_id', user.id);

    if (!error) {
      const updatedSettings = { ...settings, ...newSettings };
      set({ settings: updatedSettings });
      
      if (newSettings.openai_api_key) {
        get().openaiService.setApiKey(newSettings.openai_api_key);
        get().assistantService.setApiKey(newSettings.openai_api_key);
        get().vectorStoreService.setApiKey(newSettings.openai_api_key);
        get().integrationService.setApiKey(newSettings.openai_api_key);
        get().memoryService.initOpenAI(newSettings.openai_api_key);
      }
    }
  },

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSettings: () => set(state => ({ showSettings: !state.showSettings })),
  togglePersonalities: () => set(state => ({ showPersonalities: !state.showPersonalities })),
  toggleMemoryLibrary: () => set(state => ({ showMemoryLibrary: !state.showMemoryLibrary })),
  toggleMemoryDiary: () => set(state => ({ showMemoryDiary: !state.showMemoryDiary })),
  toggleMemoryExplorer: () => set(state => ({ showMemoryExplorer: !state.showMemoryExplorer })),

  loadPersonalities: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('personalities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ personalities: data });
      const active = data.find(p => p.is_active);
      set({ activePersonality: active || null });
    }
  },

  createPersonality: async (name, prompt, hasMemory = true) => {
    const { user, settings, assistantService } = get();
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      let assistantId: string | null = null;

      // Create OpenAI Assistant if API key is available
      if (settings?.openai_api_key) {
        try {
          assistantService.setApiKey(settings.openai_api_key.trim());
          const assistant = await assistantService.createAssistant({
            name,
            instructions: prompt,
            model: settings.model || 'gpt-4o',
            tools: [] // Don't add file_search tool initially
          });
          assistantId = assistant.id;
        } catch (error) {
          console.warn('Failed to create OpenAI Assistant:', error);
          // Continue with personality creation even if Assistant creation fails
        }
      }

      const { data, error } = await supabase
        .from('personalities')
        .insert({
          user_id: user.id,
          name,
          prompt,
          has_memory: hasMemory,
          openai_assistant_id: assistantId
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save personality: ${error.message}`);
      }

      if (data) {
        set(state => ({ personalities: [data, ...state.personalities] }));
        return data;
      }

      throw new Error('No data returned from personality creation');
    } catch (error) {
      console.error('Error creating personality:', error);
      throw error; // Re-throw to let UI handle the error
    }
  },

  updatePersonality: async (id, updates) => {
    const { settings, openaiService } = get();
    
    // Update in local database first
    const { error } = await supabase
      .from('personalities')
      .update(updates)
      .eq('id', id);
      
    if (error) {
      throw new Error(`Failed to update personality: ${error.message}`);
    }

    // Update local state
    set(state => ({
      personalities: state.personalities.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
      activePersonality: state.activePersonality?.id === id 
        ? { ...state.activePersonality, ...updates }
        : state.activePersonality
    }));

    // Sync with OpenAI if assistant exists and API key is available
    const personality = get().personalities.find(p => p.id === id);
    if (personality?.openai_assistant_id && settings?.openai_api_key) {
      try {
        openaiService.setApiKey(settings.openai_api_key.trim());
        await openaiService.updateAssistant(personality.openai_assistant_id, {
          name: updates.name || personality.name,
          instructions: updates.prompt || personality.prompt
        });
        console.log('Assistant synced with OpenAI successfully');
      } catch (syncError) {
        console.error('Failed to sync with OpenAI:', syncError);
        // Don't throw error here - local update was successful
      }
    }
  },

  deletePersonality: async (id) => {
    try {
      const { settings, openaiService } = get();
      
      // Get personality to check for assistant ID
      const personality = get().personalities.find(p => p.id === id);
      
      // Delete Assistant from OpenAI if it exists
      if (personality?.openai_assistant_id && settings?.openai_api_key) {
        try {
          openaiService.setApiKey(settings.openai_api_key.trim());
          await openaiService.deleteAssistant(personality.openai_assistant_id);
        } catch (error) {
          console.warn('Failed to delete OpenAI Assistant:', error);
          // Continue with database deletion even if Assistant deletion fails
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('personalities')
        .delete()
        .eq('id', id);

      if (!error) {
        set(state => ({
          personalities: state.personalities.filter(p => p.id !== id),
          activePersonality: state.activePersonality?.id === id ? null : state.activePersonality
        }));
      }
    } catch (error) {
      console.error('Error deleting personality:', error);
      throw error;
    }
  },

  uploadPersonalityFile: async (personalityId: string, file: File) => {
    const { settings, integrationService } = get();
    
    if (!settings?.openai_api_key) {
      throw new Error('OpenAI API key is required for file upload');
    }

    try {
      set(() => ({ uploading: true, error: null }));
      
      // Get current personality
      const personality = get().personalities.find(p => p.id === personalityId);
      if (!personality || !personality.openai_assistant_id) {
        throw new Error('Personality not found or no OpenAI Assistant associated');
      }

      // Set API key and use integration service to upload files
      integrationService.setApiKey(settings.openai_api_key.trim());
      
      // Get existing vector_store_id from database if available
      // For now, we'll create a new vector store per upload - this can be optimized later
      const result = await integrationService.addFilesToPersonality(
        personality.openai_assistant_id,
        personality.name,
        [file]
      );
      
      // Create PersonalityFile objects from uploaded files
      const personalityFiles = result.uploaded_files.map(uploadResult => ({
        openai_file_id: uploadResult.file_id,
        file_name: uploadResult.file_name,
        file_size: uploadResult.file_size,
        file_type: uploadResult.file_type,
        status: 'ready' as const,
        uploaded_at: new Date().toISOString(),
      }));

      // Update files array in database
      const updatedFiles = [...(personality.files || []), ...personalityFiles];
      const { error } = await supabase
        .from('personalities')
        .update({ files: updatedFiles })
        .eq('id', personalityId);

      if (error) throw error;

      // Update local state
      set(state => ({
        personalities: state.personalities.map(p =>
          p.id === personalityId ? { ...p, files: updatedFiles } : p
        ),
        activePersonality: state.activePersonality?.id === personalityId 
          ? { ...state.activePersonality, files: updatedFiles }
          : state.activePersonality,
        uploading: false
      }));

      // IntegrationService already handled the Assistant update
      // Return the first uploaded file (maintaining backward compatibility)
      return personalityFiles[0];
    } catch (error) {
      set(() => ({ uploading: false, error: error instanceof Error ? error.message : 'Upload failed' }));
      throw error;
    }
  },

  deletePersonalityFile: async (personalityId: string, fileId: string) => {
    const { settings, integrationService } = get();
    
    try {
      const personality = get().personalities.find(p => p.id === personalityId);
      if (!personality) {
        throw new Error('Personality not found');
      }

      // Remove file from files array
      const updatedFiles = personality.files?.filter(f => f.openai_file_id !== fileId) || [];
      
      // Update database
      const { error } = await supabase
        .from('personalities')
        .update({ files: updatedFiles })
        .eq('id', personalityId);

      if (error) throw error;

      // Delete from OpenAI using integration service
      // Note: We don't have vector_store_id in current structure
      // This is a known limitation - files are removed from DB but may remain in OpenAI
      if (settings?.openai_api_key) {
        console.warn('File deletion from OpenAI vector stores not implemented in current version');
        // TODO: Store vector_store_id in personality or file metadata for proper cleanup
      }

      // Update local state
      set(state => ({
        personalities: state.personalities.map(p =>
          p.id === personalityId ? { ...p, files: updatedFiles } : p
        ),
        activePersonality: state.activePersonality?.id === personalityId 
          ? { ...state.activePersonality, files: updatedFiles }
          : state.activePersonality
      }));

      // Note: Vector Store management is handled separately by VectorStoreService
      // File removal from vector stores should be implemented when vector_store_id is tracked
    } catch (error) {
      throw error;
    }
  },

  // === MEMORY LIBRARY METHODS ===

  loadLibraryDocuments: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('document_chunks')
        .select('*')
        .or(`user_id.eq.${user.id},and(user_id.is.null,is_public.eq.true)`)
        .order('created_at', { ascending: false });

      if (!error && data) {
        set({ libraryDocuments: data as DocumentChunk[] });
      }
    } catch (error) {
      console.error('Failed to load library documents:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to load library' });
    }
  },

  uploadDocumentToLibrary: async (file: File, isPublic: boolean, projectId?: string) => {
    const { user, settings, openaiService } = get();

    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!settings?.openai_api_key) {
      throw new Error('OpenAI API key is required for document upload');
    }

    try {
      set({ uploading: true, error: null });

      // Read file content
      const content = await file.text();

      // Set API key for OpenAI service
      openaiService.setApiKey(settings.openai_api_key.trim());

      // Generate embedding using OpenAI
      const embeddingResponse = await openaiService.createEmbedding(content);
      const embedding = embeddingResponse.data[0].embedding;

      // Insert into document_chunks
      const { data, error } = await supabase
        .from('document_chunks')
        .insert({
          user_id: isPublic ? null : user.id,
          is_public: isPublic,
          project_id: projectId || null,
          content: content,
          embedding: embedding,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          metadata: {
            original_name: file.name,
            uploaded_by: user.id,
            upload_date: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set(state => ({
        libraryDocuments: [data as DocumentChunk, ...state.libraryDocuments],
        uploading: false
      }));

      return data as DocumentChunk;
    } catch (error) {
      set({ uploading: false, error: error instanceof Error ? error.message : 'Upload failed' });
      throw error;
    }
  },

  deleteLibraryDocument: async (id: string) => {
    try {
      const { error } = await supabase
        .from('document_chunks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      set(state => ({
        libraryDocuments: state.libraryDocuments.filter(doc => doc.id !== id)
      }));
    } catch (error) {
      throw error;
    }
  },

  setActivePersonality: async (id) => {
    const { user } = get();
    if (!user) return;

    // Deactivate all personalities first
    await supabase
      .from('personalities')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Activate the selected personality
    const { error } = await supabase
      .from('personalities')
      .update({ is_active: true })
      .eq('id', id);

    if (!error) {
      set(state => ({
        personalities: state.personalities.map(p => ({
          ...p,
          is_active: p.id === id
        })),
        activePersonality: state.personalities.find(p => p.id === id) || null
      }));
    }
  },

  // Helper method for Chat Completions API (with Function Calling)
  _handleChatCompletionsAPI: async (chatId: string, content: string, activePersonality: Personality | null, messages: Message[], settings: UserSettings) => {
    const { openaiService, user } = get();

    // Build conversation history for OpenAI
    const conversationMessages = messages
      .filter(m => m.chat_id === chatId)
      .map(m => ({
        role: m.role,
        content: m.content
      }));

    // Add system message based on active personality
    const systemMessage = activePersonality
      ? `You are ${activePersonality.name}. ${activePersonality.prompt}\n\nYou have access to memory functions to save, update, or delete facts about the user.

IMPORTANT RULES for saving facts:
- ONLY save facts when the user explicitly STATES information (e.g., "My name is...", "I like...", "I am from...")
- DO NOT save the user's questions as facts (e.g., "What is my name?" is a question, not a fact)
- DO NOT save unless the user is sharing new information about themselves
- Save facts with clear, descriptive subjects like "user_name", "user_location", "preference_coffee"

Use save_fact when the user shares important information about themselves, their preferences, or explicitly asks you to remember something.`
      : 'You are a helpful assistant with access to memory functions. Use them to save important facts about the user.\n\nONLY save facts when users explicitly STATE information, NOT when they ask questions.';

    // Add the new user message
    conversationMessages.push({ role: 'user', content });

    // === DEFINE FUNCTION CALLING TOOLS ===
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'save_fact',
          description: 'Save an important fact about the user to long-term memory. Use this when the user shares personal information, preferences, or explicitly asks you to remember something.',
          parameters: {
            type: 'object',
            properties: {
              subject: {
                type: 'string',
                description: 'Short category/key for the fact (e.g., "user_name", "favorite_color", "occupation", "preference_coffee")'
              },
              value: {
                type: 'string',
                description: 'The actual fact value or detailed information'
              },
              confidence: {
                type: 'number',
                description: 'Confidence level 0.0-1.0 (default: 0.9). Use 1.0 for user-stated facts, lower for inferred.',
                default: 0.9
              },
              importance: {
                type: 'number',
                description: 'Importance rating 1-10 (default: 5)',
                default: 5
              }
            },
            required: ['subject', 'value']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'update_fact',
          description: 'Update an existing fact about the user. Use this when correcting or refining previously saved information.',
          parameters: {
            type: 'object',
            properties: {
              fact_id: {
                type: 'string',
                description: 'ID of the fact to update (obtained from search results)'
              },
              subject: {
                type: 'string',
                description: 'Updated subject/category (optional)'
              },
              value: {
                type: 'string',
                description: 'Updated value (optional)'
              },
              confidence: {
                type: 'number',
                description: 'Updated confidence 0.0-1.0 (optional)'
              },
              importance: {
                type: 'number',
                description: 'Updated importance 1-10 (optional)'
              }
            },
            required: ['fact_id']
          }
        }
      },
      {
        type: 'function' as const,
        function: {
          name: 'delete_fact',
          description: 'Delete a fact from memory. Use this when the user asks to forget something or when information becomes outdated.',
          parameters: {
            type: 'object',
            properties: {
              fact_id: {
                type: 'string',
                description: 'ID of the fact to delete'
              }
            },
            required: ['fact_id']
          }
        }
      }
    ];

    // === FIRST API CALL (with tools) ===
    let response = await openaiService.createChatCompletion([
      { role: 'system', content: systemMessage },
      ...conversationMessages
    ], {
      model: settings.model || 'gpt-4o',
      temperature: settings.temperature || 0.7,
      max_tokens: settings.max_tokens || 2000
    }, tools, 'auto');

    const firstMessage = response.choices[0]?.message;
    let totalUsage = response.usage;

    // === HANDLE TOOL CALLS ===
    if (firstMessage?.tool_calls && firstMessage.tool_calls.length > 0) {
      console.log('🔧 Function calling detected:', firstMessage.tool_calls.length, 'calls');

      // Add assistant message with tool_calls to conversation
      conversationMessages.push({
        role: 'assistant',
        content: firstMessage.content || '',
        tool_calls: firstMessage.tool_calls
      });

      // Get or create project for facts
      const { data: projects } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', user!.id)
        .eq('is_default', true)
        .limit(1);

      let projectId = projects && projects.length > 0 ? projects[0].id : null;

      if (!projectId) {
        const { data: newProject } = await supabase
          .from('projects')
          .insert({
            user_id: user!.id,
            name: 'Personal Workspace',
            mission: 'Default project for personal conversations',
            is_default: true,
            status: 'active'
          })
          .select('id')
          .single();

        projectId = newProject?.id || null;
      }

      // Execute each tool call
      for (const toolCall of firstMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`📞 Calling function: ${functionName}`, functionArgs);

        let functionResult: any;

        try {
          // Execute the appropriate function
          if (functionName === 'save_fact' && projectId) {
            functionResult = await get()._saveFact(
              projectId,
              chatId,
              functionArgs.subject,
              functionArgs.value,
              functionArgs.confidence,
              functionArgs.importance,
              []
            );
          } else if (functionName === 'update_fact') {
            functionResult = await get()._updateFact(
              functionArgs.fact_id,
              {
                subject: functionArgs.subject,
                value: functionArgs.value,
                confidence: functionArgs.confidence,
                importance: functionArgs.importance
              }
            );
          } else if (functionName === 'delete_fact') {
            functionResult = await get()._deleteFact(functionArgs.fact_id);
          } else {
            functionResult = { success: false, message: 'Unknown function or missing project' };
          }

          console.log('✅ Function result:', functionResult);

        } catch (error) {
          console.error('❌ Function execution error:', error);
          functionResult = {
            success: false,
            message: error instanceof Error ? error.message : 'Function execution failed'
          };
        }

        // Add function result to conversation
        conversationMessages.push({
          role: 'tool',
          content: JSON.stringify(functionResult),
          tool_call_id: toolCall.id
        });
      }

      // === SECOND API CALL (get final response after function execution) ===
      console.log('🔄 Requesting final response after function execution...');

      const finalResponse = await openaiService.createChatCompletion([
        { role: 'system', content: systemMessage },
        ...conversationMessages
      ], {
        model: settings.model || 'gpt-4o',
        temperature: settings.temperature || 0.7,
        max_tokens: settings.max_tokens || 2000
      });

      // Aggregate token usage
      if (finalResponse.usage && totalUsage) {
        totalUsage = {
          prompt_tokens: totalUsage.prompt_tokens + finalResponse.usage.prompt_tokens,
          completion_tokens: totalUsage.completion_tokens + finalResponse.usage.completion_tokens,
          total_tokens: totalUsage.total_tokens + finalResponse.usage.total_tokens
        };
      }

      const assistantResponse = finalResponse.choices[0]?.message?.content || '';

      return {
        response: assistantResponse,
        usage: totalUsage
      };
    }

    // === NO TOOL CALLS - return direct response ===
    const assistantResponse = firstMessage?.content || '';

    return {
      response: assistantResponse,
      usage: totalUsage
    };
  },

  // Helper method for Assistants API
  _handleAssistantsAPIMessage: async (chatId: string, content: string, personality: Personality): Promise<string> => {
    const { openaiService } = get();

    try {
      // Get current chat to check for existing thread
      const { data: chatData } = await supabase
        .from('chats')
        .select('openai_thread_id')
        .eq('id', chatId)
        .single();

      let threadId = chatData?.openai_thread_id;

      // Create thread if it doesn't exist
      if (!threadId) {
        console.log('Creating new OpenAI thread for chat:', chatId);
        const threadResponse = await openaiService.createThread();
        threadId = threadResponse.id;

        // Save thread ID to chat
        await supabase
          .from('chats')
          .update({ openai_thread_id: threadId })
          .eq('id', chatId);
      }

      // Add message to thread
      await openaiService.addMessage(threadId, content);

      // Run the assistant
      const runResponse = await openaiService.runAssistant(threadId, personality.openai_assistant_id!);
      
      // Poll for completion with optimized check
      let runStatus = runResponse.status;
      let pollAttempts = 0;
      const maxPollAttempts = 30; // Maximum 30 attempts (30 seconds)
      
      while (runStatus === 'queued' || runStatus === 'in_progress') {
        if (pollAttempts >= maxPollAttempts) {
          throw new Error('Assistant run timeout - taking too long to respond');
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        const statusCheck = await openaiService.checkRun(threadId, runResponse.id);
        runStatus = statusCheck.status;
        pollAttempts++;
        
        console.log(`Run status: ${runStatus} (attempt ${pollAttempts})`);
      }

      if (runStatus === 'completed') {
        // Get the assistant's response from thread messages
        const threadMessages = await openaiService.getThreadMessages(threadId);
        const assistantMessages = threadMessages.filter(msg => msg.role === 'assistant');
        
        if (assistantMessages.length > 0) {
          // Return the latest assistant message
          return assistantMessages[assistantMessages.length - 1].content;
        } else {
          throw new Error('No assistant response found in thread');
        }
      } else if (runStatus === 'failed') {
        throw new Error('Assistant run failed');
      } else {
        throw new Error(`Assistant run ended with unexpected status: ${runStatus}`);
      }

    } catch (error) {
      console.error('Error in Assistants API:', error);
      throw error;
    }
  },

  // ===== FACTS MANAGEMENT (for Function Calling) =====

  /**
   * Save a new fact to the diary
   */
  _saveFact: async (projectId, chatId, subject, value, confidence = 0.9, importance = 5, tags = []) => {
    const { user, activePersonality } = get();

    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      console.log('💾 Saving fact:', { subject, value, confidence, importance });

      // Prepare fact data
      const factData = {
        project_id: projectId,
        session_id: chatId,
        user_id: user.id,
        subject: subject,
        value: typeof value === 'string' ? { value } : value, // Ensure value is object
        level: 'fact' as const,
        source_type: 'user_stated' as const,
        confidence: Math.min(Math.max(confidence, 0), 1), // Clamp 0-1
        importance: Math.min(Math.max(importance, 1), 10), // Clamp 1-10
        tags: [...tags, activePersonality?.name || 'general'],
        metadata: {
          chat_id: chatId,
          personality_id: activePersonality?.id,
          saved_at: new Date().toISOString()
        },
        is_active: true
      };

      const { data, error } = await supabase
        .from('facts')
        .insert(factData)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Failed to save fact:', error);
        return { success: false, message: `Failed to save fact: ${error.message}` };
      }

      console.log('✅ Fact saved successfully:', data.id);
      return { success: true, message: 'Fact saved successfully', factId: data.id };

    } catch (error) {
      console.error('❌ Error saving fact:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error saving fact'
      };
    }
  },

  /**
   * Update an existing fact
   */
  _updateFact: async (factId, updates) => {
    const { user } = get();

    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      console.log('📝 Updating fact:', factId, updates);

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (updates.subject !== undefined) updateData.subject = updates.subject;
      if (updates.value !== undefined) {
        updateData.value = typeof updates.value === 'string' ? { value: updates.value } : updates.value;
      }
      if (updates.confidence !== undefined) {
        updateData.confidence = Math.min(Math.max(updates.confidence, 0), 1);
      }
      if (updates.importance !== undefined) {
        updateData.importance = Math.min(Math.max(updates.importance, 1), 10);
      }
      if (updates.tags !== undefined) updateData.tags = updates.tags;

      const { error } = await supabase
        .from('facts')
        .update(updateData)
        .eq('id', factId)
        .eq('user_id', user.id); // Security: only update own facts

      if (error) {
        console.error('❌ Failed to update fact:', error);
        return { success: false, message: `Failed to update fact: ${error.message}` };
      }

      console.log('✅ Fact updated successfully');
      return { success: true, message: 'Fact updated successfully' };

    } catch (error) {
      console.error('❌ Error updating fact:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error updating fact'
      };
    }
  },

  /**
   * Delete (deactivate) a fact
   */
  _deleteFact: async (factId) => {
    const { user } = get();

    if (!user) {
      return { success: false, message: 'User not authenticated' };
    }

    try {
      console.log('🗑️ Deleting fact:', factId);

      const { error } = await supabase
        .from('facts')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', factId)
        .eq('user_id', user.id); // Security: only delete own facts

      if (error) {
        console.error('❌ Failed to delete fact:', error);
        return { success: false, message: `Failed to delete fact: ${error.message}` };
      }

      console.log('✅ Fact deleted successfully');
      return { success: true, message: 'Fact deleted successfully' };

    } catch (error) {
      console.error('❌ Error deleting fact:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error deleting fact'
      };
    }
  },

  setIsGenerating: (generating) => set({ isGenerating: generating })
}));