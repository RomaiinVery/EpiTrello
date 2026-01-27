
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
    AreaChart,
    Area,
} from "recharts";
import { BarChart as BarChartIcon, PieChart as PieChartIcon, Activity, CheckCircle, List as ListIcon, Clock, TrendingUp, Download } from "lucide-react";

interface AnalyticsData {
    totalCards: number;
    completedCards: number;
    listDistribution: { name: string; value: number }[];
    memberDistribution: { name: string; value: number }[];
    timelineData: { date: string; created: number; completed: number }[];
    avgCompletionTimeHours: number;
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
    const [chartView, setChartView] = useState<"LIST" | "MEMBER" | "EVOLUTION">("EVOLUTION");
    const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

    useEffect(() => {
        if (isOpen) {
            fetchAnalytics();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, boardId, dateRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            let query = `/api/boards/${boardId}/analytics`;

            if (dateRange !== "all") {
                const endDate = new Date();
                const startDate = new Date();
                if (dateRange === "7d") startDate.setDate(endDate.getDate() - 7);
                if (dateRange === "30d") startDate.setDate(endDate.getDate() - 30);
                if (dateRange === "90d") startDate.setDate(endDate.getDate() - 90);

                query += `?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
            }

            const res = await fetch(query, {
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

    const handleExport = () => {
        window.open(`/api/boards/${boardId}/analytics/export`, "_blank");
    };

    const completionRate = data
        ? data.totalCards > 0
            ? Math.round((data.completedCards / data.totalCards) * 100)
            : 0
        : 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-[95vw] h-[90vh] flex flex-col">
                <DialogHeader className="flex flex-row items-center justify-between">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Activity className="text-blue-600 w-6 h-6" />
                        Board Analytics
                    </DialogTitle>

                    <div className="flex items-center gap-2">
                        <select
                            className="text-sm border rounded-md px-2 py-1 bg-white"
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as "7d" | "30d" | "90d" | "all")}
                        >
                            <option value="7d">Last 7 Days</option>



                            <option value="30d">Last 30 Days</option>
                            <option value="90d">Last 3 Months</option>
                            <option value="all">All Time</option>
                        </select>

                        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                            <Download className="w-4 h-4" />
                            Export CSV
                        </Button>
                    </div>
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
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
                                    <ListIcon className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{data.totalCards}</div>
                                    <p className="text-xs text-muted-foreground">Active in period</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{data.completedCards}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {completionRate}% completion rate
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                                        <div
                                            className="bg-green-500 h-1 rounded-full transition-all duration-500"
                                            style={{ width: `${completionRate}%` }}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Avg Time to Complete</CardTitle>
                                    <Clock className="h-4 w-4 text-orange-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{data.avgCompletionTimeHours}h</div>
                                    <p className="text-xs text-muted-foreground">~{(data.avgCompletionTimeHours / 24).toFixed(1)} days</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">Completion Velocity</CardTitle>
                                    <TrendingUp className="h-4 w-4 text-purple-500" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">
                                        {(data.completedCards / (dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 1)).toFixed(1)}
                                    </div>
                                    <p className="text-xs text-muted-foreground">Cards / day</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Charts Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold">Visual Breakdown</h3>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setChartView("EVOLUTION")}
                                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${chartView === "EVOLUTION"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-900"
                                            }`}
                                    >
                                        <TrendingUp className="w-4 h-4" />
                                        Evolution
                                    </button>
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
                                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                            <Tooltip cursor={{ fill: "transparent" }} />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Cards" />
                                        </BarChart>
                                    ) : chartView === "MEMBER" ? (
                                        <PieChart>
                                            <Pie
                                                data={data.memberDistribution}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                                label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                                outerRadius={120}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {data.memberDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    ) : (
                                        <AreaChart data={data.timelineData}>
                                            <defs>
                                                <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <XAxis
                                                dataKey="date"
                                                stroke="#888888"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                tickFormatter={(str) => {
                                                    const date = new Date(str);
                                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                                }}
                                            />
                                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                                                labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="created"
                                                stroke="#3b82f6"
                                                fillOpacity={1}
                                                fill="url(#colorCreated)"
                                                name="Created"
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="completed"
                                                stroke="#10b981"
                                                fillOpacity={1}
                                                fill="url(#colorCompleted)"
                                                name="Completed"
                                            />
                                            <Legend verticalAlign="top" height={36} />
                                        </AreaChart>
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
