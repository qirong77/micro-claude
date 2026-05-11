export abstract class MicaTool {
    name: string;
    description: string;
    input_schema: any;

    constructor(name: string, description: string, input_schema: any) {
        this.name = name;
        this.description = description;
        this.input_schema = input_schema;
    }

    abstract execute(input: Record<string, any>): Promise<string>;
    abstract onToolUseDisplayText(input: Record<string, any>): string;
}
