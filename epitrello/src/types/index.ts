export type Label = {
    id: string;
    name: string;
    color: string;
    boardId: string;
};

export type User = {
    id: string;
    email: string;
    name?: string | null;
    profileImage?: string | null;
};

export type CardDetail = {
    id: string;
    title: string;
    content?: string | null;
    listId: string;
    position: number;
    createdAt: string;
    updatedAt: string;
    archived: boolean;
    coverImage?: string | null;
    dueDate?: string | null;
    isDone?: boolean;
    labels?: Label[];
    members?: User[];
    list?: {
        id: string;
        title: string;
        boardId: string;
    };
    checklists?: Checklist[];
};

export type ChecklistItem = {
    id: string;
    text: string;
    checked: boolean;
    position: number;
    checklistId: string;
    createdAt: string;
    updatedAt: string;
};

export type Checklist = {
    id: string;
    title: string;
    position: number;
    cardId: string;
    items: ChecklistItem[];
    createdAt: string;
    updatedAt: string;
};

export type Comment = {
    id: string;
    content: string;
    cardId: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    user: User;
};

export type Activity = {
    id: string;
    type: string;
    description: string;
    cardId: string | null;
    boardId: string;
    userId: string;
    createdAt: string;
    metadata: Record<string, string | number | boolean | null | undefined>;
    user: User;
};
