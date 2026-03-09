/**
 * SkillHub MCP Server — Main server setup with all tool registrations.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { analyzePrompt, explainRecommendation } from "./engine/analyzer.js";
import { loadResources, getIndex, findResourceById, findResourceByTitle, getStats } from "./engine/loader.js";
import { rankResources, deduplicateResults } from "./engine/ranker.js";
import type { ResourceType, Ecosystem, RecommendResult } from "./types.js";

export function createServer(): McpServer {
    const server = new McpServer({
        name: "skillhub",
        version: "0.1.0",
    });

    // ═══════════════════════════════════════════════════════════
    // Tool 1: recommend
    // ═══════════════════════════════════════════════════════════
    server.tool(
        "recommend",
        `Recommend AI tools, skills, MCP servers, agents, rules, and resources from the SkillHub ecosystem (20,000+ resources) based on the user's task or intent. Use this when the user could benefit from discovering relevant AI tools, needs help finding the right framework/library, or is working on a task that could be improved with specific AI resources. Returns ranked results with relevance scores and install guidance.`,
        {
            task: z.string().describe(
                "Description of what the user is trying to do. Can be a natural language task description, a technical question, or a prompt that implies the need for AI tools."
            ),
            maxResults: z.number().optional().default(10).describe(
                "Maximum number of results to return (default: 10, max: 30)"
            ),
            types: z.array(z.enum([
                "skill", "rule", "agent", "mcp-server", "tool", "instruction", "prompt-pack"
            ])).optional().describe(
                "Filter by resource types. Leave empty for all types."
            ),
            ecosystems: z.array(z.enum([
                "cross-platform", "cursor", "github-copilot", "windsurf", "openai", "anthropic", "gemini", "mcp", "chatgpt"
            ])).optional().describe(
                "Filter by ecosystem. Leave empty for all ecosystems."
            ),
        },
        async ({ task, maxResults, types, ecosystems }) => {
            const max = Math.min(maxResults ?? 10, 30);

            // Analyze the prompt
            const analysis = analyzePrompt(task);

            // Build search queries from analysis
            const queries = [
                task,
                ...analysis.technologies,
                ...analysis.categories.filter(c => c !== "general"),
            ];

            // Search
            const index = getIndex();
            const searchResults = index.multiSearch(queries, max * 5);

            // Rank
            const resources = loadResources();
            const ranked = rankResources(searchResults, analysis, resources, {
                maxResults: max * 2,
                typeFilter: types as ResourceType[] | undefined,
                ecosystemFilter: ecosystems as Ecosystem[] | undefined,
            });

            // Deduplicate and take top results
            const deduped = deduplicateResults(ranked).slice(0, max);

            // Format results
            const results: RecommendResult[] = deduped.map(({ resource, score }) => ({
                title: resource.title,
                description: resource.description,
                type: resource.type,
                ecosystem: resource.ecosystem,
                url: resource.url,
                relevanceScore: Math.round(score * 100) / 100,
                tags: resource.tags.slice(0, 5),
                creator: resource.creator,
                stars: resource.stars,
                installCommand: resource.installCommand,
                docsUrl: resource.docsUrl,
                verified: resource.verified,
                whyRecommended: explainRecommendation(resource, analysis),
            }));

            const response = {
                query: task,
                analysis: {
                    detectedTechnologies: analysis.technologies,
                    taskCategories: analysis.categories,
                    detectedEcosystems: analysis.ecosystems,
                },
                resultCount: results.length,
                totalDatabaseSize: resources.length,
                results,
            };

            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(response, null, 2),
                    },
                ],
            };
        }
    );

    // ═══════════════════════════════════════════════════════════
    // Tool 2: search
    // ═══════════════════════════════════════════════════════════
    server.tool(
        "search",
        `Search the SkillHub database (20,000+ AI resources) by text query, type, ecosystem, or tags. Use this for targeted lookups when the user is looking for a specific tool, compares options, or wants to browse resources in a specific category.`,
        {
            query: z.string().describe("Search query — tool name, technology, or keyword"),
            type: z.enum([
                "skill", "rule", "agent", "mcp-server", "tool", "instruction", "prompt-pack"
            ]).optional().describe("Filter by resource type"),
            ecosystem: z.enum([
                "cross-platform", "cursor", "github-copilot", "windsurf", "openai", "anthropic", "gemini", "mcp", "chatgpt"
            ]).optional().describe("Filter by ecosystem"),
            maxResults: z.number().optional().default(15).describe("Max results to return (default: 15)"),
        },
        async ({ query, type, ecosystem, maxResults }) => {
            const max = Math.min(maxResults ?? 15, 50);
            const index = getIndex();
            const resources = loadResources();

            const searchResults = index.search(query, max * 3);

            let results = searchResults.map(({ index: idx, score }) => {
                const r = resources[idx];
                return { ...r, score: Math.round(score * 100) / 100 };
            });

            // Apply filters
            if (type) results = results.filter(r => r.type === type);
            if (ecosystem) results = results.filter(r => r.ecosystem === ecosystem);

            results = results.slice(0, max);

            return {
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify({
                            query,
                            filters: { type, ecosystem },
                            resultCount: results.length,
                            results: results.map(r => ({
                                title: r.title,
                                description: r.description,
                                type: r.type,
                                ecosystem: r.ecosystem,
                                url: r.url,
                                creator: r.creator,
                                stars: r.stars,
                                tags: r.tags.slice(0, 5),
                                relevanceScore: r.score,
                                verified: r.verified,
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
    );

    // ═══════════════════════════════════════════════════════════
    // Tool 3: get_resource
    // ═══════════════════════════════════════════════════════════
    server.tool(
        "get_resource",
        `Get full details about a specific AI resource from SkillHub by its ID or exact name. Use this when the user wants more information about a previously recommended resource.`,
        {
            identifier: z.string().describe("Resource ID or exact title to look up"),
        },
        async ({ identifier }) => {
            let resource = findResourceById(identifier);
            if (!resource) resource = findResourceByTitle(identifier);

            if (!resource) {
                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify({
                            error: "Resource not found",
                            suggestion: "Try using the 'search' tool to find resources by keyword.",
                        }),
                    }],
                };
            }

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({
                        id: resource.id,
                        title: resource.title,
                        description: resource.description,
                        type: resource.type,
                        ecosystem: resource.ecosystem,
                        tags: resource.tags,
                        url: resource.url,
                        repositoryUrl: resource.repositoryUrl,
                        creator: resource.creator,
                        stars: resource.stars,
                        installType: resource.installType,
                        installCommand: resource.installCommand,
                        docsUrl: resource.docsUrl,
                        verified: resource.verified,
                        confidence: resource.confidence,
                    }, null, 2),
                }],
            };
        }
    );

    // ═══════════════════════════════════════════════════════════
    // Tool 4: get_setup_guide
    // ═══════════════════════════════════════════════════════════
    server.tool(
        "get_setup_guide",
        `Get installation and setup instructions for a specific AI resource from SkillHub. Use this after recommending a resource to help the user actually install and configure it.`,
        {
            identifier: z.string().describe("Resource ID or exact title"),
        },
        async ({ identifier }) => {
            let resource = findResourceById(identifier);
            if (!resource) resource = findResourceByTitle(identifier);

            if (!resource) {
                return {
                    content: [{
                        type: "text" as const,
                        text: JSON.stringify({
                            error: "Resource not found",
                            suggestion: "Try using the 'search' tool to find the resource first.",
                        }),
                    }],
                };
            }

            // Generate setup guide based on install type
            const guide: Record<string, unknown> = {
                title: resource.title,
                type: resource.type,
                installType: resource.installType,
            };

            if (resource.installCommand) {
                guide.installCommand = resource.installCommand;
            }

            // Generate install instructions based on type
            switch (resource.installType) {
                case "npm":
                    guide.steps = [
                        `Install: npm install ${resource.title.replace(/^npm: /, "")}`,
                        resource.docsUrl ? `Documentation: ${resource.docsUrl}` : null,
                        resource.repositoryUrl ? `Source: ${resource.repositoryUrl}` : null,
                    ].filter(Boolean);
                    break;
                case "pip":
                    guide.steps = [
                        `Install: pip install ${resource.title.replace(/^pip: /, "")}`,
                        resource.docsUrl ? `Documentation: ${resource.docsUrl}` : null,
                        resource.repositoryUrl ? `Source: ${resource.repositoryUrl}` : null,
                    ].filter(Boolean);
                    break;
                case "github":
                    guide.steps = [
                        resource.repositoryUrl ? `Clone: git clone ${resource.repositoryUrl}` : null,
                        resource.url ? `Repository: ${resource.url}` : null,
                        "Follow the README for setup instructions",
                    ].filter(Boolean);
                    break;
                default:
                    guide.steps = [
                        resource.url ? `Visit: ${resource.url}` : null,
                        resource.docsUrl ? `Documentation: ${resource.docsUrl}` : null,
                        resource.repositoryUrl ? `Source: ${resource.repositoryUrl}` : null,
                    ].filter(Boolean);
            }

            // Add MCP-specific guidance for MCP servers
            if (resource.type === "mcp-server") {
                guide.mcpSetup = {
                    claudeDesktop: {
                        configPath: "~/Library/Application Support/Claude/claude_desktop_config.json",
                        exampleConfig: {
                            mcpServers: {
                                [resource.title.toLowerCase().replace(/\s+/g, "-")]: {
                                    command: "npx",
                                    args: ["-y", resource.title.toLowerCase().replace(/\s+/g, "-")],
                                },
                            },
                        },
                    },
                    note: "Add the above configuration to your Claude Desktop config to enable this MCP server.",
                };
            }

            // Add rule-specific guidance
            if (resource.type === "rule" || resource.type === "instruction") {
                guide.ruleSetup = {
                    cursor: "Add a .cursorrules file in your project root with the rule content",
                    windsurf: "Add a .windsurfrules file in your project root with the rule content",
                    copilot: "Add the instruction to your .github/copilot-instructions.md file",
                    source: resource.url,
                };
            }

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(guide, null, 2),
                }],
            };
        }
    );

    // ═══════════════════════════════════════════════════════════
    // Tool 5: analyze_stack
    // ═══════════════════════════════════════════════════════════
    server.tool(
        "analyze_stack",
        `Analyze a technology stack description and recommend complementary AI tools, skills, MCP servers, and rules that would enhance the developer's workflow. Use this when the user describes their project, tech stack, or development environment and could benefit from AI-powered tools.`,
        {
            stack: z.string().describe(
                "Description of the user's technology stack (e.g., 'Next.js, TypeScript, Prisma, Tailwind CSS, deployed on Vercel')"
            ),
            focus: z.enum([
                "coding-rules", "tools", "agents", "mcp-servers", "all"
            ]).optional().default("all").describe(
                "What kind of recommendations to focus on"
            ),
            maxResults: z.number().optional().default(15).describe("Max results per category"),
        },
        async ({ stack, focus, maxResults }) => {
            const max = Math.min(maxResults ?? 15, 30);
            const analysis = analyzePrompt(stack);

            const index = getIndex();
            const resources = loadResources();

            // Build targeted queries from detected technologies
            const queries = [
                stack,
                ...analysis.technologies.map(t => `${t} best practices`),
                ...analysis.technologies.map(t => `${t} tools`),
            ];

            const searchResults = index.multiSearch(queries, max * 10);

            // Determine type filters based on focus
            let typeFilter: ResourceType[] | undefined;
            switch (focus) {
                case "coding-rules":
                    typeFilter = ["rule", "instruction"];
                    break;
                case "tools":
                    typeFilter = ["tool", "skill"];
                    break;
                case "agents":
                    typeFilter = ["agent"];
                    break;
                case "mcp-servers":
                    typeFilter = ["mcp-server"];
                    break;
                default:
                    typeFilter = undefined;
            }

            const ranked = rankResources(searchResults, analysis, resources, {
                maxResults: max * 3,
                typeFilter,
            });

            const deduped = deduplicateResults(ranked).slice(0, max);

            // Group by type for organized output
            const grouped: Record<string, Array<{
                title: string;
                description: string;
                url: string;
                relevanceScore: number;
                installCommand?: string;
                ecosystem: string;
            }>> = {};

            for (const { resource, score } of deduped) {
                const type = resource.type;
                if (!grouped[type]) grouped[type] = [];
                grouped[type].push({
                    title: resource.title,
                    description: resource.description,
                    url: resource.url,
                    relevanceScore: Math.round(score * 100) / 100,
                    installCommand: resource.installCommand,
                    ecosystem: resource.ecosystem,
                });
            }

            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify({
                        stack,
                        detectedTechnologies: analysis.technologies,
                        taskCategories: analysis.categories,
                        resultCount: deduped.length,
                        recommendations: grouped,
                    }, null, 2),
                }],
            };
        }
    );

    return server;
}
