
import { GoogleGenerativeAI, SchemaType, Tool } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createList, createCard, addLabel, setDueDate, assignMember, getBoardMembers, setCardDescription, addCardComment, moveCard, deleteCard, archiveCard } from "@/app/lib/ai-actions";

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
            {
                name: "moveCard",
                description: "Moves a card to a different list.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        cardTitle: { type: SchemaType.STRING, description: "The name of the card to move." },
                        targetListName: { type: SchemaType.STRING, description: "The name of the destination list." },
                    },
                    required: ["cardTitle", "targetListName"],
                },
            },
            {
                name: "deleteCard",
                description: "Permanently deletes a card.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        cardTitle: { type: SchemaType.STRING, description: "The name of the card to delete." },
                    },
                    required: ["cardTitle"],
                },
            },
            {
                name: "archiveCard",
                description: "Archives a card.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        cardTitle: { type: SchemaType.STRING, description: "The name of the card to archive." },
                    },
                    required: ["cardTitle"],
                },
            },
            {
                name: "addLabel",
                description: "Adds a label to a card. Creates the label if it doesn't exist.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        cardTitle: { type: SchemaType.STRING, description: "The name of the card." },
                        labelName: { type: SchemaType.STRING, description: "The text of the label." },
                        color: { type: SchemaType.STRING, description: "Color name (e.g., red, blue, green). Optional." },
                    },
                    required: ["cardTitle", "labelName"],
                },
            },
            {
                name: "setDueDate",
                description: "Sets a due date for a card.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        cardTitle: { type: SchemaType.STRING, description: "The name of the card." },
                        date: { type: SchemaType.STRING, description: "The due date (YYYY-MM-DD or 'tomorrow', 'today')." },
                    },
                    required: ["cardTitle", "date"],
                },
            },

            {
                name: "assignMember",
                description: "Assigns a member to a card.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        cardTitle: { type: SchemaType.STRING, description: "The name of the card." },
                        memberName: { type: SchemaType.STRING, description: "The name or email of the member." },
                    },
                    required: ["cardTitle", "memberName"],
                },
            },
            {
                name: "listMembers",
                description: "Lists all members of the board.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {},
                },
            },
            {
                name: "addDescription",
                description: "Adds or updates the description of a card.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        cardTitle: { type: SchemaType.STRING, description: "The name of the card." },
                        description: { type: SchemaType.STRING, description: "The content of the description." },
                    },
                    required: ["cardTitle", "description"],
                },
            },
            {
                name: "addComment",
                description: "Adds a comment to a card.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        cardTitle: { type: SchemaType.STRING, description: "The name of the card." },
                        comment: { type: SchemaType.STRING, description: "The comment text." },
                    },
                    required: ["cardTitle", "comment"],
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
        const session = await getServerSession(authOptions);
        if (!session || !session.user?.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // We might need the full user object for userId, assuming session contains it or we fetch it.
        // Usually session.user.id is available if configured in authOptions callbacks. 
        // If not, we fetch user by email.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let userId = (session.user as any).id;
        if (!userId) {
            // Fallback fetch if id not in session
            const user = await import("@/app/lib/prisma").then(m => m.prisma.user.findUnique({ where: { email: session.user?.email || "" } }));
            if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
            userId = user.id;
        }

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
                } else if (name === "addLabel") {
                    try {
                        await addLabel(boardId, typedArgs.cardTitle, typedArgs.labelName, typedArgs.color);
                        confirmationMessage = `I've added the label "${typedArgs.labelName}" to card "${typedArgs.cardTitle}".`;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                        confirmationMessage = `Failed to add label: ${e.message}`;
                    }
                } else if (name === "setDueDate") {
                    try {
                        await setDueDate(boardId, typedArgs.cardTitle, typedArgs.date);
                        confirmationMessage = `I've set the due date for "${typedArgs.cardTitle}" to ${typedArgs.date}.`;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                        confirmationMessage = `Failed to set due date: ${e.message}`;
                    }
                } else if (name === "assignMember") {
                    try {
                        await assignMember(boardId, typedArgs.cardTitle, typedArgs.memberName);
                        confirmationMessage = `I've assigned "${typedArgs.memberName}" to card "${typedArgs.cardTitle}".`;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                        confirmationMessage = `Failed to assign member: ${e.message}`;
                    }
                } else if (name === "listMembers") {
                    const members = await getBoardMembers(boardId);
                    confirmationMessage = `The members of this board are: ${members}`;
                } else if (name === "addDescription") {
                    try {
                        await setCardDescription(boardId, typedArgs.cardTitle, typedArgs.description);
                        confirmationMessage = `I've updated the description for card "${typedArgs.cardTitle}".`;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                        confirmationMessage = `Failed to update description: ${e.message}`;
                    }
                } else if (name === "addComment") {
                    try {
                        await addCardComment(boardId, typedArgs.cardTitle, typedArgs.comment, userId);
                        confirmationMessage = `I've added a comment to card "${typedArgs.cardTitle}".`;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                        confirmationMessage = `Failed to add comment: ${e.message}`;
                    }
                } else if (name === "moveCard") {
                    try {
                        await moveCard(boardId, typedArgs.cardTitle, typedArgs.targetListName);
                        confirmationMessage = `I've moved the card "${typedArgs.cardTitle}" to logic list "${typedArgs.targetListName}".`;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                        confirmationMessage = `Failed to move card: ${e.message}`;
                    }
                } else if (name === "deleteCard") {
                    try {
                        await deleteCard(boardId, typedArgs.cardTitle);
                        confirmationMessage = `I've deleted the card "${typedArgs.cardTitle}".`;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                        confirmationMessage = `Failed to delete card: ${e.message}`;
                    }
                } else if (name === "archiveCard") {
                    try {
                        await archiveCard(boardId, typedArgs.cardTitle);
                        confirmationMessage = `I've archived the card "${typedArgs.cardTitle}".`;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } catch (e: any) {
                        confirmationMessage = `Failed to archive card: ${e.message}`;
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
