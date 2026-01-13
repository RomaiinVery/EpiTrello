import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { fr } from "date-fns/locale";

interface DatePickerProps {
    selected?: Date;
    onSelect: (date: Date | undefined) => void;
    minDate?: Date;
    maxDate?: Date;
}

export function DatePicker({ selected, onSelect, minDate, maxDate }: DatePickerProps) {
    const disabledDays = [
        ...(minDate ? [{ before: minDate }] : []),
        ...(maxDate ? [{ after: maxDate }] : []),
    ];

    return (
        <div className="p-3 bg-white rounded-lg shadow border">
            <DayPicker
                mode="single"
                selected={selected}
                onSelect={onSelect}
                locale={fr}
                disabled={disabledDays}
                classNames={{
                    today: "font-bold text-blue-600",
                    selected: "bg-blue-600 text-white rounded-full hover:bg-blue-700",
                }}
            />
        </div>
    );
}
