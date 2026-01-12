import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { fr } from "date-fns/locale";

interface DueDatePickerProps {
    selected?: Date;
    onSelect: (date: Date | undefined) => void;
}

export function DueDatePicker({ selected, onSelect }: DueDatePickerProps) {
    return (
        <div className="p-3 bg-white rounded-lg shadow border">
            <DayPicker
                mode="single"
                selected={selected}
                onSelect={onSelect}
                locale={fr}
                classNames={{
                    today: "font-bold text-blue-600",
                    selected: "bg-blue-600 text-white rounded-full hover:bg-blue-700",
                }}
            />
        </div>
    );
}
