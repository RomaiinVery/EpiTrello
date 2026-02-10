"use client";

import { Members } from "../lib/board-api";
import Image from "next/image";
import { useState } from "react";

export function MemberAvatar({ member }: { member: Members }) {
    const [imageError, setImageError] = useState(false);
    const showFallback = !member.user.profileImage || imageError;

    return (
        <div
            title={member.user.name || member.user.email}
            className="h-8 w-8 rounded-full bg-muted border-2 border-background overflow-hidden flex-shrink-0"
        >
            {!showFallback ? (
                <Image
                    src={member.user.profileImage!}
                    alt={member.user.name || ""}
                    width={32}
                    height={32}
                    unoptimized
                    onError={() => setImageError(true)}
                    className="h-full w-full object-cover"
                />
            ) : (
                <span className="flex items-center justify-center h-full w-full text-xs font-bold text-muted-foreground bg-muted">
                    {(member.user.name || member.user.email)[0].toUpperCase()}
                </span>
            )}
        </div>
    );
}