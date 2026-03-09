/**
 * Prompt Analyzer — Extracts intent, technologies, and keywords from user prompts.
 */
import type { PromptAnalysis, TaskCategory, Ecosystem, ResourceType } from "../types.js";

/** Technology keyword → canonical name mapping */
const TECH_PATTERNS: Record<string, string[]> = {
    // Frameworks
    "langchain": ["langchain", "lang chain", "lc"],
    "llamaindex": ["llamaindex", "llama index", "llama_index"],
    "crewai": ["crewai", "crew ai", "crew-ai"],
    "autogen": ["autogen", "auto gen", "auto-gen"],
    "dspy": ["dspy", "ds-py"],
    "haystack": ["haystack", "deepset"],
    // Models
    "openai": ["openai", "gpt-4", "gpt4", "gpt-3", "gpt3", "chatgpt", "dall-e", "dalle", "whisper", "o1", "o3"],
    "anthropic": ["anthropic", "claude", "claude-3", "sonnet", "haiku", "opus"],
    "google": ["gemini", "gemma", "palm", "bard", "google ai"],
    "meta": ["llama", "llama-3", "llama3", "meta ai"],
    "mistral": ["mistral", "mixtral", "mistral-ai"],
    "deepseek": ["deepseek", "deep seek", "deepseek-r1"],
    "qwen": ["qwen", "qwen2"],
    // Vector DBs
    "pinecone": ["pinecone"],
    "chromadb": ["chromadb", "chroma", "chromadb"],
    "weaviate": ["weaviate"],
    "qdrant": ["qdrant"],
    "milvus": ["milvus"],
    "pgvector": ["pgvector", "pg vector"],
    "faiss": ["faiss"],
    // Inference
    "ollama": ["ollama"],
    "vllm": ["vllm", "v-llm"],
    "llama.cpp": ["llama.cpp", "llama cpp", "llamacpp", "gguf"],
    "tgi": ["tgi", "text generation inference"],
    // Tools
    "comfyui": ["comfyui", "comfy ui", "comfy"],
    "stable-diffusion": ["stable diffusion", "sdxl", "sd", "stable-diffusion"],
    "midjourney": ["midjourney", "mid journey"],
    "flux": ["flux"],
    // Platforms
    "huggingface": ["huggingface", "hugging face", "hf"],
    "cursor": ["cursor"],
    "copilot": ["copilot", "github copilot"],
    "windsurf": ["windsurf", "codeium"],
    // Web frameworks
    "nextjs": ["next.js", "nextjs", "next js"],
    "react": ["react", "reactjs"],
    "vue": ["vue", "vuejs", "vue.js", "nuxt"],
    "svelte": ["svelte", "sveltekit"],
    "angular": ["angular"],
    "fastapi": ["fastapi", "fast api"],
    "django": ["django"],
    "flask": ["flask"],
    "express": ["express", "expressjs"],
    "nestjs": ["nestjs", "nest.js"],
    // Languages
    "python": ["python", "py", "pip"],
    "typescript": ["typescript", "ts"],
    "javascript": ["javascript", "js", "node", "nodejs", "node.js"],
    "rust": ["rust", "cargo"],
    "go": ["golang", "go lang"],
    // Infra
    "docker": ["docker", "dockerfile", "container"],
    "kubernetes": ["kubernetes", "k8s", "kubectl", "helm"],
    "terraform": ["terraform", "tf"],
    "aws": ["aws", "amazon web services", "lambda", "s3", "ec2", "sagemaker"],
    "gcp": ["gcp", "google cloud"],
    "azure": ["azure", "microsoft azure"],
    // Data
    "pytorch": ["pytorch", "torch"],
    "tensorflow": ["tensorflow", "tf", "keras"],
    "jax": ["jax"],
    "pandas": ["pandas", "dataframe"],
    "spark": ["spark", "pyspark", "apache spark"],
    // MCP
    "mcp": ["mcp", "model context protocol", "mcp server"],
};

