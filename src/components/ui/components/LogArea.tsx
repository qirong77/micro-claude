import React from "react";
import { Box, Static, Text } from "ink";
import { C } from "../data.js";
import { writeFileSync } from "node:fs";

type Entry = { id: string; text: string };

/** Check if a log entry is a user message (starts with "> ") */
function isUserMessage(text: string): boolean {
    return text.startsWith("> ");
}

const LogEntry = ({ entry }: { entry: Entry }) => {
    if (isUserMessage(entry.text)) {
        // User message — show with background highlight + left indicator
        const content = entry.text.slice(2); // remove "> " prefix
        return (
            <Box key={entry.id} paddingX={1} paddingY={1} flexDirection="row">
                <Text color={C.primary}>▌</Text>
                <Box flexGrow={1} paddingLeft={1} paddingRight={1}>
                    <Text bold color={C.primary}>
                        {content}
                    </Text>
                </Box>
            </Box>
        );
    }
    if (entry.text.length === 0) return null;
    return (
        <Box key={entry.id} paddingX={1}>
            <Text>{entry.text}</Text>
        </Box>
    );
};

export const LogArea = ({ entries }: { entries: Entry[] }): React.ReactNode => {
    if (entries.length === 0) return null;

    // Split entries: all but the last go into <Static> (permanent output),
    // the last one uses dynamic rendering so streaming/updating works.
    const historyEntries = entries.slice(0, -1);
    const lastEntry = entries[entries.length - 1];
    const textWithSplitWithId = entries[0].text.split("\n").map((line, index) => ({ id: `${entries[0].id}-${index}`, text: line }));
    return (
        <>
            <Static items={textWithSplitWithId}>
                {(entry) => <LogEntry key={entry.id} entry={entry} />}
            </Static>
            {/* <LogEntry entry={lastEntry} /> */}
        </>
    );
};
