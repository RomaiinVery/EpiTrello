import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, UserPlus, Zap, Plus, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ...



interface AutomationAction {
    type: string;
    value?: string;
}

interface AutomationRule {
    id: string;
    triggerType: string;
    triggerVal: string;
    actions: AutomationAction[];
    isActive: boolean;
}

interface Label {
    id: string;
    name: string;
    color: string;
}

interface Member {
    id: string;
    name: string;
    email: string;
    profileImage?: string;
}

interface AutomationModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
    lists: { id: string; title: string }[];
    onInvite?: () => void;
}

export function AutomationModal({ isOpen, onClose, boardId, lists, onInvite }: AutomationModalProps) {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [labels, setLabels] = useState<Label[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState<"LIST" | "CREATE">("LIST");

    // Management State
    const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
    const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

    // Form State
    const [triggerType, setTriggerType] = useState("CARD_MOVED_TO_LIST");
    const [triggerVal, setTriggerVal] = useState("");

    // Action Builder State
    const [actions, setActions] = useState<AutomationAction[]>([]);
    const [newActionType, setNewActionType] = useState("ARCHIVE_CARD");
    const [newActionVal, setNewActionVal] = useState("");

    const [dateVal, setDateVal] = useState<Date | undefined>(undefined);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchRules();
            fetchLabels();
            fetchMembers();
            setView("LIST");
            resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, boardId]);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/boards/${boardId}/automations`, {
                cache: "no-store",
                headers: { "Pragma": "no-cache" }
            });
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

    const fetchMembers = async () => {
        try {
            const res = await fetch(`/api/boards/${boardId}/members`);
            if (res.ok) {
                setMembers(await res.json());
            }
        } catch (error) {
            console.error("Failed to load members", error);
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
        setActions([...rule.actions]);
        setView("CREATE");
    };

    const resetForm = () => {
        setEditingRule(null);
        setTriggerVal("");
        setActions([]);
        setNewActionType("ARCHIVE_CARD");
        setNewActionVal("");
        setTriggerType("CARD_MOVED_TO_LIST");
    };

    const handleSave = async () => {
        if (!triggerVal) return;
        if (actions.length === 0) return;

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
                    actions,
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

    const getActionDescription = (action: AutomationAction) => {
        switch (action.type) {
            case "ARCHIVE_CARD": return "Archive Card";
            case "MARK_AS_DONE": return "Mark as Done";
            case "ADD_LABEL":
                const label = labels.find(l => l.id === action.value);
                return `Add Label "${label?.name || "Unknown"}"`;
            case "MOVE_CARD":
                return `Move to "${getListName(action.value || "")}"`;
            case "ASSIGN_MEMBER":
                const member = members.find(m => m.id === action.value);
                return `Assign to ${member?.name || "Unknown Member"}`;
            case "SET_DUE_DATE":
                if (action.value === "TODAY") return "Set Due Date to Today";
                if (action.value === "TOMORROW") return "Set Due Date to Tomorrow";
                try {
                    return `Set Due Date to ${format(new Date(action.value || ""), "PPP")}`;
                } catch {
                    return `Set Due Date to ${action.value}`;
                }
            case "REMOVE_LABEL":
                const rLabel = labels.find(l => l.id === action.value);
                return `Remove Label "${rLabel?.name || "Unknown"}"`;
            default: return "Unknown Action";
        }
    }

    const getTriggerDescription = (rule: AutomationRule) => {
        if (rule.triggerType === "CARD_MOVED_TO_LIST") return "Card moved to";
        if (rule.triggerType === "CARD_CREATED") return "Card created in";
        return rule.triggerType;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl min-h-[500px] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Zap className="text-yellow-500 w-5 h-5 fill-current" />
                        Board Automations
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1">
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
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
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

                                            <div className="flex flex-col gap-1 text-sm flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                                                        WHEN
                                                    </span>
                                                    <span>{getTriggerDescription(rule)}</span>
                                                    <span className="font-medium underline decoration-dotted">
                                                        {getListName(rule.triggerVal)}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <span className="font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs mt-0.5">
                                                        THEN
                                                    </span>
                                                    <div className="flex flex-col gap-1">
                                                        {rule.actions.map((action, idx) => (
                                                            <div key={idx} className="bg-gray-50 px-2 py-0.5 rounded border text-gray-700">
                                                                {getActionDescription(action)}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-start mt-1">
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
                        <div className="space-y-6 h-full flex flex-col">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="font-semibold">{editingRule ? "Edit Rule" : "New Rule"}</h3>
                                <Button variant="ghost" size="sm" onClick={() => setView("LIST")}>Cancel</Button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-6 p-1">
                                {/* TRIGGER SECTION */}
                                <div className="space-y-4 p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                                    <h4 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">1</div>
                                        Trigger
                                    </h4>
                                    <div className="pl-8 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium w-16 text-gray-600">Event</span>
                                            <select
                                                className="flex-1 p-2 border rounded bg-white shadow-sm text-sm"
                                                value={triggerType}
                                                onChange={(e) => setTriggerType(e.target.value)}
                                                disabled={!!editingRule}
                                            >
                                                <option value="CARD_MOVED_TO_LIST">Card is moved to...</option>
                                                <option value="CARD_CREATED">Card is created in...</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium w-16 text-gray-600">List</span>
                                            <select
                                                className="flex-1 p-2 border rounded bg-white shadow-sm text-sm"
                                                value={triggerVal}
                                                onChange={(e) => setTriggerVal(e.target.value)}
                                            >
                                                <option value="">Select a list...</option>
                                                {lists.map(list => (
                                                    <option key={list.id} value={list.id}>{list.title}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* ACTIONS SECTION */}
                                <div className="space-y-4 p-4 bg-green-50/50 rounded-lg border border-green-100">
                                    <h4 className="font-semibold text-green-900 text-sm flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-green-200 flex items-center justify-center text-xs font-bold text-green-700">2</div>
                                        Actions
                                    </h4>

                                    <div className="pl-8 space-y-4">
                                        {actions.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic">No actions added yet.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {actions.map((action, index) => (
                                                    <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border shadow-sm">
                                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono font-bold">
                                                            {index + 1}
                                                        </span>
                                                        <span className="text-sm flex-1">{getActionDescription(action)}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                                            onClick={() => {
                                                                const newActions = [...actions];
                                                                newActions.splice(index, 1);
                                                                setActions(newActions);
                                                            }}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="pt-2 border-t mt-4">
                                            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Add Action</p>
                                            <div className="space-y-3 p-3 bg-white rounded border border-dashed">
                                                <div className="flex items-center gap-3">
                                                    <select
                                                        className="flex-1 p-2 border rounded bg-white shadow-sm text-sm"
                                                        value={newActionType}
                                                        onChange={(e) => {
                                                            setNewActionType(e.target.value);
                                                            setNewActionVal("");
                                                            setDateVal(undefined);
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

                                                {(newActionType === "ADD_LABEL" || newActionType === "REMOVE_LABEL") && (
                                                    <select
                                                        className="w-full p-2 border rounded bg-white shadow-sm text-sm"
                                                        value={newActionVal}
                                                        onChange={(e) => setNewActionVal(e.target.value)}
                                                    >
                                                        <option value="">Select a label...</option>
                                                        {labels.map(label => (
                                                            <option key={label.id} value={label.id}>
                                                                {label.name} ({label.color})
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}

                                                {newActionType === "MOVE_CARD" && (
                                                    <select
                                                        className="w-full p-2 border rounded bg-white shadow-sm text-sm"
                                                        value={newActionVal}
                                                        onChange={(e) => setNewActionVal(e.target.value)}
                                                    >
                                                        <option value="">Select a list...</option>
                                                        {lists.map(list => (
                                                            <option key={list.id} value={list.id}>{list.title}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {newActionType === "ASSIGN_MEMBER" && (
                                                    <div className="space-y-2">
                                                        <select
                                                            className="w-full p-2 border rounded bg-white shadow-sm text-sm"
                                                            value={newActionVal}
                                                            onChange={(e) => setNewActionVal(e.target.value)}
                                                        >
                                                            <option value="">Select a member...</option>
                                                            {members.map(member => (
                                                                <option key={member.id} value={member.id}>{member.name || member.email}</option>
                                                            ))}
                                                        </select>
                                                        {members.length === 0 && (
                                                            <div className="text-xs text-gray-500 flex items-center gap-2">
                                                                No members found.
                                                                {onInvite && (
                                                                    <Button variant="link" className="p-0 h-auto font-normal text-blue-600 text-xs" onClick={onInvite}>
                                                                        <UserPlus className="w-3 h-3 mr-1" />
                                                                        Invite a member
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {newActionType === "SET_DUE_DATE" && (
                                                    <div className="flex gap-2">
                                                        <select
                                                            className="w-[140px] p-2 border rounded bg-white shadow-sm text-sm"
                                                            value={newActionVal}
                                                            onChange={(e) => {
                                                                setNewActionVal(e.target.value);
                                                                if (e.target.value === "TODAY" || e.target.value === "TOMORROW") {
                                                                    setDateVal(undefined);
                                                                }
                                                            }}
                                                        >
                                                            <option value="">Select...</option>
                                                            <option value="TODAY">Today</option>
                                                            <option value="TOMORROW">Tomorrow</option>
                                                            <option value="CUSTOM">Specific Date</option>
                                                        </select>

                                                        {(newActionVal === "CUSTOM" || (!["TODAY", "TOMORROW", ""].includes(newActionVal))) && (
                                                            <Popover>
                                                                <PopoverTrigger asChild>
                                                                    <Button
                                                                        variant={"outline"}
                                                                        className={cn(
                                                                            "flex-1 justify-start text-left font-normal",
                                                                            !dateVal && "text-muted-foreground"
                                                                        )}
                                                                    >
                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                        {dateVal ? format(dateVal, "PPP") : <span>Pick a date</span>}
                                                                    </Button>
                                                                </PopoverTrigger>
                                                                <PopoverContent className="w-auto p-0" align="start">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={dateVal}
                                                                        onSelect={(date) => {
                                                                            setDateVal(date);
                                                                            setNewActionVal(date ? date.toISOString() : "CUSTOM");
                                                                        }}
                                                                        initialFocus
                                                                    />
                                                                </PopoverContent>
                                                            </Popover>
                                                        )}
                                                    </div>
                                                )}

                                                <Button
                                                    onClick={() => {
                                                        if (newActionType && (
                                                            !["ADD_LABEL", "MOVE_CARD", "ASSIGN_MEMBER", "SET_DUE_DATE", "REMOVE_LABEL"].includes(newActionType) || newActionVal
                                                        )) {
                                                            setActions([...actions, { type: newActionType, value: newActionVal || undefined }]);
                                                            setNewActionVal("");
                                                            setDateVal(undefined);
                                                        }
                                                    }}
                                                    disabled={
                                                        (["ADD_LABEL", "MOVE_CARD", "ASSIGN_MEMBER", "SET_DUE_DATE", "REMOVE_LABEL"].includes(newActionType) && !newActionVal)
                                                    }
                                                    className="w-full mt-2"
                                                    variant="secondary"
                                                    size="sm"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add Action
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 gap-2 border-t mt-auto">
                                <Button onClick={handleSave} disabled={
                                    !triggerVal ||
                                    saving ||
                                    actions.length === 0
                                }>
                                    {saving ? "Saving..." : (editingRule ? "Update Rule" : "Create Rule")}
                                </Button>
                            </div>
                        </div>
                    )
                    }
                </div >
            </DialogContent >
        </Dialog >
    );
}
