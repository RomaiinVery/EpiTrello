"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Zap, Plus, Trash2, X, Pencil, AlertTriangle } from "lucide-react";

interface AutomationRule {
    id: string;
    triggerType: string;
    triggerVal: string;
    actionType: string;
    actionVal?: string;
    isActive: boolean;
}

interface Label {
    id: string;
    name: string;
    color: string;
}

interface AutomationModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
    lists: { id: string; title: string }[];
}

export function AutomationModal({ isOpen, onClose, boardId, lists }: AutomationModalProps) {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<"LIST" | "CREATE">("LIST");

    // Management State
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

    // Form State
    const [triggerType, setTriggerType] = useState("CARD_MOVED_TO_LIST");
    const [triggerVal, setTriggerVal] = useState("");
    const [actionType, setActionType] = useState("ARCHIVE_CARD");
    const [actionVal, setActionVal] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchRules();
            fetchLabels();
            setView("LIST");
            resetForm();
        }
    }, [isOpen, boardId]);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/boards/${boardId}/automations`);
            if (res.ok) {
                setRules(await res.json());
            }
        } catch (error) {
            console.error("Failed to load automations", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLabels = async () => {
        try {
            const res = await fetch(`/api/boards/${boardId}/labels`);
            if (res.ok) {
                setLabels(await res.json());
            }
        } catch (error) {
            console.error("Failed to load labels", error);
        }
    };

    const handleDelete = async (ruleId: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/boards/${boardId}/automations/${ruleId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                await fetchRules();
                setRuleToDelete(null);
            }
        } catch (e) {
            console.error("Failed to delete rule", e);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (rule: AutomationRule) => {
        setEditingRule(rule);
        setTriggerType(rule.triggerType);
        setTriggerVal(rule.triggerVal);
        setActionType(rule.actionType);
        setActionVal(rule.actionVal || "");
        setView("CREATE");
    };

    const resetForm = () => {
        setEditingRule(null);
        setTriggerVal("");
        setActionVal("");
        setActionType("ARCHIVE_CARD");
        setTriggerType("CARD_MOVED_TO_LIST");
    };

    const handleSave = async () => {
        if (!triggerVal) return;
        if (["ADD_LABEL", "MOVE_CARD", "ASSIGN_MEMBER", "SET_DUE_DATE", "REMOVE_LABEL"].includes(actionType) && !actionVal) return;

        setSaving(true);
        try {
            const url = editingRule
                ? `/api/boards/${boardId}/automations/${editingRule.id}`
                : `/api/boards/${boardId}/automations`;

            const method = editingRule ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    triggerType,
                    triggerVal,
                    actionType,
                    actionVal: ["ADD_LABEL", "MOVE_CARD", "ASSIGN_MEMBER", "SET_DUE_DATE", "REMOVE_LABEL"].includes(actionType) ? actionVal : undefined,
                    isActive: true
                })
            });

            if (res.ok) {
                await fetchRules();
                setView("LIST");
                resetForm();
            }
        } catch (e) {
            console.error("Failed to save rule", e);
        } finally {
            setSaving(false);
        }
    };

    const getListName = (listId: string) => {
        return lists.find(l => l.id === listId)?.title || "Unknown List";
    }

    const getActionDescription = (rule: AutomationRule) => {
        switch (rule.actionType) {
            case "ARCHIVE_CARD": return "Archive Card";
            case "MARK_AS_DONE": return "Mark as Done";
            case "ADD_LABEL":
                const label = labels.find(l => l.id === rule.actionVal);
                return `Add Label "${label?.name || "Unknown"}"`;
            case "MOVE_CARD":
                return `Move to "${getListName(rule.actionVal || "")}"`;
            case "ASSIGN_MEMBER":
                return `Assign to Member`;
            case "SET_DUE_DATE":
                return `Set Due Date to ${rule.actionVal}`;
            case "REMOVE_LABEL":
                const rLabel = labels.find(l => l.id === rule.actionVal);
                return `Remove Label "${rLabel?.name || "Unknown"}"`;
            default: return rule.actionType;
        }
    }

    const getTriggerDescription = (rule: AutomationRule) => {
        if (rule.triggerType === "CARD_MOVED_TO_LIST") return "Card moved to";
        if (rule.triggerType === "CARD_CREATED") return "Card created in";
        return rule.triggerType;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="text-yellow-500 w-5 h-5 fill-current" />
                        Board Automations
                    </DialogTitle>
                </DialogHeader>

                <div className="min-h-[300px]">
                    {view === "LIST" ? (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <p className="text-sm text-gray-500">
                                    Automations allow you to configure actions triggered by events on your board.
                                </p>
                                <Button onClick={() => { resetForm(); setView("CREATE"); }} size="sm">
                                    <Plus className="w-4 h-4 mr-1" />
                                    Create Rule
                                </Button>
                            </div>

                            {loading ? (
                                <div className="text-center py-10 text-gray-500">Loading...</div>
                            ) : rules.length === 0 ? (
                                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed">
                                    <p className="text-gray-500">No automations configured yet.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {rules.map(rule => (
                                        <div key={rule.id} className="relative p-3 bg-white border rounded-lg flex items-center justify-between shadow-sm group overflow-hidden">
                                            {ruleToDelete === rule.id ? (
                                                <div className="absolute inset-0 bg-red-50 flex items-center justify-between px-4 z-10 animate-in fade-in zoom-in-95 duration-200">
                                                    <div className="flex items-center gap-2 text-red-600 font-medium">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        <span>Delete this rule?</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button size="sm" variant="ghost" className="h-7 text-gray-600 hover:text-gray-900" onClick={() => setRuleToDelete(null)}>Cancel</Button>
                                                        <Button size="sm" variant="destructive" className="h-7" onClick={() => handleDelete(rule.id)}>Delete</Button>
                                                    </div>
                                                </div>
                                            ) : null}

                                            <div className="flex items-center gap-2 text-sm flex-1">
                                                <span className="font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                    WHEN
                                                </span>
                                                <span>{getTriggerDescription(rule)}</span>
                                                <span className="font-medium underline decoration-dotted">
                                                    {getListName(rule.triggerVal)}
                                                </span>
                                                <span className="font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded ml-2">
                                                    THEN
                                                </span>
                                                <span>{getActionDescription(rule)}</span>
                                            </div>

                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-blue-600" onClick={() => startEdit(rule)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={() => setRuleToDelete(rule.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="font-semibold">{editingRule ? "Edit Rule" : "New Rule"}</h3>
                                <Button variant="ghost" size="sm" onClick={() => setView("LIST")}>Cancel</Button>
                            </div>

                            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
                                <div className="flex items-center gap-3">
                                    <div className="w-20 font-bold text-right text-gray-600">WHEN</div>
                                    <select
                                        className="flex-1 p-2 border rounded bg-white shadow-sm"
                                        value={triggerType}
                                        onChange={(e) => setTriggerType(e.target.value)}
                                        disabled={!!editingRule}
                                    >
                                        <option value="CARD_MOVED_TO_LIST">Card is moved to...</option>
                                        <option value="CARD_CREATED">Card is created in...</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-20"></div>
                                    <select
                                        className="flex-1 p-2 border rounded bg-white shadow-sm"
                                        value={triggerVal}
                                        onChange={(e) => setTriggerVal(e.target.value)}
                                    >
                                        <option value="">Select a list...</option>
                                        {lists.map(list => (
                                            <option key={list.id} value={list.id}>{list.title}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 mt-6">
                                    <div className="w-20 font-bold text-right text-gray-600">THEN</div>
                                    <select
                                        className="flex-1 p-2 border rounded bg-white shadow-sm"
                                        value={actionType}
                                        onChange={(e) => {
                                            setActionType(e.target.value);
                                            setActionVal("");
                                        }}
                                    >
                                        <option value="ARCHIVE_CARD">Archive the card</option>
                                        <option value="MARK_AS_DONE">Mark as done</option>
                                        <option value="ADD_LABEL">Add a label</option>
                                        <option value="REMOVE_LABEL">Remove a label</option>
                                        <option value="MOVE_CARD">Move to another list</option>
                                        <option value="SET_DUE_DATE">Set due date</option>
                                        <option value="ASSIGN_MEMBER">Assign to member</option>
                                    </select>
                                </div>

                                {(actionType === "ADD_LABEL" || actionType === "REMOVE_LABEL") && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-20"></div>
                                        <select
                                            className="flex-1 p-2 border rounded bg-white shadow-sm"
                                            value={actionVal}
                                            onChange={(e) => setActionVal(e.target.value)}
                                        >
                                            <option value="">Select a label...</option>
                                            {labels.map(label => (
                                                <option key={label.id} value={label.id}>
                                                    {label.name} ({label.color})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {actionType === "MOVE_CARD" && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-20"></div>
                                        <select
                                            className="flex-1 p-2 border rounded bg-white shadow-sm"
                                            value={actionVal}
                                            onChange={(e) => setActionVal(e.target.value)}
                                        >
                                            <option value="">Select a list...</option>
                                            {lists.map(list => (
                                                <option key={list.id} value={list.id}>{list.title}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {actionType === "SET_DUE_DATE" && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-20"></div>
                                        <select
                                            className="flex-1 p-2 border rounded bg-white shadow-sm"
                                            value={actionVal}
                                            onChange={(e) => setActionVal(e.target.value)}
                                        >
                                            <option value="">Select date...</option>
                                            <option value="TODAY">Today</option>
                                            <option value="TOMORROW">Tomorrow</option>
                                        </select>
                                    </div>
                                )}

                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSave} disabled={
                                    !triggerVal ||
                                    saving ||
                                    (["ADD_LABEL", "MOVE_CARD", "ASSIGN_MEMBER", "SET_DUE_DATE", "REMOVE_LABEL"].includes(actionType) && !actionVal)
                                }>
                                    {saving ? "Saving..." : (editingRule ? "Update Rule" : "Create Rule")}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