/** Task category detection patterns */
const CATEGORY_PATTERNS: Record<TaskCategory, string[]> = {
    "rag": ["rag", "retrieval", "retrieval augmented", "knowledge base", "document search", "semantic search", "embedding", "vector search", "chunking", "indexing documents"],
    "agent-building": ["agent", "autonomous", "multi-agent", "tool use", "tool calling", "function calling", "agentic", "crew", "swarm", "orchestrat"],
    "coding": ["code", "coding", "programming", "develop", "build", "implement", "debug", "refactor", "review", "lint", "test", "function", "class", "api", "sdk", "library"],
    "ml-training": ["train", "fine-tune", "finetune", "lora", "qlora", "dataset", "pretraining", "pre-training", "training data", "ml pipeline"],
    "inference": ["inference", "serve", "deploy model", "model serving", "gpu", "quantiz", "gguf", "vllm", "ollama", "local model", "run model"],
    "image-generation": ["image generat", "text to image", "text-to-image", "stable diffusion", "dall-e", "midjourney", "comfyui", "flux", "controlnet", "lora"],
    "nlp": ["nlp", "natural language", "text process", "sentiment", "ner", "named entity", "classification", "summariz", "translation", "tokeniz"],
    "computer-vision": ["computer vision", "object detection", "segmentation", "ocr", "image classification", "face", "yolo", "sam", "detectron"],
    "audio": ["audio", "speech", "text to speech", "tts", "asr", "transcri", "voice", "whisper", "music"],
    "data-processing": ["data", "etl", "pipeline", "clean", "preprocess", "transform", "scrape", "crawl", "parse", "extract"],
    "deployment": ["deploy", "production", "hosting", "ci/cd", "docker", "kubernetes", "cloud", "serverless", "scale"],
    "monitoring": ["monitor", "observ", "log", "trace", "metric", "evaluat", "benchmark", "dashboard"],
    "testing": ["test", "quality", "eval", "benchmark", "unit test", "integration test", "e2e"],
    "prompt-engineering": ["prompt", "system prompt", "instruction", "template", "few-shot", "chain of thought", "cot"],
    "web-development": ["web", "frontend", "backend", "fullstack", "full-stack", "website", "webapp", "spa", "ssr"],
    "mobile-development": ["mobile", "ios", "android", "react native", "flutter", "swift", "kotlin"],
    "devops": ["devops", "infrastructure", "terraform", "ansible", "ci/cd", "pipeline", "automation"],
    "security": ["security", "auth", "authentication", "authorization", "encrypt", "vulnerability", "pentesting"],
    "documentation": ["document", "readme", "wiki", "docs", "technical writing", "api docs"],
    "general": [],
};

/** Ecosystem detection */
const ECOSYSTEM_PATTERNS: Record<Ecosystem, string[]> = {
    "cursor": ["cursor", "cursor rules", "cursor ide"],
    "github-copilot": ["copilot", "github copilot", "copilot instruction"],
    "windsurf": ["windsurf", "codeium", "windsurf rules"],
    "openai": ["openai", "chatgpt", "gpt-4", "gpt4", "dall-e"],
    "anthropic": ["claude", "anthropic", "sonnet", "haiku"],
    "gemini": ["gemini", "google ai", "bard"],
    "mcp": ["mcp", "model context protocol"],
    "chatgpt": ["chatgpt", "custom gpt"],
    "cross-platform": [],
};

/** Resource type preferences based on context */
const TYPE_SIGNALS: Record<ResourceType, string[]> = {
    "skill": ["skill", "extension", "plugin", "integration", "library", "package", "sdk"],
    "rule": ["rule", "coding standard", "best practice", "convention", "guideline", "instruction"],
    "agent": ["agent", "bot", "assistant", "autonomous", "crew", "swarm"],
    "mcp-server": ["mcp", "mcp server", "model context protocol", "server"],
    "tool": ["tool", "app", "platform", "service", "api", "saas"],
    "instruction": ["instruction", "copilot instruction", "windsurf rule"],
    "prompt-pack": ["prompt", "prompt template", "system prompt"],
    "directory": ["list", "awesome", "collection", "directory"],
    "platform-feature": ["feature", "built-in"],
};

