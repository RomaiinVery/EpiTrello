
import { GoogleGenerativeAI, SchemaType, Tool } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createList, createCard } from "@/app/lib/ai-actions";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");

const tools = [
    {
        functionDeclarations: [
            {
                name: "createList",
                description: "Creates a new list on the board.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        title: { type: SchemaType.STRING, description: "The title of the new list." },
                    },
                    required: ["title"],
                },
            },
            {
                name: "createCard",
                description: "Creates a new card in a specific list.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        listName: { type: SchemaType.STRING, description: "The name of the list to add the card to." },
                        cardTitle: { type: SchemaType.STRING, description: "The title of the new card." },
                    },
                    required: ["listName", "cardTitle"],
                },
            },
        ],
    },
];

const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    tools: tools as unknown as Tool[],
});

export async function POST(req: Request) {
    try {
        const { messages, boardId } = await req.json();

        if (!boardId) {
            return NextResponse.json({ error: "Board ID is required" }, { status: 400 });
        }

        // Format history for Gemini (excluding the last user message which is the prompt)
        // simplistic history: just join them for context or use chatSession if possible.
        // For simplicity in this stateless route, we'll start a chat with history.

        // Convert Vercel/Standard UI messages to Gemini format
        // role: 'user' | 'model'
        const history = messages.slice(0, -1).map((m: { role: string, content: string }) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
        }));

        const lastMessage = messages[messages.length - 1];
        const chat = model.startChat({
            history: history,
        });

        const result = await chat.sendMessage(lastMessage.content);
        const response = await result.response;
        const call = response.functionCalls();

        if (call && call.length > 0) {
            const results = [];

            for (const functionCall of call) {
                const { name, args } = functionCall;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const typedArgs = args as any;
                let confirmationMessage = "";

                if (name === "createList") {
                    await createList(boardId, typedArgs.title);
                    confirmationMessage = `I've created the list "${typedArgs.title}".`;
                } else if (name === "createCard") {
                    try {
                        await createCard(boardId, typedArgs.listName, typedArgs.cardTitle);
                        confirmationMessage = `I've added the card "${typedArgs.cardTitle}" to the "${typedArgs.listName}" list.`;
                    } catch {
                        confirmationMessage = `I couldn't find a list named "${typedArgs.listName}". Please create it first.`;
                    }
                }
                results.push(confirmationMessage);
            }

            return NextResponse.json({
                role: "assistant",
                content: results.join(" "),
                actionPerformed: true
            });
        }

        return NextResponse.json({
            role: "assistant",
            content: response.text()
        });

    } catch (error) {
        console.error("AI Chat Error:", error);
        return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 });
    }
}
