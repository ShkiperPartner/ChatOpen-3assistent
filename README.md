# ChatOpenAI Integration Assistant

**Version:** 1.5.0
**Framework:** Claude Code Starter v1.2.4
**Last Updated:** 2025-01-31

---

## 🎯 What is this?

This project is **not just another ChatGPT wrapper**.

This is the **foundation for an AI Partnership Operating System** - a platform for building a digital partner that:
- Remembers context across sessions (persistent memory)
- Accumulates knowledge over time
- Works with multiple AI personalities on shared goals
- Evolves from simple chat to autonomous collaboration

**Big Picture:** We're building infrastructure for true AI partnership, where the AI is "in the loop" on all project events, helps analyze, discuss, and collaborate.

---

## ☕ Working with this Project (Ritual-First Approach)

### Every session MUST start with:

```
1. 📖 Read VISION.md
   └── Understand WHY we're building this (not just WHAT)

2. ☕ Coffee/Think Break
   └── Big picture first, tactics second

3. 🧭 Check Course
   └── Is next step aligned with meta-goal?

4. 📋 Tactical Work
   └── Now read PROJECT_ARCHITECTURE.md and work
```

**Why this matters:**
This project is a **foundational piece** for a larger system. Every decision affects future phases. Understanding the vision prevents us from becoming a "feature factory" without direction.

---

## 📚 Documentation Hierarchy

**Order matters! Read in this sequence:**

### 1. VISION.md (STRATEGY)
**Read this FIRST every session!**
- Meta-goal: Why we're building this
- North Star Metrics: How to know we're on track
- Decision Framework: Should we build this feature?
- Journey Map: Phase 1 → Phase 4 evolution
- Success Vision: What winning looks like

### 2. PROJECT_ARCHITECTURE.md (TACTICS)
- Current implementation status
- Roadmap and backlog
- Technical architecture
- Component descriptions

### 3. CLAUDE.md (WORKFLOW)
- Working instructions for Claude Code
- Sprint patterns
- Common problems & solutions
- Code templates

### 4. DATABASE_CHANGELOG.md
- Supabase schema changes
- Migration history

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your SUPABASE_URL and SUPABASE_ANON_KEY

# Run development server
npm run dev
```

### First Time Setup

1. **Read VISION.md** - Understand the meta-goal
2. Set up Supabase project
3. Run database migrations (see `supabase/migrations/`)
4. Add OpenAI API key in the app settings
5. Create your first personality

---

## 🏗️ Current Phase: Foundation (Phase 1)

**Goal:** Build basic infrastructure for AI partnership

**Status:**
- ✅ Core chat functionality
- ✅ OpenAI Assistants API integration
- ✅ Persistent chat history
- ✅ Multi-personality system
- 🔄 File upload to personalities (in progress)
- 🔄 Knowledge organization structure

**Phase 1 Complete When:**
- AI assistant can "remember" through files
- Different personalities work stably
- Data persists between sessions
- Knowledge base structure is defined

---

## 🎯 Architecture Principles

### What Makes This Different

**Traditional ChatGPT Wrapper:**
```
User → API → Response (forgotten after session)
```

**Our Approach (AI Partnership OS):**
```
User → Persistent Context → AI Team → Shared Knowledge Base
                              ↓
                    Memory accumulates over time
                    Context never lost
                    Evolution tracked
```

### Core Principles

1. **Memory is Sacred**
   Information entered must persist, decisions must be traceable

2. **Knowledge > Features**
   Features only valuable if they improve knowledge accumulation

3. **Evolution over Revolution**
   Each sprint = small step toward meta-goal

4. **Context is Everything**
   More context = smarter AI partner

---

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite
- **State Management:** Zustand
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **AI:** OpenAI Assistants API v2
- **Styling:** Tailwind CSS

---

## 📁 Project Structure

```
├── VISION.md                    # 🎯 META-GOAL (read first!)
├── PROJECT_ARCHITECTURE.md      # Roadmap & current status
├── CLAUDE.md                    # Working instructions
├── src/
│   ├── components/              # React components
│   ├── lib/
│   │   ├── openai.ts           # OpenAI service
│   │   └── supabase.ts         # DB types & client
│   ├── store/
│   │   └── useStore.ts         # Zustand state
│   └── App.tsx
├── supabase/
│   ├── migrations/             # DB migration scripts
│   └── docs/
│       └── DATABASE_CHANGELOG.md
└── archive/                    # Legacy docs (pre-migration)
```

---

## 🧭 How to Contribute

### Before Making Changes

1. **Read VISION.md** - Understand meta-goal
2. **Check Decision Framework** - Should this feature be built?
3. **Review PROJECT_ARCHITECTURE.md** - Current status & roadmap
4. **Follow CLAUDE.md** - Working patterns

### Sprint Pattern

```
☕ Start: Read VISION.md (ritual)
    ↓
📋 Plan: TodoWrite task breakdown
    ↓
🔨 Build: Follow architecture patterns
    ↓
✅ Test: Verify against North Star Metrics
    ↓
📝 Document: Update all relevant docs
    ↓
🎉 Commit: Sprint completion commit
```

---

## 🌟 Vision

**2025 Goal:**

Instead of:
```
AI: "Tell me about your project"
    (every session starts from scratch)
```

We want:
```
AI: "Looking at our knowledge base...
     This relates to the architecture we discussed 3 months ago.
     We decided approach X because of Y.

     Now we have new data [shows].
     Maybe we should reconsider?

     Here are 3 scenarios based on our history..."
```

**That's** an AI partner, not just a chatbot.

---

## 📊 Current Metrics

- **Personalities:** Unlimited (user-created)
- **File Support:** OpenAI Files API (vector search)
- **Chat History:** Persistent in Supabase
- **Context Window:** Per OpenAI model limits
- **Knowledge Retention:** 100% (all data persists)

---

## 🔄 Version History

### v1.5.0 (2025-01-31) - VISION.md + Ritual-First Workflow
- ✅ Created VISION.md (meta-goal & strategy)
- ✅ Implemented ritual-first approach
- ✅ Added Decision Framework for features
- ✅ Documented North Star Metrics
- ✅ Updated all workflow documentation

### v1.4.0 - MaaS (Memory as a Service) Microservice
- OpenAI Assistants API v2 integration
- File handling improvements

### v1.3.0 - Claude 4.5 Optimizations
- Improved TypeScript types
- Better state management patterns

---

## 📞 Support & Feedback

This is a living project. Documentation evolves as understanding deepens.

**Key Documents:**
- Questions about WHY? → Read VISION.md
- Questions about WHAT? → Read PROJECT_ARCHITECTURE.md
- Questions about HOW? → Read CLAUDE.md

---

## 📜 License

MIT License - See LICENSE file for details

---

**Remember:** This project is a **foundation**, not the end product.
Every commit should move us closer to true AI partnership. ☕🎯

*Last updated: 2025-01-31*