/**
 * Analyze a user prompt to extract intent, technologies, and keywords.
 */
export function analyzePrompt(prompt: string): PromptAnalysis {
    const lower = prompt.toLowerCase();
    const words = lower.split(/\s+/);

    // 1. Detect technologies
    const technologies: string[] = [];
    for (const [tech, patterns] of Object.entries(TECH_PATTERNS)) {
        for (const pattern of patterns) {
            if (lower.includes(pattern)) {
                technologies.push(tech);
                break;
            }
        }
    }

    // 2. Classify task categories
    const categoryScores: Partial<Record<TaskCategory, number>> = {};
    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
        if (patterns.length === 0) continue;
        let score = 0;
        for (const pattern of patterns) {
            if (lower.includes(pattern)) score++;
        }
        if (score > 0) {
            categoryScores[category as TaskCategory] = score;
        }
    }

    const categories: TaskCategory[] = Object.entries(categoryScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat as TaskCategory);

    if (categories.length === 0) categories.push("general");

    // 3. Extract keywords (remove stop words, keep meaningful terms)
    const STOP_WORDS = new Set([
        "i", "me", "my", "we", "our", "you", "your", "it", "its", "the", "a", "an",
        "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
        "do", "does", "did", "will", "would", "could", "should", "can", "may",
        "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into",
        "about", "that", "this", "which", "what", "how", "when", "where", "who",
        "and", "or", "but", "not", "no", "if", "then", "so", "than", "too",
        "want", "need", "help", "looking", "find", "get", "set", "use", "make",
        "up", "out", "just", "like", "also", "very", "some", "any", "all", "most",
    ]);

    const keywords = words
        .map(w => w.replace(/[^a-z0-9.\-_/]/g, ""))
        .filter(w => w.length > 2 && !STOP_WORDS.has(w));

    // 4. Detect ecosystem affinity
    const ecosystems: Ecosystem[] = [];
    for (const [eco, patterns] of Object.entries(ECOSYSTEM_PATTERNS)) {
        if (patterns.length === 0) continue;
        for (const pattern of patterns) {
            if (lower.includes(pattern)) {
                ecosystems.push(eco as Ecosystem);
                break;
            }
        }
    }

    // 5. Detect preferred resource types
    const preferredTypes: ResourceType[] = [];
    for (const [type, signals] of Object.entries(TYPE_SIGNALS)) {
        for (const signal of signals) {
            if (lower.includes(signal)) {
                preferredTypes.push(type as ResourceType);
                break;
            }
        }
    }

    return {
        technologies,
        categories,
        keywords: [...new Set(keywords)],
        ecosystems,
        preferredTypes,
    };
}

/**
 * Generate a human-readable explanation of why a resource was recommended.
 */
export function explainRecommendation(
    resource: { title: string; type: string; tags: string[] },
    analysis: PromptAnalysis,
): string {
    const reasons: string[] = [];

    // Check tech overlap
    const techOverlap = analysis.technologies.filter(t =>
        resource.title.toLowerCase().includes(t) ||
        resource.tags.some(tag => tag.toLowerCase().includes(t))
    );
    if (techOverlap.length > 0) {
        reasons.push(`matches technologies: ${techOverlap.join(", ")}`);
    }

    // Check category relevance
    const catOverlap = analysis.categories.filter(c =>
        resource.tags.some(tag => tag.toLowerCase().includes(c.replace("-", " ")))
    );
    if (catOverlap.length > 0) {
        reasons.push(`relevant to: ${catOverlap.join(", ")}`);
    }

    // Check keyword overlap
    const kwOverlap = analysis.keywords.filter(kw =>
        resource.title.toLowerCase().includes(kw) ||
        resource.tags.some(tag => tag.toLowerCase().includes(kw))
    ).slice(0, 3);
    if (kwOverlap.length > 0) {
        reasons.push(`matched keywords: ${kwOverlap.join(", ")}`);
    }

    if (reasons.length === 0) {
        reasons.push(`general relevance to your task`);
    }

    return reasons.join("; ");
}
