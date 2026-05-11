import React from "react";
import { Box, Text } from "ink";
import { C } from "../data.js";

/** Check if a log entry is a user message (starts with "> ") */
function isUserMessage(text: string): boolean {
    return text.startsWith("> ");
}

export const LogArea = ({ entries }: { entries: Array<{ id: string; text: string }> }): React.ReactNode => {
      if (entries.length === 0) return null;
    return (
    <Box flexDirection="column" flexGrow={1}>
            {entries.map((e) => {
                if (isUserMessage(e.text)) {
                    // User message — show with background highlight + left indicator
                    const content = e.text.slice(2); // remove "> " prefix
                    return (
                        <Box key={e.id} paddingX={1} paddingY={1} flexDirection="row">
                            <Text color={C.primary}>▌</Text>
                            <Box flexGrow={1} paddingLeft={1} paddingRight={1}>
                                <Text bold color={C.primary}>
                                    {content}
                                </Text>
                            </Box>
                        </Box>
                    );
                }
                if (e.text.length === 0) return null;
                return (
                    <Box key={e.id} paddingX={1}>
                        <Text>{e.text}</Text>
                    </Box>
                );
            })}
        </Box>
    );
};
