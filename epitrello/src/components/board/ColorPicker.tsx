"use client";

import { Check } from "lucide-react";

export const PASTEL_COLORS = [
    { name: "Blanc", value: "#F5F5F5" }, // White Smoke - Default
    { name: "Rouge", value: "#FFB7B2" }, // Pastel Red
    { name: "Orange", value: "#FFDAC1" }, // Pastel Orange
    { name: "Vert", value: "#E2F0CB" }, // Pastel Green
    { name: "Menthe", value: "#B5EAD7" }, // Pastel Mint
    { name: "Violet", value: "#C7CEEA" }, // Pastel Purple
    { name: "Bleu", value: "#F0F8FF" }, // Alice Blue
];

interface ColorPickerProps {
    selectedColor: string;
    onChange: (color: string) => void;
}

export function ColorPicker({ selectedColor, onChange }: ColorPickerProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {PASTEL_COLORS.map((color) => (
                <button
                    key={color.value}
                    type="button"
                    onClick={() => onChange(color.value)}
                    className={`w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 ${selectedColor === color.value ? "ring-2 ring-offset-1 ring-blue-500 scale-110" : ""
                        }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                >
                    {selectedColor === color.value && <Check size={14} className="text-gray-700" />}
                </button>
            ))}
        </div>
    );
}
