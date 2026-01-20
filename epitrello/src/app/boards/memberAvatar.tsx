import { Members } from "../lib/board-api";

export function MemberAvatar({ member }: { member: Members }) {
    return (
        <div title={member.user.name || member.user.email} className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white overflow-hidden">
            {member.user.profileImage ? (
                <img src={member.user.profileImage} alt={member.user.name || ""} />
            ) : (
                <span className="flex items-center justify-center h-full w-full text-xs font-bold text-gray-600">
                    {(member.user.name || member.user.email)[0].toUpperCase()}
                </span>
            )}
        </div>
    );
}