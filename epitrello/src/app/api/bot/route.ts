import { NextResponse } from "next/server";
import { geminiModel } from "@/lib/gemini";
import { prisma } from "@/app/lib/prisma";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const commandSchema = z.object({
    action: z.enum(["create_workspace", "create_board", "unknown"]),
    params: z.object({
        title: z.string().optional(),
        workspaceName: z.string().optional(),
    }),
    response: z.string(),
});

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const { message } = await req.json();

        const prompt = `
      You are an automation assistant for EpiTrello.
      Translate the user's natural language request into a structured JSON command.
      
      Available actions:
      - create_workspace (params: title)
      - create_board (params: title, workspaceName)
      
      If the request is unclear or unrelated, set action to "unknown" and provide a helpful response.
      
      User Request: "${message}"
      
      Output JSON format:
      {
        "action": "create_workspace" | "create_board" | "unknown",
        "params": {
          "title": "string",
          "workspaceName": "string (only for create_board)"
        },
        "response": "A natural language response to show the user what is happening or to ask for clarification."
      }
    `;

        const result = await geminiModel.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up markdown code blocks if present
        const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

        let parsedCommand;
        try {
            parsedCommand = JSON.parse(cleanJson);
            // Validate with Zod
            // We parse loosely first to avoid crashing if LLM hallucinates extra fields
        } catch {
            console.error("Failed to parse LLM response:", responseText);
            return NextResponse.json({
                role: "bot",
                content: "Désolé, j'ai eu du mal à comprendre votre demande. Pourriez-vous reformuler ?"
            });
        }

        const command = commandSchema.safeParse(parsedCommand);

        if (!command.success) {
            return NextResponse.json({
                role: "bot",
                content: "Je n'ai pas compris cette commande. Essayez 'Créer un workspace X' ou 'Créer un board Y'."
            });
        }

        const { action, params, response } = command.data;

        if (action === "create_workspace" && params.title) {
            const workspace = await prisma.workspace.create({
                data: {
                    title: params.title,
                    userId: user.id,
                },
            });
            return NextResponse.json({
                role: "bot",
                content: `Succès ! Le workspace "${workspace.title}" a été créé.`,
                data: workspace
            });
        } else if (action === "create_board" && params.title && params.workspaceName) {
            // 1. Find workspace
            const workspace = await prisma.workspace.findFirst({
                where: {
                    title: { contains: params.workspaceName, mode: 'insensitive' },
                    userId: user.id
                }
            });

            if (!workspace) {
                return NextResponse.json({
                    role: "bot",
                    content: `Je ne trouve pas de workspace nommé "${params.workspaceName}".`
                });
            }

            // 2. Create Board
            const board = await prisma.board.create({
                data: {
                    title: params.title,
                    workspaceId: workspace.id,
                    userId: user.id,
                    lists: {
                        create: [
                            { title: "To Do", position: 0 },
                            { title: "Doing", position: 1 },
                            { title: "Done", position: 2 },
                        ],
                    },
                },
            });

            return NextResponse.json({
                role: "bot",
                content: `C'est fait ! Le board "${board.title}" a été ajouté au workspace "${workspace.title}".`,
                data: board
            });
        }

        // Default or Unknown
        return NextResponse.json({
            role: "bot",
            content: response
        });

    } catch (error) {
        console.error("Bot Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
