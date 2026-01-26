
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { BarChart as BarChartIcon, PieChart as PieChartIcon, Activity, CheckCircle, List as ListIcon } from "lucide-react";

interface AnalyticsData {
    totalCards: number;
    completedCards: number;
    listDistribution: { name: string; value: number }[];
    memberDistribution: { name: string; value: number }[];
}

interface AnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    boardId: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export function AnalyticsModal({ isOpen, onClose, boardId }: AnalyticsModalProps) {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [chartView, setChartView] = useState<"LIST" | "MEMBER">("LIST");

    useEffect(() => {
        if (isOpen) {
            fetchAnalytics();
        }
    }, [isOpen, boardId]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/boards/${boardId}/analytics`, {
                cache: "no-store",
            });
            if (res.ok) {
                setData(await res.json());
            }
        } catch (error) {
            console.error("Failed to load analytics", error);
        } finally {
            setLoading(false);
        }
    };

    const completionRate = data
        ? data.totalCards > 0
            ? Math.round((data.completedCards / data.totalCards) * 100)
            : 0
        : 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl min-h-[600px] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Activity className="text-blue-600 w-6 h-6" />
                        Board Analytics
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-gray-500 animate-pulse">Loading data...</div>
                    </div>
                ) : !data ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-red-500">Failed to load analytics.</div>
                    </div>
                ) : (
                    <div className="flex-1 space-y-6 pt-4">
                        {/* Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Total Cards
                                    </CardTitle>
                                    <ListIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{data.totalCards}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Active on board
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Completed
                                    </CardTitle>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{data.completedCards}</div>
                                    <p className="text-xs text-muted-foreground">
                                        Tasks finished
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        Completion Rate
                                    </CardTitle>
                                    <Activity className="h-4 w-4 text-blue-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{completionRate}%</div>
                                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                        <div
                                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                                            style={{ width: `${completionRate}%` }}
                                        ></div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Visual Breakdown</h3>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setChartView("LIST")}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${chartView === "LIST"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-900"
                                            }`}
                                    >
                                        <BarChartIcon className="w-4 h-4" />
                                        By List
                                    </button>
                                    <button
                                        onClick={() => setChartView("MEMBER")}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${chartView === "MEMBER"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-900"
                                            }`}
                                    >
                                        <PieChartIcon className="w-4 h-4" />
                                        By Member
                                    </button>
                                </div>
                            </div>

                            <div className="h-[350px] w-full bg-white rounded-lg border p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartView === "LIST" ? (
                                        <BarChart data={data.listDistribution}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                stroke="#888888"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                stroke="#888888"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(value) => `${value}`}
                                            />
                                            <Tooltip
                                                cursor={{ fill: "transparent" }}
                                                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                                            />
                                            <Bar
                                                dataKey="value"
                                                fill="#3b82f6"
                                                radius={[4, 4, 0, 0]}
                                                name="Cards"
                                            />
                                        </BarChart>
                                    ) : (
                                        <PieChart>
                                            <Pie
                                                data={data.memberDistribution}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }: any) =>
                                                    `${name} ${((percent || 0) * 100).toFixed(0)}%`
                                                }
                                                outerRadius={120}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {data.memberDistribution.map((entry, index) => (
                                                    <Cell
                                                        key={`cell-${index}`}
                                                        fill={COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
