
import { GoogleGenerativeAI, SchemaType, Tool } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createList, createCard, addLabel, setDueDate, assignMember, getBoardMembers, setCardDescription, addCardComment, moveCard, deleteCard, archiveCard, getBoardData, getArchivedCards } from "@/app/lib/ai-actions";

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
                name: "readBoard",
                description: "Reads the content of the board (lists, cards, details) to answer questions or summarize status.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {},
                },
            },
            {
                name: "listArchivedCards",
                description: "Lists all cards that are currently archived.",
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
        let call = result.response.functionCalls();
        let finalText = result.response.text();
        let hasAction = false;
        let loopCount = 0;
        const MAX_LOOPS = 5;

        while (call && call.length > 0 && loopCount < MAX_LOOPS) {
            loopCount++;

            const functionResponses = [];

            for (const functionCall of call) {
                const { name, args } = functionCall;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const typedArgs = args as any;
                let functionResult = {};

                try {
                    if (name === "createList") {
                        await createList(boardId, typedArgs.title);
                        functionResult = { success: true, message: `Created list "${typedArgs.title}"` };
                        hasAction = true;
                    } else if (name === "createCard") {
                        await createCard(boardId, typedArgs.listName, typedArgs.cardTitle);
                        functionResult = { success: true, message: `Created card "${typedArgs.cardTitle}" in "${typedArgs.listName}"` };
                        hasAction = true;
                    } else if (name === "addLabel") {
                        await addLabel(boardId, typedArgs.cardTitle, typedArgs.labelName, typedArgs.color);
                        functionResult = { success: true, message: `Added label "${typedArgs.labelName}" to "${typedArgs.cardTitle}"` };
                        hasAction = true;
                    } else if (name === "setDueDate") {
                        await setDueDate(boardId, typedArgs.cardTitle, typedArgs.date);
                        functionResult = { success: true, message: `Set due date for "${typedArgs.cardTitle}" to ${typedArgs.date}` };
                        hasAction = true;
                    } else if (name === "assignMember") {
                        await assignMember(boardId, typedArgs.cardTitle, typedArgs.memberName);
                        functionResult = { success: true, message: `Assigned "${typedArgs.memberName}" to "${typedArgs.cardTitle}"` };
                        hasAction = true;
                    } else if (name === "listMembers") {
                        const members = await getBoardMembers(boardId);
                        functionResult = { members };
                    } else if (name === "addDescription") {
                        await setCardDescription(boardId, typedArgs.cardTitle, typedArgs.description);
                        functionResult = { success: true, message: `Updated description for "${typedArgs.cardTitle}"` };
                        hasAction = true;
                    } else if (name === "addComment") {
                        await addCardComment(boardId, typedArgs.cardTitle, typedArgs.comment, userId);
                        functionResult = { success: true, message: `Added comment to "${typedArgs.cardTitle}"` };
                        hasAction = true;
                    } else if (name === "moveCard") {
                        await moveCard(boardId, typedArgs.cardTitle, typedArgs.targetListName);
                        functionResult = { success: true, message: `Moved card "${typedArgs.cardTitle}" to "${typedArgs.targetListName}"` };
                        hasAction = true;
                    } else if (name === "deleteCard") {
                        await deleteCard(boardId, typedArgs.cardTitle);
                        functionResult = { success: true, message: `Deleted card "${typedArgs.cardTitle}"` };
                        hasAction = true;
                    } else if (name === "archiveCard") {
                        await archiveCard(boardId, typedArgs.cardTitle);
                        functionResult = { success: true, message: `Archived card "${typedArgs.cardTitle}"` };
                        hasAction = true;
                    } else if (name === "readBoard") {
                        const boardData = await getBoardData(boardId);
                        functionResult = { boardData };
                    } else if (name === "listArchivedCards") {
                        const archived = await getArchivedCards(boardId);
                        functionResult = { archivedCards: archived };
                    }
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (e: any) {
                    functionResult = { error: e.message };
                }

                functionResponses.push({
                    functionResponse: {
                        name: name,
                        response: functionResult,
                    },
                });
            }

            // Send tool outputs back to the model to get the next step or final response
            const nextResult = await chat.sendMessage(functionResponses);
            const response = await nextResult.response;

            // Update call and finalText for the next iteration (or for the return value)
            call = response.functionCalls();
            finalText = response.text();
        }

        if (!finalText && hasAction) {
            finalText = "I have successfully completed your request.";
        }

        return NextResponse.json({
            role: "assistant",
            content: finalText,
            actionPerformed: hasAction
        });
    } catch (error) {
        console.error("AI Chat Error:", error);
        return NextResponse.json({ error: "Failed to process AI request" }, { status: 500 });
    }
}
